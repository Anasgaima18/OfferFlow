import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin, supabaseForUser } from '../config/supabase';
import { IInterview, CreateInterviewInput, ITranscriptMessage } from '../models/Interview';
import { supabaseQueryDuration, supabaseQueryErrors } from '../observability/metrics';
import { Logger } from '../utils/logger';

/**
 * F3 + Phase 5 instrumentation:
 * - Methods that have a known owning userId use `supabaseForUser(userId)` so
 *   RLS is enforced (defence-in-depth on top of the controller-level ownership
 *   check).
 * - Cross-user system reads (leaderboard, getUserRank RPC) keep using
 *   `supabaseAdmin` — they're explicitly cross-user.
 * - Every PostgREST round-trip is timed and error-counted for /metrics.
 */
async function timed<T>(op: string, table: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
        return await fn();
    } catch (err) {
        const code = (err as { code?: string }).code ?? 'unknown';
        supabaseQueryErrors.inc({ op, table, code });
        throw err;
    } finally {
        supabaseQueryDuration.observe({ op, table }, Date.now() - start);
    }
}

function clientFor(userId?: string): SupabaseClient {
    return userId ? supabaseForUser(userId) : supabaseAdmin;
}

export class InterviewRepository {
    async findAllByUserId(userId: string): Promise<IInterview[]> {
        return timed('select', 'interviews', async () => {
            const { data, error } = await clientFor(userId)
                .from('interviews')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as IInterview[];
        });
    }

    async create(input: CreateInterviewInput): Promise<IInterview> {
        return timed('insert', 'interviews', async () => {
            const { data, error } = await clientFor(input.user_id)
                .from('interviews')
                .insert([{
                    user_id: input.user_id,
                    type: input.type,
                    status: 'in-progress',
                }])
                .select()
                .single();

            if (error) throw error;
            return data as IInterview;
        });
    }

    async findById(id: string, ownerUserId?: string): Promise<IInterview | null> {
        return timed('select_one', 'interviews', async () => {
            const { data, error } = await clientFor(ownerUserId)
                .from('interviews')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                if (error.code === 'PGRST116') return null;
                throw error;
            }
            return data as IInterview;
        });
    }

    async update(id: string, updates: Partial<IInterview>, ownerUserId?: string): Promise<IInterview> {
        return timed('update', 'interviews', async () => {
            const { data, error } = await clientFor(ownerUserId)
                .from('interviews')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data as IInterview;
        });
    }

    async addTranscriptMessage(
        interviewId: string,
        role: 'user' | 'ai',
        content: string,
        ownerUserId?: string,
    ): Promise<ITranscriptMessage> {
        return timed('insert', 'transcript_messages', async () => {
            const { data, error } = await clientFor(ownerUserId)
                .from('transcript_messages')
                .insert([{
                    interview_id: interviewId,
                    role,
                    content,
                }])
                .select()
                .single();

            if (error) throw error;
            return data as ITranscriptMessage;
        });
    }

    async getTranscript(interviewId: string, ownerUserId?: string): Promise<ITranscriptMessage[]> {
        return timed('select', 'transcript_messages', async () => {
            const { data, error } = await clientFor(ownerUserId)
                .from('transcript_messages')
                .select('*')
                .eq('interview_id', interviewId)
                .order('timestamp', { ascending: true });

            if (error) throw error;
            return data as ITranscriptMessage[];
        });
    }

    async getUserStats(userId: string) {
        return timed('select', 'interviews:stats', async () => {
            const { data, error } = await clientFor(userId)
                .from('interviews')
                .select('score, status, type')
                .eq('user_id', userId);

            if (error) throw error;
            return data || [];
        });
    }

    /**
     * F11 + F19: Leaderboard now reads from the materialized `leaderboard_summary_mv`
     * (refreshed every 5 minutes by pg_cron). The `LIMIT 5000` join-scan fallback
     * has been replaced with a much smaller, ordered-by-score scan that still
     * works while the migration is being applied. We push the limit into the
     * query so we never accidentally pull 5k rows.
     */
    async getLeaderboard(limit: number = 10): Promise<Array<{
        user_id: string;
        rank?: number;
        score: number | null;
        users?:
            | { name: string; avatar: string | null; avatar_url?: string | null }
            | { name: string; avatar: string | null; avatar_url?: string | null }[];
        name?: string;
        avatar?: string | null;
        total_interviews?: number;
        average_score?: number;
    }>> {
        const safeLimit = Math.min(Math.max(1, limit), 100);

        const mv = await timed('select', 'leaderboard_summary_mv', async () =>
            supabaseAdmin
                .from('leaderboard_summary_mv')
                .select('rank, user_id, name, avatar, total_interviews, average_score')
                .order('rank', { ascending: true })
                .limit(safeLimit)
        );
        if (!mv.error && mv.data && mv.data.length > 0) {
            return mv.data.map((row: any) => ({
                user_id: row.user_id,
                rank: row.rank,
                score: row.average_score,
                name: row.name,
                avatar: row.avatar,
                total_interviews: row.total_interviews,
                average_score: row.average_score,
            }));
        }

        const view = await timed('select', 'leaderboard_summary', async () =>
            supabaseAdmin
                .from('leaderboard_summary')
                .select('rank, user_id, name, avatar, total_interviews, average_score')
                .order('rank', { ascending: true })
                .limit(safeLimit)
        );
        if (!view.error && view.data) {
            return view.data.map((row: any) => ({
                user_id: row.user_id,
                rank: row.rank,
                score: row.average_score,
                name: row.name,
                avatar: row.avatar,
                total_interviews: row.total_interviews,
                average_score: row.average_score,
            }));
        }

        Logger.warn('[leaderboard] both MV and view failed; using bounded fallback');
        const fallbackLimit = Math.min(safeLimit * 4, 200);
        const { data, error } = await timed('select_fallback', 'interviews', async () =>
            supabaseAdmin
                .from('interviews')
                .select(`user_id, score, users!inner(name, avatar)`)
                .eq('status', 'completed')
                .not('score', 'is', null)
                .order('score', { ascending: false })
                .limit(fallbackLimit)
        );

        if (error) throw error;
        return data as any;
    }

    async getUserRank(userId: string): Promise<number | null> {
        return timed('rpc', 'get_user_rank', async () => {
            const { data, error } = await supabaseAdmin.rpc('get_user_rank', {
                target_user_id: userId,
            });
            if (!error) return typeof data === 'number' ? data : null;
            return null;
        });
    }
}
