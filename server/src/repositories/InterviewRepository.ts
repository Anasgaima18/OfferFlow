import { supabaseAdmin } from '../config/supabase';
import { IInterview, CreateInterviewInput, ITranscriptMessage } from '../models/Interview';

export class InterviewRepository {
    async findAllByUserId(userId: string): Promise<IInterview[]> {
        const { data, error } = await supabaseAdmin
            .from('interviews')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as IInterview[];
    }

    async create(input: CreateInterviewInput): Promise<IInterview> {
        const { data, error } = await supabaseAdmin
            .from('interviews')
            .insert([{
                user_id: input.user_id,
                type: input.type,
                status: 'in-progress'
            }])
            .select()
            .single();

        if (error) throw error;
        return data as IInterview;
    }

    async findById(id: string): Promise<IInterview | null> {
        const { data, error } = await supabaseAdmin
            .from('interviews')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return data as IInterview;
    }

    async update(id: string, updates: Partial<IInterview>): Promise<IInterview> {
        const { data, error } = await supabaseAdmin
            .from('interviews')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as IInterview;
    }

    async addTranscriptMessage(interviewId: string, role: 'user' | 'ai', content: string): Promise<ITranscriptMessage> {
        const { data, error } = await supabaseAdmin
            .from('transcript_messages')
            .insert([{
                interview_id: interviewId,
                role,
                content
            }])
            .select()
            .single();

        if (error) throw error;
        return data as ITranscriptMessage;
    }

    async getTranscript(interviewId: string): Promise<ITranscriptMessage[]> {
        const { data, error } = await supabaseAdmin
            .from('transcript_messages')
            .select('*')
            .eq('interview_id', interviewId)
            .order('timestamp', { ascending: true });

        if (error) throw error;
        return data as ITranscriptMessage[];
    }

    async getUserStats(userId: string) {
        const { data, error } = await supabaseAdmin
            .from('interviews')
            .select('score, status, type')
            .eq('user_id', userId);

        if (error) throw error;
        return data || [];
    }

    async getLeaderboard(limit: number = 10): Promise<Array<{
        user_id: string;
        rank?: number;
        score: number | null;
        users?: { name: string; avatar_url: string | null } | { name: string; avatar_url: string | null }[];
        name?: string;
        avatar?: string | null;
        total_interviews?: number;
        average_score?: number;
    }>> {
        const viewResult = await supabaseAdmin
            .from('leaderboard_summary')
            .select('rank, user_id, name, avatar, total_interviews, average_score')
            .limit(limit);

        if (!viewResult.error) {
            return (viewResult.data || []).map((row: any) => ({
                user_id: row.user_id,
                rank: row.rank,
                score: row.average_score,
                name: row.name,
                avatar: row.avatar,
                total_interviews: row.total_interviews,
                average_score: row.average_score,
            }));
        }

        const { data, error } = await supabaseAdmin
            .from('interviews')
            .select(`
                user_id,
                score,
                users!inner(name, avatar)
            `)
            .eq('status', 'completed')
            .not('score', 'is', null)
            .limit(5000);

        if (error) throw error;
        return data as any;
    }

    async getUserRank(userId: string): Promise<number | null> {
        const { data, error } = await supabaseAdmin.rpc('get_user_rank', {
            target_user_id: userId,
        });

        if (!error) {
            return typeof data === 'number' ? data : null;
        }

        return null;
    }
}
