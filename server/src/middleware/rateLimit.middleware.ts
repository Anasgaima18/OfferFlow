import rateLimit, { ipKeyGenerator, Options as RateLimitOptions } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import IORedis from 'ioredis';
import type { Request } from 'express';
import { Logger } from '../utils/logger';

/**
 * F7: Rate limiting that survives multi-instance Render deployments.
 *
 * Two improvements:
 *   1. When `REDIS_URL` is set we use a Redis-backed shared counter, so
 *      scaling out to N Render instances doesn't multiply the effective
 *      limit by N or get reset on cold-start. Without REDIS_URL we fall
 *      back to the in-memory store with a `keyGenerator` that handles
 *      IPv6 properly (the default keyGenerator uses raw `req.ip` which
 *      buckets every IPv6 address with the same /64 prefix together).
 *   2. We expose a `userOrIpKey` so authenticated routes are limited
 *      *per user* not per IP. A NAT'd corporate office shouldn't share
 *      one bucket.
 */

let redis: IORedis | null = null;
const REDIS_URL = process.env.REDIS_URL;

if (REDIS_URL) {
    try {
        redis = new IORedis(REDIS_URL, {
            maxRetriesPerRequest: 3,
            enableOfflineQueue: false,
            lazyConnect: true,
        });
        redis.on('error', (e) => Logger.warn(`[rate-limit] redis error: ${e.message}`));
        redis.connect().catch((e) => Logger.warn(`[rate-limit] redis connect failed: ${e.message}`));
        Logger.info('[rate-limit] using Redis store');
    } catch (e) {
        Logger.warn(`[rate-limit] redis init failed, falling back to memory: ${(e as Error).message}`);
        redis = null;
    }
} else {
    Logger.warn(
        '[rate-limit] REDIS_URL not set — using in-memory store. ' +
        'This will NOT enforce limits correctly across multiple Render instances ' +
        'and resets on cold-start. Set REDIS_URL for production.'
    );
}

function makeStore(prefix: string) {
    if (!redis) return undefined;
    return new RedisStore({
        prefix: `rl:${prefix}:`,
        sendCommand: async (...args: string[]) => {
            const [cmd, ...rest] = args;
            return (redis as IORedis).call(cmd as string, ...(rest as (string | number)[])) as Promise<any>;
        },
    });
}

const userOrIpKey = (req: Request): string => {
    const userId = (req as Request & { user?: { id?: string } }).user?.id;
    if (userId) return `u:${userId}`;
    return ipKeyGenerator(req.ip ?? '');
};

const baseOpts = (extra: Partial<RateLimitOptions>): Partial<RateLimitOptions> => ({
    standardHeaders: true,
    legacyHeaders: false,
    ...extra,
});

export const globalLimiter = rateLimit(baseOpts({
    windowMs: 15 * 60 * 1000,
    max: 100,
    keyGenerator: userOrIpKey,
    store: makeStore('global'),
    message: {
        success: false,
        message: 'Too many requests, please try again later.',
    },
}));

export const authLimiter = rateLimit(baseOpts({
    windowMs: 15 * 60 * 1000,
    max: 10,
    keyGenerator: (req) => ipKeyGenerator(req.ip ?? ''),
    store: makeStore('auth'),
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again later.',
    },
}));

export const codeExecLimiter = rateLimit(baseOpts({
    windowMs: 15 * 60 * 1000,
    max: 20,
    keyGenerator: userOrIpKey,
    store: makeStore('codex'),
    message: {
        success: false,
        message: 'Too many code execution requests, please try again later.',
    },
}));

export function getRateLimiterRedis(): IORedis | null {
    return redis;
}
