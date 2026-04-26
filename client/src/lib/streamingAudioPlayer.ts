/**
 * F1 + F22: True streaming MP3 playback with MediaSource Extensions (MSE).
 *
 * The previous client `decodeAudioData` path required the FULL MP3 buffer
 * before playback could start, AND ran the decode on the main thread —
 * which (a) added 300-1500 ms of dead-air latency before the AI's voice
 * began, and (b) janked framer-motion / GSAP animations during decode.
 *
 * MSE pushes each chunk directly to the browser's media pipeline. The decoder
 * runs off-thread, playback starts as soon as the first chunk arrives, and we
 * get native ~30 ms latency instead of waiting for the entire utterance.
 *
 * Fallback: if MSE / MP3 isn't supported (very old Safari, some embedded
 * webviews), we collect the chunks and use `decodeAudioData` once everything
 * has arrived — same behaviour as before.
 */

const MIME_TYPES = ['audio/mpeg', 'audio/mp4; codecs="mp4a.40.2"'];

function pickMimeType(): string | null {
    if (typeof MediaSource === 'undefined') return null;
    for (const m of MIME_TYPES) {
        if (MediaSource.isTypeSupported(m)) return m;
    }
    return null;
}

function base64ToUint8Array(b64: string): Uint8Array {
    const binary = atob(b64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
}

export interface StreamingAudioPlayerOptions {
    onPlaybackEnded?: () => void;
    onError?: (err: Error) => void;
}

export class StreamingAudioPlayer {
    private mimeType: string | null = pickMimeType();
    private audio: HTMLAudioElement | null = null;
    private mediaSource: MediaSource | null = null;
    private sourceBuffer: SourceBuffer | null = null;
    private bufferQueue: Uint8Array[] = [];
    private appending = false;
    private finalized = false;
    private fallbackChunks: Uint8Array[] = [];
    private destroyed = false;
    private fallbackContext: AudioContext | null = null;
    private opts: StreamingAudioPlayerOptions;

    constructor(opts: StreamingAudioPlayerOptions = {}) {
        this.opts = opts;
    }

    /**
     * Push the next base64-encoded MP3 chunk.
     * `isFinal=true` signals end-of-stream; subsequent chunks are ignored.
     */
    push(audioBase64: string, isFinal: boolean): void {
        if (this.destroyed) return;

        if (audioBase64) {
            const bytes = base64ToUint8Array(audioBase64);
            if (this.mimeType) {
                this.ensureMse();
                this.bufferQueue.push(bytes);
                this.drainBuffer();
            } else {
                this.fallbackChunks.push(bytes);
            }
        }

        if (isFinal) {
            this.finalize();
        }
    }

    private ensureMse(): void {
        if (this.audio || !this.mimeType) return;

        try {
            this.mediaSource = new MediaSource();
            this.audio = new Audio();
            this.audio.autoplay = true;
            this.audio.preload = 'auto';
            this.audio.src = URL.createObjectURL(this.mediaSource);

            this.mediaSource.addEventListener('sourceopen', () => {
                if (!this.mediaSource || !this.mimeType) return;
                try {
                    this.sourceBuffer = this.mediaSource.addSourceBuffer(this.mimeType);
                    this.sourceBuffer.mode = 'sequence';
                    this.sourceBuffer.addEventListener('updateend', () => {
                        this.appending = false;
                        this.drainBuffer();
                    });
                    this.drainBuffer();
                } catch (e) {
                    this.opts.onError?.(e as Error);
                    this.degradeToFallback();
                }
            });

            this.audio.addEventListener('ended', () => {
                this.opts.onPlaybackEnded?.();
            });

            void this.audio.play().catch(() => {
                // autoplay can be blocked until user interaction; we still
                // append data so playback starts as soon as the user clicks
            });
        } catch (e) {
            this.opts.onError?.(e as Error);
            this.degradeToFallback();
        }
    }

    private drainBuffer(): void {
        if (!this.sourceBuffer || this.appending || this.bufferQueue.length === 0) return;
        const next = this.bufferQueue.shift()!;
        try {
            this.appending = true;
            // Copy into a fresh ArrayBuffer so the type matches BufferSource
            // (avoids SharedArrayBuffer ambiguity in lib.dom typings).
            const ab = new ArrayBuffer(next.byteLength);
            new Uint8Array(ab).set(next);
            this.sourceBuffer.appendBuffer(ab);
        } catch (e) {
            this.appending = false;
            this.opts.onError?.(e as Error);
            this.degradeToFallback();
        }
    }

    private finalize(): void {
        if (this.finalized) return;
        this.finalized = true;

        if (this.mimeType && this.mediaSource) {
            const tryEnd = () => {
                if (!this.mediaSource) return;
                if (this.appending || this.bufferQueue.length > 0) {
                    setTimeout(tryEnd, 30);
                    return;
                }
                if (this.mediaSource.readyState === 'open') {
                    try { this.mediaSource.endOfStream(); } catch { /* ignore */ }
                }
            };
            tryEnd();
            return;
        }

        // Fallback: concat all chunks and decode once.
        if (this.fallbackChunks.length === 0) {
            this.opts.onPlaybackEnded?.();
            return;
        }
        const total = this.fallbackChunks.reduce((sum, c) => sum + c.byteLength, 0);
        const merged = new Uint8Array(total);
        let offset = 0;
        for (const c of this.fallbackChunks) { merged.set(c, offset); offset += c.byteLength; }

        const win = window as unknown as {
            AudioContext?: typeof AudioContext;
            webkitAudioContext?: typeof AudioContext;
        };
        const Ctx = win.AudioContext ?? win.webkitAudioContext;
        if (!Ctx) {
            this.opts.onError?.(new Error('No AudioContext available'));
            return;
        }
        if (!this.fallbackContext) this.fallbackContext = new Ctx();
        const ctx = this.fallbackContext;
        ctx.decodeAudioData(
            merged.buffer.slice(0) as ArrayBuffer,
            (audioBuffer) => {
                if (!this.fallbackContext) return;
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);
                source.onended = () => this.opts.onPlaybackEnded?.();
                source.start(0);
            },
            (err) => this.opts.onError?.(err instanceof Error ? err : new Error(String(err))),
        );
    }

    private degradeToFallback(): void {
        this.mimeType = null;
        try { this.mediaSource = null; this.sourceBuffer = null; } catch { /* ignore */ }
    }

    /** Resume playback (call from a user-gesture handler if autoplay was blocked). */
    resume(): void {
        if (this.audio && this.audio.paused) {
            void this.audio.play().catch(() => undefined);
        }
        if (this.fallbackContext?.state === 'suspended') {
            void this.fallbackContext.resume().catch(() => undefined);
        }
    }

    destroy(): void {
        if (this.destroyed) return;
        this.destroyed = true;
        try {
            if (this.audio) {
                this.audio.pause();
                this.audio.removeAttribute('src');
                this.audio.load();
                this.audio = null;
            }
            if (this.mediaSource && this.mediaSource.readyState === 'open') {
                try { this.mediaSource.endOfStream(); } catch { /* ignore */ }
            }
            this.mediaSource = null;
            this.sourceBuffer = null;
            this.bufferQueue = [];
            this.fallbackChunks = [];
            if (this.fallbackContext && this.fallbackContext.state !== 'closed') {
                void this.fallbackContext.close().catch(() => undefined);
            }
            this.fallbackContext = null;
        } catch { /* ignore */ }
    }
}
