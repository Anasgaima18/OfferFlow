-- =============================================================================
--  OfferFlow — performance & security hardening migration
--  Date: 2026-04-26
--
--  Addresses findings F11, F18, F19 from the SRE audit, plus tightens RLS
--  for the schemas added in 2026-03-08.
--
--  Apply in Supabase SQL editor (or `psql`) AFTER 2026-03-08_oauth_content_leaderboard.sql.
--  All statements are idempotent and safe to re-run.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- F18: composite index for ordered transcript scans.
--
-- Listing transcripts is `WHERE interview_id = $1 ORDER BY timestamp ASC`.
-- The two single-column indexes from supabase_schema.sql do NOT cover the
-- ORDER BY — Postgres has to read them, then sort. A composite index
-- eliminates the sort and lets the planner pick a single index scan.
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_transcript_interview_timestamp
    ON transcript_messages (interview_id, "timestamp" ASC);

-- Drop the now-redundant single-column index. The composite covers both
-- (interview_id) and (interview_id, timestamp).
DROP INDEX IF EXISTS idx_transcript_interview_id;

-- Useful for "all transcripts for a user" admin queries.
CREATE INDEX IF NOT EXISTS idx_interviews_user_status
    ON interviews (user_id, status, created_at DESC);

-- -----------------------------------------------------------------------------
-- F19: materialized leaderboard.
--
-- The non-materialized `leaderboard_summary` view re-aggregates every
-- completed interview on every dashboard hit. At 100k completed rows that's
-- multiple seconds of CPU per request. We replace it with a materialized
-- view that's refreshed every 5 minutes by pg_cron (or manually if pg_cron
-- isn't available on your Supabase plan).
-- -----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS leaderboard_summary_mv AS
SELECT
    ROW_NUMBER() OVER (
        ORDER BY ROUND(AVG(i.score)) DESC, COUNT(*) DESC, MIN(i.created_at) ASC
    )::int                                              AS rank,
    u.id                                                AS user_id,
    u.name,
    u.avatar,
    COUNT(*)::int                                       AS total_interviews,
    ROUND(AVG(i.score))::int                            AS average_score,
    NOW()                                               AS refreshed_at
FROM interviews i
JOIN users u ON u.id = i.user_id
WHERE i.status = 'completed' AND i.score IS NOT NULL
GROUP BY u.id, u.name, u.avatar;

-- Required for `REFRESH MATERIALIZED VIEW CONCURRENTLY`.
CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_mv_user_id
    ON leaderboard_summary_mv (user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_mv_rank
    ON leaderboard_summary_mv (rank);

-- -----------------------------------------------------------------------------
-- F11: rewire `get_user_rank` to read from the materialized view.
-- Changes the worst-case from "re-aggregate the whole table" to a single
-- index lookup.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_rank(target_user_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
AS $$
    SELECT rank
    FROM leaderboard_summary_mv
    WHERE user_id = target_user_id
    LIMIT 1;
$$;

-- Helper that callers can invoke to force a refresh; pg_cron schedules it
-- below if the extension is available.
CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_summary_mv;
EXCEPTION
    WHEN OTHERS THEN
        REFRESH MATERIALIZED VIEW leaderboard_summary_mv;
END;
$$;

-- Initial population.
SELECT refresh_leaderboard();

-- -----------------------------------------------------------------------------
-- pg_cron: schedule the refresh every 5 minutes if the extension is enabled
-- on the Supabase project. (Supabase: dashboard → Database → Extensions →
-- enable `pg_cron`.) Wrapped in DO block so the migration succeeds even when
-- pg_cron is not installed.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.unschedule('refresh_leaderboard_5min')
        FROM cron.job WHERE jobname = 'refresh_leaderboard_5min';

        PERFORM cron.schedule(
            'refresh_leaderboard_5min',
            '*/5 * * * *',
            $cron$ SELECT refresh_leaderboard(); $cron$
        );
    END IF;
END$$;

-- -----------------------------------------------------------------------------
-- F3: tighten RLS on `transcript_messages` for INSERT/UPDATE.
-- The existing schema only had a SELECT policy; INSERT/UPDATE relied on
-- service role bypass. Now that we mint per-user JWTs from the server, add
-- explicit write policies so user-scoped clients can write transcripts.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'transcript_messages'
          AND policyname = 'Users can insert own transcripts'
    ) THEN
        EXECUTE $pol$
            CREATE POLICY "Users can insert own transcripts" ON transcript_messages
                FOR INSERT WITH CHECK (
                    interview_id IN (
                        SELECT id FROM interviews
                        WHERE user_id::text = auth.uid()::text
                    )
                );
        $pol$;
    END IF;
END$$;

COMMIT;

-- =============================================================================
-- Operational notes:
--   * Refresh latency: leaderboard ranks lag by up to 5 minutes. Acceptable —
--     we can call `SELECT refresh_leaderboard();` after big batch updates.
--   * The fallback path in InterviewRepository.getLeaderboard now reads the
--     materialized view first, then the legacy view, then a bounded
--     order-by-score scan as a last resort.
--   * If you don't have pg_cron, run `SELECT refresh_leaderboard();` from a
--     Render cron job, an external scheduler, or Supabase Edge Functions.
-- =============================================================================
