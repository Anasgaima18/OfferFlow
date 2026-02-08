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
