import { LRUCache } from 'lru-cache';
import { IUser } from '../models/User';
import { userCacheHits } from '../observability/metrics';

/**
 * F4: Tiny LRU in front of `authService.getUserById` so the `protect`
 * middleware doesn't do a Supabase round-trip on every authenticated
 * request. JWT TTL is 24h — a 60s cache is fine for a "user-still-exists"
 * sanity check, and we invalidate explicitly on profile updates / logout.
 */
const cache = new LRUCache<string, IUser>({
    max: Number(process.env.USER_CACHE_MAX || 10_000),
    ttl: Number(process.env.USER_CACHE_TTL_MS || 60_000),
    allowStale: false,
});

export function getCachedUser(id: string): IUser | undefined {
    const hit = cache.get(id);
    userCacheHits.inc({ result: hit ? 'hit' : 'miss' });
    return hit;
}

export function setCachedUser(user: IUser): void {
    cache.set(user.id, user);
}

export function invalidateCachedUser(id: string): void {
    cache.delete(id);
}

export function clearUserCache(): void {
    cache.clear();
}
