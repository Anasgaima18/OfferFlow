import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';
import { IInterview, CreateInterviewInput, InterviewType, ITranscriptMessage } from '../models/Interview';

export class InterviewService {
    // Get all interviews for a user
    async getAllInterviews(userId: string): Promise<IInterview[]> {
        const { data, error } = await supabaseAdmin
            .from('interviews')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            throw new AppError(error.message, 500);
        }

        return (data || []) as IInterview[];
    }

    // Create a new interview
    async createInterview(input: CreateInterviewInput): Promise<IInterview> {
        const validTypes: InterviewType[] = ['behavioral', 'technical', 'system-design'];

        if (!validTypes.includes(input.type)) {
            throw new AppError('Invalid interview type', 400);
        }

        const { data, error } = await supabaseAdmin
            .from('interviews')
            .insert({
                user_id: input.user_id,
                type: input.type,
                status: 'pending' as const
            })
            .select()
            .single();

        if (error || !data) {
            throw new AppError(error?.message || 'Failed to create interview', 500);
        }

        return data as IInterview;
    }

    // Get single interview by ID
    async getInterviewById(id: string): Promise<IInterview | null> {
        const { data, error } = await supabaseAdmin
            .from('interviews')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return data as IInterview;
    }

    // Update interview
    async updateInterview(id: string, updates: Partial<IInterview>): Promise<IInterview> {
        const updateData: Record<string, unknown> = {};
        if (updates.score !== undefined) updateData.score = updates.score;
        if (updates.feedback !== undefined) updateData.feedback = updates.feedback;
        if (updates.status !== undefined) updateData.status = updates.status;
        updateData.updated_at = new Date().toISOString();

        const { data, error } = await supabaseAdmin
            .from('interviews')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error || !data) {
            throw new AppError(error?.message || 'Failed to update interview', 500);
        }

        return data as IInterview;
    }

    // Add transcript message
    async addTranscriptMessage(interviewId: string, role: 'user' | 'ai', content: string): Promise<ITranscriptMessage> {
        const { data, error } = await supabaseAdmin
            .from('transcript_messages')
            .insert({
                interview_id: interviewId,
                role,
                content
            })
            .select()
            .single();

        if (error || !data) {
            throw new AppError(error?.message || 'Failed to add transcript message', 500);
        }

        return data as ITranscriptMessage;
    }

    // Get transcript for an interview
    async getTranscript(interviewId: string): Promise<ITranscriptMessage[]> {
        const { data, error } = await supabaseAdmin
            .from('transcript_messages')
            .select('*')
            .eq('interview_id', interviewId)
            .order('timestamp', { ascending: true });

        if (error) {
            throw new AppError(error.message, 500);
        }

        return (data || []) as ITranscriptMessage[];
    }

    // Get user stats
    async getUserStats(userId: string): Promise<{
        totalInterviews: number;
        completedInterviews: number;
        averageScore: number;
        rank: number;
    }> {
        const { data: interviews, error } = await supabaseAdmin
            .from('interviews')
            .select('score, status')
            .eq('user_id', userId);

        if (error) {
            throw new AppError(error.message, 500);
        }

        const allInterviews = interviews || [];
        const completed = allInterviews.filter(i => i.status === 'completed');
        const scores = completed.filter(i => i.score !== null).map(i => i.score as number);
        const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

        // Calculate rank by counting distinct users with higher average scores
        // NOTE: Ideally use SQL aggregation (GROUP BY + AVG) via Supabase RPC for production scale
        let rank = 1;
        if (averageScore > 0) {
            const { data: allUserInterviews } = await supabaseAdmin
                .from('interviews')
                .select('user_id, score')
                .eq('status', 'completed')
                .not('score', 'is', null)
                .limit(5000);

            if (allUserInterviews && allUserInterviews.length > 0) {
                // Group by user and compute average scores
                const userScores = new Map<string, number[]>();
                for (const row of allUserInterviews) {
                    if (!userScores.has(row.user_id)) userScores.set(row.user_id, []);
                    userScores.get(row.user_id)!.push(row.score as number);
                }
                // Count users with a strictly higher average
                let usersAbove = 0;
                for (const [uid, scoreList] of userScores) {
                    if (uid === userId) continue;
                    const avg = scoreList.reduce((a, b) => a + b, 0) / scoreList.length;
                    if (avg > averageScore) usersAbove++;
                }
                rank = usersAbove + 1;
            }
        }

        return {
            totalInterviews: allInterviews.length,
            completedInterviews: completed.length,
            averageScore,
            rank
        };
    }

    // Get leaderboard
    async getLeaderboard(limit: number = 10): Promise<Array<{
        rank: number;
        name: string;
        avatar: string | null;
        totalInterviews: number;
        averageScore: number;
    }>> {
        // Get all completed interviews with user info
        // NOTE: Ideally use SQL aggregation via Supabase RPC for production scale
        const { data, error } = await supabaseAdmin
            .from('interviews')
            .select('user_id, score, users!inner(name, avatar)')
            .eq('status', 'completed')
            .not('score', 'is', null)
            .limit(5000);

        if (error) {
            throw new AppError(error.message, 500);
        }

        // Aggregate by user
        const userMap = new Map<string, { name: string; avatar: string | null; scores: number[]; count: number }>();
        for (const row of (data || [])) {
            const userId = row.user_id;
            const userInfo = row.users as unknown as { name: string; avatar: string | null };
            if (!userMap.has(userId)) {
                userMap.set(userId, { name: userInfo.name, avatar: userInfo.avatar, scores: [], count: 0 });
            }
            const entry = userMap.get(userId)!;
            if (row.score !== null) entry.scores.push(row.score);
            entry.count++;
        }

        // Sort by average score
        const leaderboard = Array.from(userMap.entries())
            .map(([_userId, data]) => ({
                name: data.name,
                avatar: data.avatar,
                totalInterviews: data.count,
                averageScore: data.scores.length > 0 ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length) : 0,
            }))
            .sort((a, b) => b.averageScore - a.averageScore)
            .slice(0, limit)
            .map((entry, index) => ({ ...entry, rank: index + 1 }));

        return leaderboard;
    }
}

export const interviewService = new InterviewService();
