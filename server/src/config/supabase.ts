import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '../utils/logger';
import { config } from './env';

// Server-side client with service role key (bypasses RLS)
export const supabaseAdmin: SupabaseClient = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

Logger.info('[supabase]: Supabase client initialized');
