import WebSocket from 'ws';
import { Logger } from '../utils/logger';
import { wsActiveConnections } from '../observability/metrics';

/**
 * F15: Tracks every active interview session so SIGTERM can drain them
 * politely instead of just slamming the TCP socket shut.
 */
export interface RegistrableSession {
    ws: WebSocket;
    interviewId: string | null;
    userId: string;
    startedAt: number;
    cleanup: (reason: string) => Promise<void>;
}

const sessions = new Set<RegistrableSession>();

export function registerSession(s: RegistrableSession): void {
    sessions.add(s);
    wsActiveConnections.set(sessions.size);
}

export function unregisterSession(s: RegistrableSession): void {
    sessions.delete(s);
    wsActiveConnections.set(sessions.size);
}

export function activeSessionCount(): number {
    return sessions.size;
}

export async function drainAllSessions(reason: string, timeoutMs: number): Promise<void> {
    if (sessions.size === 0) return;
    Logger.info(`[ws-drain] notifying ${sessions.size} active sessions: ${reason}`);

    for (const s of sessions) {
        try {
            if (s.ws.readyState === s.ws.OPEN) {
                s.ws.send(JSON.stringify({ type: 'server_shutdown', reason, message: 'Server is restarting; please reconnect.' }));
            }
        } catch (e) {
            Logger.warn(`[ws-drain] notify failed for session ${s.interviewId}: ${(e as Error).message}`);
        }
    }

    const cleanupPromises = Array.from(sessions).map((s) =>
        s.cleanup(reason).catch((e) => Logger.error(`[ws-drain] cleanup failed`, e))
    );

    await Promise.race([
        Promise.allSettled(cleanupPromises),
        new Promise((r) => setTimeout(r, timeoutMs)),
    ]);

    for (const s of sessions) {
        try { s.ws.close(1012, 'server_shutdown'); } catch { /* ignore */ }
    }
    sessions.clear();
    wsActiveConnections.set(0);
    Logger.info('[ws-drain] complete');
}
