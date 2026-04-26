import { Logger } from './logger';
import { InterviewService } from '../services/interview.service';
import { transcriptDrops, transcriptQueueDepth } from '../observability/metrics';
import * as Sentry from '@sentry/node';

/**
 * F8: Per-session bounded transcript queue with a serial drain worker.
 *
 * The previous implementation called `addTranscriptMessage(...).catch(log)`
 * fire-and-forget. Under DB pressure or PostgREST throttling, transcripts
 * silently disappeared. This queue:
 *   - serializes writes per session (preserves message order)
 *   - bounds memory at MAX_QUEUE_DEPTH messages (drops OLDEST when full —
 *     newer context is more useful than older for the AI)
 *   - retries on transient errors with exponential backoff
 *   - reports queue depth + drops to Prometheus + Sentry
 */

const MAX_QUEUE_DEPTH = Number(process.env.TRANSCRIPT_QUEUE_MAX || 200);
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 250;

interface QueuedMessage {
    role: 'user' | 'ai';
    content: string;
    enqueuedAt: number;
    attempts: number;
}

export class TranscriptQueue {
    private queue: QueuedMessage[] = [];
    private draining = false;
    private interviewId: string;
    private interviewService: InterviewService;
    private destroyed = false;

    constructor(interviewId: string, interviewService: InterviewService) {
        this.interviewId = interviewId;
        this.interviewService = interviewService;
    }

    enqueue(role: 'user' | 'ai', content: string): void {
        if (this.destroyed) return;

        if (this.queue.length >= MAX_QUEUE_DEPTH) {
            const dropped = this.queue.shift();
            transcriptDrops.inc({ reason: 'queue_full' });
            Logger.warn(`[transcript-queue] dropping oldest message for ${this.interviewId} (queue full)`);
            Sentry.captureMessage('Transcript queue overflow', {
                level: 'warning',
                tags: { interviewId: this.interviewId },
                extra: { droppedRole: dropped?.role, contentPreview: dropped?.content.slice(0, 80) },
            });
        }

        this.queue.push({ role, content, enqueuedAt: Date.now(), attempts: 0 });
        transcriptQueueDepth.set(this.queue.length);
        void this.drain();
    }

    private async drain(): Promise<void> {
        if (this.draining || this.destroyed) return;
        this.draining = true;
        try {
            while (this.queue.length > 0 && !this.destroyed) {
                const msg = this.queue[0]!;
                try {
                    await this.interviewService.addTranscriptMessage(this.interviewId, msg.role, msg.content);
                    this.queue.shift();
                    transcriptQueueDepth.set(this.queue.length);
                } catch (err) {
                    msg.attempts++;
                    if (msg.attempts >= MAX_RETRIES) {
                        this.queue.shift();
                        transcriptDrops.inc({ reason: 'max_retries' });
                        Logger.error(`[transcript-queue] giving up after ${MAX_RETRIES} attempts`, err);
                        Sentry.captureException(err, {
                            tags: { interviewId: this.interviewId, role: msg.role, stage: 'transcript-write' },
                        });
                    } else {
                        const delay = RETRY_BASE_MS * 2 ** (msg.attempts - 1);
                        Logger.warn(`[transcript-queue] transient error, retry ${msg.attempts}/${MAX_RETRIES} in ${delay}ms`);
                        await new Promise((r) => setTimeout(r, delay));
                    }
                }
            }
        } finally {
            this.draining = false;
        }
    }

    async flush(timeoutMs = 5_000): Promise<void> {
        const deadline = Date.now() + timeoutMs;
        while ((this.queue.length > 0 || this.draining) && Date.now() < deadline) {
            await new Promise((r) => setTimeout(r, 100));
        }
    }

    destroy(): void {
        this.destroyed = true;
        this.queue = [];
        transcriptQueueDepth.set(0);
    }

    get depth(): number {
        return this.queue.length;
    }
}
