import { Logger } from './logger';
import { wsConnectionsByIp } from '../observability/metrics';

/**
 * F14: Per-IP WebSocket connection cap.
 *
 * Without this, anyone can open thousands of WS connections from a single
 * laptop, exhausting `ws` library RAM (~3-5 KB per idle conn) and our
 * Sarvam/ElevenLabs upstream WS budget (each session opens 2 outbound WS).
 *
 * Defaults: 10 concurrent WS per IP, 200 globally. Override via env.
 */

const PER_IP_CAP = Number(process.env.WS_PER_IP_LIMIT || 10);
const GLOBAL_CAP = Number(process.env.WS_GLOBAL_LIMIT || 200);

const counts = new Map<string, number>();
let globalCount = 0;

export interface AcquireResult {
    ok: boolean;
    reason?: 'per_ip' | 'global';
    current: number;
    cap: number;
}

export function acquireSlot(ip: string): AcquireResult {
    if (globalCount >= GLOBAL_CAP) {
        Logger.warn(`[ws-limit] global cap (${GLOBAL_CAP}) reached`);
        return { ok: false, reason: 'global', current: globalCount, cap: GLOBAL_CAP };
    }
    const current = counts.get(ip) ?? 0;
    if (current >= PER_IP_CAP) {
        Logger.warn(`[ws-limit] per-IP cap (${PER_IP_CAP}) reached for ${ip}`);
        return { ok: false, reason: 'per_ip', current, cap: PER_IP_CAP };
    }
    counts.set(ip, current + 1);
    globalCount++;
    wsConnectionsByIp.set({ ip }, current + 1);
    return { ok: true, current: current + 1, cap: PER_IP_CAP };
}

export function releaseSlot(ip: string): void {
    const current = counts.get(ip) ?? 0;
    if (current <= 1) {
        counts.delete(ip);
        wsConnectionsByIp.remove({ ip });
    } else {
        counts.set(ip, current - 1);
        wsConnectionsByIp.set({ ip }, current - 1);
    }
    globalCount = Math.max(0, globalCount - 1);
}

export function snapshot() {
    return { perIp: Object.fromEntries(counts), global: globalCount, perIpCap: PER_IP_CAP, globalCap: GLOBAL_CAP };
}

export function clientIpFromRequest(headers: Record<string, string | string[] | undefined>, fallback: string): string {
    // Render sets X-Forwarded-For with the client IP first.
    // Express trust proxy=1 uses the same first-hop logic.
    const xff = headers['x-forwarded-for'];
    const raw = Array.isArray(xff) ? xff[0] : xff;
    if (raw) {
        const first = raw.split(',')[0]?.trim();
        if (first) return first;
    }
    return fallback;
}
