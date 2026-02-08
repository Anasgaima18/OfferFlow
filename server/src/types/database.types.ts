// Database types for Supabase
// These types match the PostgreSQL schema

export type Database = {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string;
                    email: string;
                    name: string;
                    password: string;
                    avatar: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    email: string;
                    name: string;
                    password: string;
                    avatar?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    email?: string;
                    name?: string;
                    password?: string;
                    avatar?: string | null;
                    updated_at?: string;
                };
            };
            interviews: {
                Row: {
                    id: string;
                    user_id: string;
                    type: 'behavioral' | 'technical' | 'system-design';
                    status: 'pending' | 'completed' | 'in-progress';
                    score: number | null;
                    feedback: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    type: 'behavioral' | 'technical' | 'system-design';
                    status?: 'pending' | 'completed' | 'in-progress';
                    score?: number | null;
                    feedback?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    type?: 'behavioral' | 'technical' | 'system-design';
                    status?: 'pending' | 'completed' | 'in-progress';
                    score?: number | null;
                    feedback?: string | null;
                    updated_at?: string;
                };
            };
            transcript_messages: {
                Row: {
                    id: string;
                    interview_id: string;
                    role: 'user' | 'ai';
                    content: string;
                    timestamp: string;
                };
                Insert: {
                    id?: string;
                    interview_id: string;
                    role: 'user' | 'ai';
                    content: string;
                    timestamp?: string;
                };
                Update: {
                    id?: string;
                    interview_id?: string;
                    role?: 'user' | 'ai';
                    content?: string;
                    timestamp?: string;
                };
            };
        };
    };
};

// Helper types
export type User = Database['public']['Tables']['users']['Row'];
export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type Interview = Database['public']['Tables']['interviews']['Row'];
export type InterviewInsert = Database['public']['Tables']['interviews']['Insert'];
export type TranscriptMessage = Database['public']['Tables']['transcript_messages']['Row'];
