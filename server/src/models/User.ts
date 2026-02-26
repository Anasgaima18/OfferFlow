import { z } from 'zod';

// Zod schema for runtime validation
export const UserSchemaZod = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    avatar: z.string().optional(),
});

export type UserInput = z.infer<typeof UserSchemaZod>;

// Database row type (from Supabase)
export interface IUser {
    id: string;
    email: string;
    name: string;
    password?: string; // Optional for responses (should be excluded)
    avatar: string | null;
    created_at: string;
    updated_at: string;
}
