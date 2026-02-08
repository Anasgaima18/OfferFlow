import { z } from 'zod';
import { Logger } from '../utils/logger';

const envSchema = z.object({
    PORT: z.string().default('5000'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
    SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
    SUPABASE_SERVICE_KEY: z.string().min(1, 'SUPABASE_SERVICE_KEY is required'),
    ELEVENLABS_API_KEY: z.string().optional(),
    SARVAM_API_KEY: z.string().optional(),
    CLIENT_URL: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
        Logger.error('Environment validation failed:');
        for (const issue of result.error.issues) {
            Logger.error(`  ${issue.path.join('.')}: ${issue.message}`);
        }
        process.exit(1);
    }

    return result.data;
}
