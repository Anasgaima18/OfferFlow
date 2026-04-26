import { AppError } from '../utils/appError';
import newrelic from 'newrelic';
import { IInterview, CreateInterviewInput, InterviewType, ITranscriptMessage } from '../models/Interview';
import { InterviewRepository } from '../repositories/InterviewRepository';

export class InterviewService {
    constructor(private readonly interviewRepository: InterviewRepository) {}

    // Get all interviews for a user
    async getAllInterviews(userId: string): Promise<IInterview[]> {
        return await newrelic.startSegment('InterviewService/getAllInterviews', true, async () => {
            return this.interviewRepository.findAllByUserId(userId);
        });
    }

    // Create a new interview
    async createInterview(input: CreateInterviewInput): Promise<IInterview> {
        const validTypes: InterviewType[] = ['behavioral', 'technical', 'system-design'];

        if (!validTypes.includes(input.type)) {
            throw new AppError('Invalid interview type', 400);
        }

        const interview = await newrelic.startSegment('InterviewService/createInterview', true, async () => {
            return this.interviewRepository.create(input);
        });

        newrelic.recordCustomEvent('InterviewCreated', {
            interviewId: interview.id,
            userId: input.user_id,
            type: input.type,
            status: interview.status,
        });

        return interview;
    }

    // Get single interview by ID. `requestingUserId` enables RLS-scoped reads (F3).
    async getInterviewById(id: string, requestingUserId?: string): Promise<IInterview | null> {
        return await this.interviewRepository.findById(id, requestingUserId);
    }

    // Update interview. `requestingUserId` enables RLS-scoped writes (F3).
    async updateInterview(id: string, updates: Partial<IInterview>, requestingUserId?: string): Promise<IInterview> {
        const updateData: Record<string, unknown> = {};
        if (updates.score !== undefined) updateData.score = updates.score;
        if (updates.feedback !== undefined) updateData.feedback = updates.feedback;
        if (updates.status !== undefined) updateData.status = updates.status;
        updateData.updated_at = new Date().toISOString();

        const interview = await newrelic.startSegment('InterviewService/updateInterview', true, async () => {
            return this.interviewRepository.update(id, updateData, requestingUserId);
        });
        const feedbackText = updates.feedback ?? interview.feedback;

        newrelic.recordCustomEvent('InterviewUpdated', {
            interviewId: id,
            status: updates.status ?? interview.status,
            score: updates.score ?? interview.score ?? 0,
            hasFeedback: typeof feedbackText === 'string' && feedbackText.length > 0,
        });

        return interview;
    }

    // Add transcript message. `requestingUserId` enables RLS-scoped writes (F3).
    async addTranscriptMessage(
        interviewId: string,
        role: 'user' | 'ai',
        content: string,
        requestingUserId?: string,
    ): Promise<ITranscriptMessage> {
        const message = await this.interviewRepository.addTranscriptMessage(
            interviewId,
            role,
            content,
            requestingUserId,
        );

        newrelic.recordCustomEvent('InterviewTranscriptMessage', {
            interviewId,
            role,
            contentLength: content.length,
        });

        return message;
    }

    // Get transcript for an interview
    async getTranscript(interviewId: string, requestingUserId?: string): Promise<ITranscriptMessage[]> {
        return await this.interviewRepository.getTranscript(interviewId, requestingUserId);
    }

    // Get user stats
    async getUserStats(userId: string): Promise<{
        totalInterviews: number;
        completedInterviews: number;
        averageScore: number;
        highestScore: number;
        rank: number;
        totalBehavioral: number;
        totalTechnical: number;
        totalSystemDesign: number;
        interviewsByType: Record<string, number>;
    }> {
        const allInterviews = await this.interviewRepository.getUserStats(userId);
        
        const completed = allInterviews.filter(i => i.status === 'completed');
        const scores = completed.filter(i => i.score !== null).map(i => i.score as number);
        const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
        const interviewsByType = completed.reduce<Record<string, number>>((accumulator, interview) => {
            accumulator[interview.type] = (accumulator[interview.type] || 0) + 1;
            return accumulator;
        }, {
            behavioral: 0,
            technical: 0,
            'system-design': 0,
        });

        // F11: Rely on the `get_user_rank` RPC (uses the materialized view +
        // composite index). Do NOT fall back to a 5k-row scan — that was the
        // hot-path full-table query the previous implementation hit when the
        // RPC failed. Falling back to "rank = 1" on RPC failure is acceptable
        // (UI shows a placeholder) and infinitely cheaper than the scan.
        const sqlRank = await this.interviewRepository.getUserRank(userId);
        const rank = sqlRank ?? (averageScore > 0 ? 1 : 0);

        return {
            totalInterviews: allInterviews.length,
            completedInterviews: completed.length,
            averageScore,
            highestScore,
            rank,
            totalBehavioral: interviewsByType.behavioral || 0,
            totalTechnical: interviewsByType.technical || 0,
            totalSystemDesign: interviewsByType['system-design'] || 0,
            interviewsByType,
        };
    }

    // Get leaderboard
    async getLeaderboard(limit: number = 10) {
        const fullLeaderboard = await newrelic.startSegment('InterviewService/getLeaderboard', true, async () => {
            return this.interviewRepository.getLeaderboard();
        });
        type LeaderboardEntry = (typeof fullLeaderboard)[number];

        const firstLeaderboardEntry = fullLeaderboard[0];

        if (firstLeaderboardEntry && firstLeaderboardEntry.average_score !== undefined) {
            return fullLeaderboard.slice(0, limit).map((entry: LeaderboardEntry, index: number) => ({
                rank: entry.rank ?? index + 1,
                userId: entry.user_id,
                name: entry.name || 'Unknown',
                avatar: entry.avatar || null,
                totalInterviews: entry.total_interviews || 0,
                averageScore: Math.round(entry.average_score || 0),
            }));
        }
        
        const userMap = new Map<string, { name: string; avatar: string | null; scores: number[]; count: number }>();
        for (const row of fullLeaderboard) {
            const userId = row.user_id;
            const userInfo = Array.isArray(row.users) ? row.users[0] : row.users;
            
            if (!userMap.has(userId)) {
                userMap.set(userId, {
                    name: userInfo?.name || 'Unknown',
                    avatar: userInfo?.avatar || userInfo?.avatar_url || null,
                    scores: [],
                    count: 0,
                });
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
