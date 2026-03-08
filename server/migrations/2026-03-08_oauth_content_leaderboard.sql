ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'local';
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_id TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_auth_provider_check'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT users_auth_provider_check
            CHECK (auth_provider IN ('local', 'google', 'github'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_interviews_completed_score
    ON interviews(status, score DESC)
    WHERE status = 'completed' AND score IS NOT NULL;

CREATE OR REPLACE VIEW leaderboard_summary AS
SELECT
    ROW_NUMBER() OVER (ORDER BY ROUND(AVG(i.score)) DESC, COUNT(*) DESC, MIN(i.created_at) ASC) AS rank,
    u.id AS user_id,
    u.name,
    u.avatar,
    COUNT(*)::int AS total_interviews,
    ROUND(AVG(i.score))::int AS average_score
FROM interviews i
JOIN users u ON u.id = i.user_id
WHERE i.status = 'completed' AND i.score IS NOT NULL
GROUP BY u.id, u.name, u.avatar;

CREATE OR REPLACE FUNCTION get_user_rank(target_user_id UUID)
RETURNS INT
LANGUAGE sql
AS $$
    SELECT rank FROM leaderboard_summary WHERE user_id = target_user_id LIMIT 1;
$$;