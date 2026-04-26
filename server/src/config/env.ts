import { z } from 'zod';
import { Logger } from '../utils/logger';

const envSchema = z.object({
    PORT: z.string().default('5000'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    SENTRY_DSN: z.string().url('SENTRY_DSN must be a valid URL').optional(),
    NEW_RELIC_ENABLED: z.enum(['true', 'false']).optional(),
    NEW_RELIC_APP_NAME: z.string().optional(),
    NEW_RELIC_LICENSE_KEY: z.string().optional(),
    NEW_RELIC_LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).optional(),
    NEW_RELIC_LOG: z.string().optional(),
    NEW_RELIC_DISTRIBUTED_TRACING_ENABLED: z.enum(['true', 'false']).optional(),
    NEW_RELIC_ERROR_COLLECTOR_ENABLED: z.enum(['true', 'false']).optional(),
    NEW_RELIC_ERROR_COLLECTOR_IGNORE_STATUS_CODES: z.string().optional(),
    NEW_RELIC_TRANSACTION_TRACER_ENABLED: z.enum(['true', 'false']).optional(),
    NEW_RELIC_ATTRIBUTES_ENABLED: z.enum(['true', 'false']).optional(),
    NEW_RELIC_APPLICATION_LOGGING_ENABLED: z.enum(['true', 'false']).optional(),
    NEW_RELIC_APPLICATION_LOGGING_FORWARDING_ENABLED: z.enum(['true', 'false']).optional(),
    NEW_RELIC_APPLICATION_LOGGING_METRICS_ENABLED: z.enum(['true', 'false']).optional(),
    NEW_RELIC_AI_MONITORING_ENABLED: z.enum(['true', 'false']).optional(),
    NEW_RELIC_AI_MONITORING_RECORD_CONTENT_ENABLED: z.enum(['true', 'false']).optional(),
    API_BASE_URL: z.string().url('API_BASE_URL must be a valid URL').optional(),
    SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
    SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
    SUPABASE_SERVICE_KEY: z.string().min(1, 'SUPABASE_SERVICE_KEY is required'),
    ELEVENLABS_API_KEY: z.string().optional(),
    SARVAM_API_KEY: z.string().optional(),
    CLIENT_URL: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
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

/**
 * Validated environment variables singleton.
 * Import this instead of reading process.env directly for type safety.
 */
export const config = validateEnv();
