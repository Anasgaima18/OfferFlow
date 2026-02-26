import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '../utils/logger';
import { env } from './env';

// Server-side client with service role key (bypasses RLS)
export const supabaseAdmin: SupabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Client for user-context operations (respects RLS)
export const supabase: SupabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

Logger.info('[supabase]: Supabase client initialized');
