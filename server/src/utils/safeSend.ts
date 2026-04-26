import WebSocket from 'ws';
import { Logger } from './logger';
import { wsBufferedAmount, wsSendDrops } from '../observability/metrics';

/**
 * F2: Backpressure-aware WebSocket send.
 *
 * Default Node `ws.send` has no backpressure protection — a slow client
 * lets `ws.bufferedAmount` grow until the Node process is OOM-killed.
 *
 * This helper:
 *  - drops the frame and increments a metric if the outbound buffer is full
 *  - closes the socket with code 1013 ("try again later") above the hard cap,
 *    so we shed the slow client instead of OOM-ing the box.
 */

const SOFT_LIMIT_BYTES = Number(process.env.WS_SEND_SOFT_LIMIT || 1 * 1024 * 1024);  // 1 MiB
const HARD_LIMIT_BYTES = Number(process.env.WS_SEND_HARD_LIMIT || 8 * 1024 * 1024);  // 8 MiB

export type SendKind = 'text' | 'binary' | 'audio' | 'transcript' | 'control';

export function safeSend(ws: WebSocket, payload: string | Buffer, kind: SendKind = 'text'): boolean {
    if (ws.readyState !== ws.OPEN) return false;

    const buffered = ws.bufferedAmount;
    wsBufferedAmount.observe(buffered);

    if (buffered >= HARD_LIMIT_BYTES) {
        Logger.warn(`[ws] hard backpressure limit hit (${buffered} bytes) — closing socket`);
        wsSendDrops.inc({ kind, reason: 'hard_limit' });
        try { ws.close(1013, 'backpressure'); } catch { /* ignore */ }
        return false;
    }

    if (buffered >= SOFT_LIMIT_BYTES && (kind === 'audio' || kind === 'binary')) {
        // Drop non-essential audio frames first (transcripts/control are still sent).
        wsSendDrops.inc({ kind, reason: 'soft_limit' });
        return false;
    }

    try {
        ws.send(payload);
        return true;
    } catch (e) {
        wsSendDrops.inc({ kind, reason: 'send_threw' });
        Logger.error('[ws] send threw', e);
        return false;
    }
}

export function safeSendJson(ws: WebSocket, obj: unknown, kind: SendKind = 'text'): boolean {
    return safeSend(ws, JSON.stringify(obj), kind);
}
