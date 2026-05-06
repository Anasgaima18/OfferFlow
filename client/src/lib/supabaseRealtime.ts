import { createClient, SupabaseClient } from '@supabase/supabase-js';
import env from '../config/env';
import { auth } from '../services/api';

let realtimeClient: SupabaseClient | null = null;
let tokenExpiryEpochMs = 0;

const ensureClient = (): SupabaseClient => {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase client configuration');
  }
  if (!realtimeClient) {
    realtimeClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return realtimeClient;
};

export const getRealtimeClient = async (): Promise<SupabaseClient> => {
  const client = ensureClient();
  const now = Date.now();
  if (now >= tokenExpiryEpochMs - 30_000) {
    const { data } = await auth.getSupabaseToken();
    tokenExpiryEpochMs = now + data.data.expiresIn * 1000;
    client.realtime.setAuth(data.data.token);
  }
  return client;
};
