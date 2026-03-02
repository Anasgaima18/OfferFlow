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
            .from('transcripts')
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
            .from('transcripts')
            .select('*')
            .eq('interview_id', interviewId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data as ITranscriptMessage[];
    }

    async getUserStats(userId: string) {
        const { data, error } = await supabaseAdmin
            .from('interviews')
            .select('score, status')
            .eq('user_id', userId);

        if (error) throw error;
        return data || [];
    }

    async getLeaderboard(limit: number = 10): Promise<Array<{
        user_id: string;
        score: number | null;
        users: { name: string; avatar_url: string | null } | { name: string; avatar_url: string | null }[];
    }>> {
        // Query users with their total completed interviews and average score
        const { data, error } = await supabaseAdmin
            .from('interviews')
            .select(`
                user_id,
                score,
                users!inner(name, avatar_url)
            `)
            .eq('status', 'completed')
            .not('score', 'is', null)
            .limit(5000);

        if (error) throw error;
        return data as any;
    }
}
