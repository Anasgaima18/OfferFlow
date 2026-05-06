-- =============================================================================
-- OfferFlow — Supabase security + RLS performance hardening
-- Date: 2026-05-06
-- Applied remotely via Supabase MCP migration:
--   supabase_security_and_rls_perf_hardening_20260506
-- =============================================================================

BEGIN;

ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'transcripts' AND policyname = 'Users can view own transcripts_legacy'
    ) THEN
        EXECUTE $pol$
            CREATE POLICY "Users can view own transcripts_legacy" ON public.transcripts
            FOR SELECT USING (
                interview_id IN (
                    SELECT id FROM public.interviews
                    WHERE user_id::text = (SELECT auth.uid())::text
                )
            );
        $pol$;
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'transcripts' AND policyname = 'Users can insert own transcripts_legacy'
    ) THEN
        EXECUTE $pol$
            CREATE POLICY "Users can insert own transcripts_legacy" ON public.transcripts
            FOR INSERT WITH CHECK (
                interview_id IN (
                    SELECT id FROM public.interviews
                    WHERE user_id::text = (SELECT auth.uid())::text
                )
            );
        $pol$;
    END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_transcripts_interview_id ON public.transcripts (interview_id);

DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING ((SELECT auth.uid())::text = id::text);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING ((SELECT auth.uid())::text = id::text);

DROP POLICY IF EXISTS "Users can view own interviews" ON public.interviews;
CREATE POLICY "Users can view own interviews" ON public.interviews
    FOR SELECT USING ((SELECT auth.uid())::text = user_id::text);

DROP POLICY IF EXISTS "Users can create own interviews" ON public.interviews;
CREATE POLICY "Users can create own interviews" ON public.interviews
    FOR INSERT WITH CHECK ((SELECT auth.uid())::text = user_id::text);

DROP POLICY IF EXISTS "Users can update own interviews" ON public.interviews;
CREATE POLICY "Users can update own interviews" ON public.interviews
    FOR UPDATE USING ((SELECT auth.uid())::text = user_id::text);

DROP POLICY IF EXISTS "Users can view own transcripts" ON public.transcript_messages;
CREATE POLICY "Users can view own transcripts" ON public.transcript_messages
    FOR SELECT USING (
        interview_id IN (
            SELECT id FROM public.interviews
            WHERE user_id::text = (SELECT auth.uid())::text
        )
    );

DROP POLICY IF EXISTS "Users can insert own transcripts" ON public.transcript_messages;
CREATE POLICY "Users can insert own transcripts" ON public.transcript_messages
    FOR INSERT WITH CHECK (
        interview_id IN (
            SELECT id FROM public.interviews
            WHERE user_id::text = (SELECT auth.uid())::text
        )
    );

COMMIT;
