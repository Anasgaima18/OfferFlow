import { createClient, SupabaseClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { Logger } from '../utils/logger';
import { config } from './env';

/**
 * F3: Service-role admin client (bypasses RLS).
 *
 * We keep this for system operations: leaderboard cross-user reads, OAuth user
 * lookup, signup (no caller user yet), and CRON jobs. EVERY use-case that has
 * a known owning user should prefer `supabaseForUser(userId)` so RLS becomes
 * defence-in-depth on top of controller-level ownership checks.
 */
export const supabaseAdmin: SupabaseClient = createClient(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_KEY,
    {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { headers: { 'X-Client-Info': 'offerflow-server-admin' } },
    }
);

/**
 * F3: Per-user RLS-scoped client.
 *
 * Mints a short-lived Supabase JWT (`sub = userId`, `role = authenticated`)
 * signed with the project JWT secret. RLS policies that use `auth.uid() = user_id`
 * now correctly evaluate as the request user, so a programming error (e.g. a
 * forgotten `.eq('user_id', userId)` in the JS layer) cannot leak cross-user data.
 *
 * Returns admin client (with a one-time warning) when `SUPABASE_JWT_SECRET` is
 * unset, so the app keeps working in environments that haven't been migrated yet.
 */
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
let warnedNoJwtSecret = false;
const TOKEN_TTL_SECONDS = 5 * 60;

export function supabaseForUser(userId: string): SupabaseClient {
    if (!SUPABASE_JWT_SECRET) {
        if (!warnedNoJwtSecret) {
            Logger.warn(
                '[supabase] SUPABASE_JWT_SECRET not set — RLS-scoped clients fall back to admin. ' +
                'Set this from Supabase: Project Settings → API → JWT Secret to enable RLS defence-in-depth.'
            );
            warnedNoJwtSecret = true;
        }
        return supabaseAdmin;
    }

    const now = Math.floor(Date.now() / 1000);
    const accessToken = jwt.sign(
        {
            sub: userId,
            role: 'authenticated',
            aud: 'authenticated',
            iss: 'offerflow-server',
            iat: now,
            exp: now + TOKEN_TTL_SECONDS,
        },
        SUPABASE_JWT_SECRET
    );

    return createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
        global: {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'X-Client-Info': 'offerflow-server-user',
            },
        },
    });
}

Logger.info('[supabase]: clients initialized');
