import { AppError } from '../utils/appError';
import { IInterview, CreateInterviewInput, InterviewType, ITranscriptMessage } from '../models/Interview';
import { InterviewRepository } from '../repositories/InterviewRepository';

export class InterviewService {
    constructor(private readonly interviewRepository: InterviewRepository) {}

    // Get all interviews for a user
    async getAllInterviews(userId: string): Promise<IInterview[]> {
        return await this.interviewRepository.findAllByUserId(userId);
    }

    // Create a new interview
    async createInterview(input: CreateInterviewInput): Promise<IInterview> {
        const validTypes: InterviewType[] = ['behavioral', 'technical', 'system-design'];

        if (!validTypes.includes(input.type)) {
            throw new AppError('Invalid interview type', 400);
        }

        return await this.interviewRepository.create(input);
    }

    // Get single interview by ID
    async getInterviewById(id: string): Promise<IInterview | null> {
        return await this.interviewRepository.findById(id);
    }

    // Update interview
    async updateInterview(id: string, updates: Partial<IInterview>): Promise<IInterview> {
        const updateData: Record<string, unknown> = {};
        if (updates.score !== undefined) updateData.score = updates.score;
        if (updates.feedback !== undefined) updateData.feedback = updates.feedback;
        if (updates.status !== undefined) updateData.status = updates.status;
        updateData.updated_at = new Date().toISOString();

        return await this.interviewRepository.update(id, updateData);
    }

    // Add transcript message
    async addTranscriptMessage(interviewId: string, role: 'user' | 'ai', content: string): Promise<ITranscriptMessage> {
        return await this.interviewRepository.addTranscriptMessage(interviewId, role, content);
    }

    // Get transcript for an interview
    async getTranscript(interviewId: string): Promise<ITranscriptMessage[]> {
        return await this.interviewRepository.getTranscript(interviewId);
    }

    // Get user stats
    async getUserStats(userId: string): Promise<{
        totalInterviews: number;
        completedInterviews: number;
        averageScore: number;
        rank: number;
    }> {
        const allInterviews = await this.interviewRepository.getUserStats(userId);
        
        const completed = allInterviews.filter(i => i.status === 'completed');
        const scores = completed.filter(i => i.score !== null).map(i => i.score as number);
        const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

        let rank = 1;
        if (averageScore > 0) {
            const leaderboard = await this.getLeaderboard(5000);
            for (const entry of leaderboard) {
                if (entry.averageScore > averageScore) {
                    rank++;
                }
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
    async getLeaderboard(limit: number = 10) {
        const fullLeaderboard = await this.interviewRepository.getLeaderboard();
        
        const userMap = new Map<string, { name: string; avatar: string | null; scores: number[]; count: number }>();
        for (const row of fullLeaderboard) {
            const userId = row.user_id;
            const userInfo = Array.isArray(row.users) ? row.users[0] : row.users;
            
            if (!userMap.has(userId)) {
                userMap.set(userId, { name: userInfo?.name || 'Unknown', avatar: userInfo?.avatar_url || null, scores: [], count: 0 });
            }
            const entry = userMap.get(userId)!;
            
            if (row.score !== null) {
                entry.scores.push(row.score);
                entry.count++;
            }
        }

        const leaderboard = Array.from(userMap.entries())
            .filter(([_k, data]) => data.count > 0)
            .map(([_userId, data]) => ({
                name: data.name,
                avatar: data.avatar,
                totalInterviews: data.count,
                averageScore: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.count),
            }))
            .sort((a, b) => b.averageScore - a.averageScore)
            .slice(0, limit)
            .map((entry, index) => ({ ...entry, rank: index + 1 }));

        return leaderboard;
    }
}
