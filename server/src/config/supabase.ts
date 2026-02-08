import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '../utils/logger';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
    const missing = [];
    if (!supabaseUrl) missing.push('SUPABASE_URL');
    if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_KEY');
    if (!supabaseAnonKey) missing.push('SUPABASE_ANON_KEY');
    throw new Error(`[supabase]: Missing required environment variables: ${missing.join(', ')}`);
}

// Server-side client with service role key (bypasses RLS)
export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Client for user-context operations (respects RLS)
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

Logger.info('[supabase]: Supabase client initialized');
