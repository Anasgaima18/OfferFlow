-- OfferFlow Database Schema for Supabase
-- Run this in the Supabase SQL Editor to create the tables

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password TEXT NOT NULL,
    avatar TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interviews table 
CREATE TABLE IF NOT EXISTS interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('behavioral', 'technical', 'system-design')) NOT NULL,
    status TEXT CHECK (status IN ('pending', 'completed', 'in-progress')) DEFAULT 'pending',
    score INTEGER,
    feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transcript messages table (for interview conversations)
CREATE TABLE IF NOT EXISTS transcript_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('user', 'ai')) NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_interviews_user_id ON interviews(user_id);
CREATE INDEX IF NOT EXISTS idx_interviews_created_at ON interviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transcript_interview_id ON transcript_messages(interview_id);
CREATE INDEX IF NOT EXISTS idx_transcript_timestamp ON transcript_messages(timestamp);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only access their own data)
-- Note: These require auth.uid() which is set by Supabase Auth
-- For service role access, these are bypassed

CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "Users can view own interviews" ON interviews
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create own interviews" ON interviews
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own interviews" ON interviews
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view own transcripts" ON transcript_messages
    FOR SELECT USING (
        interview_id IN (
            SELECT id FROM interviews WHERE user_id::text = auth.uid()::text
        )
    );

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to interviews table
DROP TRIGGER IF EXISTS update_interviews_updated_at ON interviews;
CREATE TRIGGER update_interviews_updated_at
    BEFORE UPDATE ON interviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'OfferFlow schema created successfully!' as message;

-- MIGRATION: If the users table already exists without a password column, run this:
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT NOT NULL DEFAULT '';
