import { z } from 'zod';

// Zod schema for runtime validation
export const UserSchemaZod = z.object({
    name: z.string().min(2),
    username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores').optional(),
    email: z.string().email(),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    avatar: z.string().optional(),
});

export const UpdateUserSchemaZod = z.object({
    name: z.string().min(2).optional(),
    username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores').optional(),
    avatar: z.string().url('Avatar must be a valid URL').or(z.literal('')).optional(),
});

export const ForgotPasswordSchemaZod = z.object({
    email: z.string().email('Invalid email address'),
});

export const ResetPasswordSchemaZod = z.object({
    token: z.string().min(1, 'Reset token is required'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const VerifyEmailSchemaZod = z.object({
    token: z.string().min(1, 'Verification token is required'),
});

export const OAuthProviderSchema = z.enum(['google', 'github']);

export interface OAuthProfile {
    provider: z.infer<typeof OAuthProviderSchema>;
    providerId: string;
    email: string;
    name: string;
    avatar?: string | null;
}

export type UserInput = z.infer<typeof UserSchemaZod>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchemaZod>;
export type OAuthProvider = z.infer<typeof OAuthProviderSchema>;

// Database row type (from Supabase)
export interface IUser {
    id: string;
    email: string;
    name: string;
    username?: string | null;
    password?: string; // Optional for responses (should be excluded)
    avatar: string | null;
    auth_provider?: OAuthProvider | 'local' | null;
    provider_id?: string | null;
    email_verified?: boolean;
    verification_token_hash?: string | null;
    verification_token_expires_at?: string | null;
    reset_token_hash?: string | null;
    reset_token_expires_at?: string | null;
    deleted_at?: string | null;
    created_at: string;
    updated_at: string;
}
