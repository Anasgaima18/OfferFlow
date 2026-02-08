// Interview types for Supabase
import { z } from 'zod';

export type InterviewType = 'behavioral' | 'technical' | 'system-design';
export type InterviewStatus = 'pending' | 'completed' | 'in-progress';

export interface IInterview {
    id: string;
    user_id: string;
    type: InterviewType;
    status: InterviewStatus;
    score: number | null;
    feedback: string | null;
    created_at: string;
    updated_at: string;
}

export interface ITranscriptMessage {
    id: string;
    interview_id: string;
    role: 'user' | 'ai';
    content: string;
    timestamp: string;
}

export interface CreateInterviewInput {
    user_id: string;
    type: InterviewType;
}

// Zod validation schemas
export const CreateInterviewSchema = z.object({
    type: z.enum(['behavioral', 'technical', 'system-design'], {
        message: 'Interview type must be behavioral, technical, or system-design',
    }),
});

export const ExecuteCodeSchema = z.object({
    language: z.enum(['javascript', 'python', 'java', 'cpp']).optional().default('javascript'),
    code: z.string()
        .min(1, 'Code is required')
        .max(50000, 'Code must be under 50KB'),
});
