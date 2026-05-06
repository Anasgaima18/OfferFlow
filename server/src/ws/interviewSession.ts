import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { URL } from 'url';
import apm from '../observability/apm';
import * as Sentry from '@sentry/node';
import { Logger } from '../utils/logger';
import { SarvamService } from '../services/sarvam.service';
import { ElevenLabsService } from '../services/elevenlabs.service';
import { InterviewService } from '../services/interview.service';
import { FeedbackService } from '../services/feedback.service';
import { config } from '../config/env';
import { safeSend, safeSendJson } from '../utils/safeSend';
import { TranscriptQueue } from '../utils/transcriptQueue';
import { acquireSlot, releaseSlot, clientIpFromRequest } from '../utils/connectionLimiter';
import {
    aiResponseLatency,
    sttTurnLatency,
    wsSessionsTotal,
} from '../observability/metrics';
import { registerSession, unregisterSession, RegistrableSession } from './sessionRegistry';

// ── Constants ────────────────────────────────────────────────────────────────
const MAX_CONVERSATION_HISTORY = 20;
const HEARTBEAT_INTERVAL_MS = 30_000;
const SARVAM_MAX_RECONNECT = 3;
const DEFAULT_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL';
const WS_AUTH_TIMEOUT_MS = 10_000;
const SPEECH_DEBOUNCE_MS = 2000;
const FEEDBACK_TIMEOUT_MS = 30_000;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROLE_OPTIONS = new Set(['software-engineer', 'frontend-engineer']);
const LANGUAGE_OPTIONS = new Set(['javascript', 'python', 'java', 'cpp']);

function getSystemPrompt(interviewType: string, role?: string | null, language?: string | null): string {
    const rules = `RULES:
1. You MUST respond ONLY in English. Do NOT use Hindi, Hinglish, or any other language.
2. You are a STRICT evaluator. If the candidate gives a wrong, vague, or incomplete answer, point out the mistake clearly and ask them to think again. Do NOT agree with incorrect answers. Challenge weak reasoning.
3. Ask one question at a time. Keep responses concise (2-4 sentences).
4. After the candidate answers, briefly evaluate their answer (correct/incorrect/partially correct) before moving on.`;

    const roleGuidance = role === 'frontend-engineer'
        ? 'The candidate is preparing for a frontend engineering role. Emphasize UI architecture, performance, accessibility, debugging, and product trade-offs where relevant.'
        : 'The candidate is preparing for a general software engineering role. Emphasize algorithms, implementation detail, trade-offs, and communication clarity.';

    const languageGuidance = language
        ? `When code examples or constraints matter, prefer ${language} unless the candidate explicitly changes languages.`
        : 'Adapt the coding language to the candidate naturally when examples are needed.';

    switch (interviewType) {
        case 'behavioral':
            return `${rules}\n\n${roleGuidance}\n${languageGuidance}\n\nYou are a professional behavioral interviewer at a top tech company. Conduct a behavioral interview using the STAR method (Situation, Task, Action, Result). Ask about leadership, teamwork, conflict resolution, and decision-making. If the candidate gives a generic or superficial answer, probe deeper — ask for specific examples, numbers, outcomes, and lessons learned. Start by welcoming the candidate warmly and asking your first behavioral question.`;
        case 'system-design':
            return `${rules}\n\n${roleGuidance}\n${languageGuidance}\n\nYou are a senior systems architect conducting a system design interview at a top tech company. Ask the candidate to design a real-world system (e.g., URL shortener, chat application, news feed). Probe their understanding of scalability, load balancing, database choices, caching, API design, and trade-offs. If they make incorrect assumptions or miss important considerations, point it out and ask them to reconsider. Guide them step-by-step. Start by welcoming the candidate and presenting the design problem.`;
        case 'technical':
        default:
            return `${rules}\n\n${roleGuidance}\n${languageGuidance}\n\nYou are a professional technical interviewer at a top tech company. Conduct a coding interview. Ask one clear coding question at a time. Evaluate the candidate's problem-solving approach, code quality, time/space complexity, and edge cases. If the candidate's solution is wrong or suboptimal, tell them what's wrong and ask them to fix it. Do NOT accept incorrect solutions. Start by welcoming the candidate and asking your first coding question.`;
    }
}

/**
 * F14: Per-IP connection cap is enforced inside the `connection` handler so
 * we have access to forwarded headers. (`verifyClient` doesn't see them on
 * Render — they're only attached after the upgrade.)
 *
 * F13: Message handlers are attached BEFORE async work begins, with messages
 * queued during initialization so nothing is lost in the auth-to-start
 * window.
 *
 * F15: Sessions are registered in a registry so `drainAllSessions` can shut
 * them down politely on SIGTERM.
 */
export function setupWebSocket(
    server: http.Server,
    interviewService: InterviewService,
    sarvamService: SarvamService,
    elevenLabsService: ElevenLabsService,
    feedbackService: FeedbackService
): WebSocketServer {
    const wss = new WebSocketServer({
        server,
        path: '/api/v1/interviews/ws',
        maxPayload: 256 * 1024, // single inbound frame cap (audio chunks are ~640 bytes)
    });

    wss.on('connection', async (ws, req) => {
        const clientIp = clientIpFromRequest(req.headers, req.socket.remoteAddress ?? 'unknown');
        const slot = acquireSlot(clientIp);
        if (!slot.ok) {
            try {
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Too many concurrent connections. Please close other interview tabs and try again.',
                }));
            } catch { /* ignore */ }
            ws.close(1013, slot.reason === 'global' ? 'global_capacity' : 'per_ip_capacity');
            return;
        }

        let slotReleased = false;
        const releaseOnce = () => {
            if (slotReleased) return;
            slotReleased = true;
            releaseSlot(clientIp);
        };
        ws.once('close', releaseOnce);

        Logger.info(`[ws] connection from ${clientIp} — slot ${slot.current}/${slot.cap}`);
        apm.recordCustomEvent('InterviewWsConnectionAttempt', {
            path: req.url ?? '/api/v1/interviews/ws',
            ip: clientIp,
        });

        // F13: Buffer any messages that arrive while we're authenticating /
        // initializing. Without this, the candidate's first audio chunks were
        // silently dropped because there was no handler attached yet.
        const earlyQueue: WebSocket.RawData[] = [];
        const earlyQueueMax = 200;
        const earlyHandler = (msg: WebSocket.RawData) => {
            if (earlyQueue.length < earlyQueueMax) earlyQueue.push(msg);
        };
        ws.on('message', earlyHandler);

        const url = new URL(req.url || '', `http://${req.headers.host}`);
        const interviewId = url.searchParams.get('interviewId');
        const requestedRole = url.searchParams.get('role');
        const requestedLanguage = url.searchParams.get('language');
        const interviewRole = requestedRole && ROLE_OPTIONS.has(requestedRole) ? requestedRole : null;
        const interviewLanguage = requestedLanguage && LANGUAGE_OPTIONS.has(requestedLanguage) ? requestedLanguage : null;

        if (interviewId && !UUID_REGEX.test(interviewId)) {
            safeSendJson(ws, { type: 'error', message: 'Invalid interview ID format' }, 'control');
            ws.close(4000, 'Invalid interviewId');
            return;
        }

        const userId = await authenticateClient(ws, earlyQueue);
        if (!userId) return;

        safeSendJson(ws, { type: 'auth_success' }, 'control');
        apm.recordCustomEvent('InterviewWsConnectionEstablished', {
            userId,
            interviewId: interviewId ?? 'none',
        });

        const interviewType = await initializeInterview(ws, interviewId, userId, interviewService);
        if (interviewType === null) return;

        wsSessionsTotal.inc({ interview_type: interviewType });

        const session = new InterviewSession(
            ws,
            interviewId,
            userId,
            interviewType,
            interviewRole,
            interviewLanguage,
            interviewService,
            sarvamService,
            elevenLabsService,
            feedbackService,
        );

        ws.off('message', earlyHandler);
        session.start(earlyQueue);
    });

    return wss;
}

async function authenticateClient(ws: WebSocket, earlyQueue: WebSocket.RawData[]): Promise<string | null> {
    let resolveAuth: (value: string | null) => void;
    const authPromise = new Promise<string | null>((resolve) => { resolveAuth = resolve; });

    const authTimeout = setTimeout(() => {
        safeSendJson(ws, { type: 'error', message: 'Authentication timeout — send { type: "auth", token: "..." } within 10s' }, 'control');
        ws.close(4001, 'Auth timeout');
        resolveAuth(null);
    }, WS_AUTH_TIMEOUT_MS);

    const tryAuthenticate = (raw: string) => {
        clearTimeout(authTimeout);
        try {
            const authData = JSON.parse(raw);
            if (authData.type !== 'auth' || !authData.token) {
                safeSendJson(ws, { type: 'error', message: 'First message must be { type: "auth", token: "..." }' }, 'control');
                ws.close(4001, 'Unauthorized');
                resolveAuth(null);
                return;
            }
            const decoded = jwt.verify(authData.token, config.JWT_SECRET) as { id: string };
            Logger.info(`WebSocket authenticated for user: ${decoded.id}`);
            apm.setUserID(decoded.id);
            apm.addCustomAttribute('ws.userId', decoded.id);
            apm.recordCustomEvent('InterviewWsAuthenticated', { userId: decoded.id });
            resolveAuth(decoded.id);
        } catch (err) {
            Logger.error('WebSocket auth failed', err);
            Sentry.captureException(err, { tags: { stage: 'ws-authentication' } });
            apm.recordCustomEvent('InterviewWsAuthFailure', {
                reason: err instanceof jwt.TokenExpiredError ? 'token-expired' : 'invalid-token',
            });
            const message = err instanceof jwt.TokenExpiredError ? 'Token expired' : 'Invalid or expired token';
            safeSendJson(ws, { type: 'error', message }, 'control');
            ws.close(4001, 'Unauthorized');
            resolveAuth(null);
        }
    };

    // The earlyQueue listener may have already received the auth message.
    // Check it first; otherwise wait for the next message.
    const queuedAuth = earlyQueue.find((m) => {
        try {
            const obj = JSON.parse(m.toString());
            return obj?.type === 'auth';
        } catch { return false; }
    });
    if (queuedAuth) {
        const idx = earlyQueue.indexOf(queuedAuth);
        if (idx >= 0) earlyQueue.splice(idx, 1);
        tryAuthenticate(queuedAuth.toString());
        return authPromise;
    }

    const onMessage = (msg: WebSocket.RawData) => {
        ws.off('message', onMessage);
        tryAuthenticate(msg.toString());
    };
    const onClose = () => {
        clearTimeout(authTimeout);
        resolveAuth(null);
    };
    ws.on('message', onMessage);
    ws.once('close', onClose);

    const result = await authPromise;
    ws.off('message', onMessage);
    ws.off('close', onClose);
    return result;
}

async function initializeInterview(
    ws: WebSocket,
    interviewId: string | null,
    userId: string,
    interviewService: InterviewService,
): Promise<string | null> {
    let interviewType = 'technical';

    if (interviewId) {
        try {
            const interviewRecord = await interviewService.getInterviewById(interviewId, userId);
            if (!interviewRecord) {
                safeSendJson(ws, { type: 'error', message: 'Interview not found' }, 'control');
                ws.close(4004, 'Interview not found');
                return null;
            }
            if (interviewRecord.user_id !== userId) {
                safeSendJson(ws, { type: 'error', message: 'Forbidden: interview does not belong to you' }, 'control');
                ws.close(4003, 'Forbidden');
                return null;
            }
            interviewType = interviewRecord.type;
            await interviewService.updateInterview(interviewId, { status: 'in-progress' }, userId);
            Logger.info(`Interview ${interviewId} (${interviewType}) status set to in-progress`);
            apm.recordCustomEvent('InterviewWsSessionStarted', { interviewId, userId, interviewType });
        } catch (e) {
            Logger.warn(`Could not load/update interview: ${(e as Error).message}`);
            Sentry.captureException(e, { tags: { stage: 'ws-initialize-interview', interviewId: interviewId ?? 'none', userId } });
            safeSendJson(ws, { type: 'error', message: 'Unable to start interview session' }, 'control');
            ws.close(1011, 'Interview initialization failed');
            return null;
        }
    }

    return interviewType;
}

class InterviewSession {
    private ws: WebSocket;
    private interviewId: string | null;
    private userId: string;
    private startedAt: number;
    private conversationHistory: { role: string; content: string }[];
    private isProcessingAI = false;
    private greetingDone = false;
    private ttsStream: { sendText: (text: string, flush?: boolean) => void; close: () => void } | null = null;
    private sarvamWs: WebSocket | null = null;
    private connectionAlive = true;
    private hasTranscript = false;
    private isAlive = true;
    private heartbeatInterval: ReturnType<typeof setInterval>;
    private sarvamReconnectAttempts = 0;
    private sarvamConnecting = false;
    private sarvamFailed = false;
    private lastAudioSentAt = 0;
    private pendingUserText = '';
    private speechDebounce: ReturnType<typeof setTimeout> | null = null;
    private speechStartedAt = 0;
    private aiCallStartedAt = 0;

    private transcripts: TranscriptQueue | null = null;
    private registryEntry: RegistrableSession | null = null;

    constructor(
        ws: WebSocket,
        interviewId: string | null,
        userId: string,
        interviewType: string,
        interviewRole: string | null,
        interviewLanguage: string | null,
        private interviewService: InterviewService,
        private sarvamService: SarvamService,
        private elevenLabsService: ElevenLabsService,
        private feedbackService: FeedbackService,
    ) {
        this.ws = ws;
        this.interviewId = interviewId;
        this.userId = userId;
        this.startedAt = Date.now();
        this.conversationHistory = [
            { role: 'system', content: getSystemPrompt(interviewType, interviewRole, interviewLanguage) },
        ];

        if (this.interviewId) {
            this.transcripts = new TranscriptQueue(this.interviewId, this.interviewService);
        }

        this.heartbeatInterval = setInterval(() => {
            if (!this.isAlive) {
                Logger.warn('Client heartbeat timeout — terminating connection');
                clearInterval(this.heartbeatInterval);
                this.ws.terminate();
                return;
            }
            this.isAlive = false;
            try { this.ws.ping(); } catch { /* ignore */ }
        }, HEARTBEAT_INTERVAL_MS);

        this.ws.on('pong', () => { this.isAlive = true; });
    }

    start(earlyQueue: WebSocket.RawData[]): void {
        this.ws.on('message', (message) => this.handleMessage(message));
        this.ws.on('close', () => this.handleDisconnect());

        // F13: replay queued messages now that the real handler is attached.
        for (const msg of earlyQueue) {
            this.handleMessage(msg);
        }

        this.registryEntry = {
            ws: this.ws,
            interviewId: this.interviewId,
            userId: this.userId,
            startedAt: this.startedAt,
            cleanup: (reason: string) => this.gracefulCleanup(reason),
        };
        registerSession(this.registryEntry);

        // Greeting kicked off async; safeSend handles "ws not yet ready" gracefully.
        void this.sendGreeting();
    }

    private async sendGreeting(): Promise<void> {
        try {
            this.conversationHistory.push({ role: 'user', content: 'Hello, I am ready for the interview.' });
            const greetingResponse = await this.sarvamService.generateResponse(this.conversationHistory);
            this.conversationHistory.push({ role: 'assistant', content: greetingResponse });
            this.greetingDone = true;
            Logger.info(`AI Greeting: "${greetingResponse.substring(0, 80)}..."`);

            // F8: enqueue, don't fire-and-forget
            this.transcripts?.enqueue('ai', greetingResponse);
            if (this.interviewId) this.hasTranscript = true;

            if (this.ws.readyState === this.ws.OPEN) {
                safeSendJson(this.ws, { transcript: greetingResponse, isFinal: true, speaker: 'ai' }, 'transcript');
                this.speakText(greetingResponse);
            }
        } catch (err) {
            Logger.error('Failed to generate AI greeting', err);
            Sentry.captureException(err, {
                tags: { stage: 'ws-ai-greeting', interviewId: this.interviewId ?? 'none', userId: this.userId },
            });
            safeSendJson(this.ws, { type: 'error', message: 'Failed to start interview. Please reconnect.' }, 'control');
        }
    }

    private handleMessage(message: WebSocket.RawData): void {
        if (Buffer.isBuffer(message)) {
            this.handleAudioChunk(message);
        } else {
            this.handleTextMessage(message);
        }
    }

    private handleAudioChunk(audioData: Buffer): void {
        const now = Date.now();
        if (this.speechStartedAt === 0) this.speechStartedAt = now;
        this.lastAudioSentAt = now;

        if (!this.sarvamWs && !this.sarvamConnecting && !this.sarvamFailed) {
            this.sarvamReconnectAttempts = 0;
            this.connectSarvamSTT();
            return;
        }

        if (!this.sarvamWs || this.sarvamWs.readyState !== WebSocket.OPEN) return;
        this.sarvamService.sendAudio(this.sarvamWs, audioData);
    }

    private handleTextMessage(message: WebSocket.RawData): void {
        try {
            const parsed = JSON.parse(message.toString());
            if (parsed.type === 'ping') {
                safeSendJson(this.ws, { type: 'pong' }, 'control');
            }
            if (parsed.type === 'reset_stt') {
                this.sarvamFailed = false;
                this.sarvamReconnectAttempts = 0;
                if (this.sarvamWs) try { this.sarvamWs.close(); } catch { /* ignore */ }
                this.sarvamWs = null;
                Logger.info('STT reset by client — will reconnect on next audio');
            }
        } catch {
            // Ignore parse errors for non-JSON messages
        }
    }

    /**
     * F17: Run feedback generation as a fire-and-forget task instead of
     * awaiting it inside handleDisconnect. Awaiting blocked the WS handler
     * for 10–30s holding open Node's event loop on a session that's already
     * disconnected. We still capture failures via Sentry.
     */
    private async handleDisconnect(): Promise<void> {
        if (!this.connectionAlive) return; // already cleaned up
        await this.gracefulCleanup('client_disconnect');

        if (this.interviewId && this.hasTranscript) {
            const interviewId = this.interviewId;
            const userId = this.userId;
            const feedbackPromise = (async () => {
                try {
                    Logger.info(`[feedback] generating async for ${interviewId}`);
                    await Promise.race([
                        this.feedbackService.generateFeedback(interviewId),
                        new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('feedback_generation_timeout')), FEEDBACK_TIMEOUT_MS),
                        ),
                    ]);
                    Logger.info(`[feedback] done for ${interviewId}`);
                } catch (e) {
                    Logger.error('[feedback] async generation failed', e);
                    Sentry.captureException(e, {
                        tags: { stage: 'ws-feedback-async', interviewId, userId },
                    });
                }
            })();
            // Detach so it doesn't keep the event loop busy from the caller's perspective.
            feedbackPromise.catch(() => {});
        }
    }

    private async gracefulCleanup(reason: string): Promise<void> {
        if (!this.connectionAlive) return;
        this.connectionAlive = false;
        clearInterval(this.heartbeatInterval);
        if (this.speechDebounce) clearTimeout(this.speechDebounce);

        Logger.info(`[ws] cleaning up session (${reason}) interviewId=${this.interviewId} user=${this.userId}`);

        if (this.sarvamWs) try { this.sarvamWs.close(); } catch { /* ignore */ }
        if (this.ttsStream) try { this.ttsStream.close(); } catch { /* ignore */ }

        if (this.registryEntry) unregisterSession(this.registryEntry);

        if (this.interviewId && this.hasTranscript) {
            try {
                await this.interviewService.updateInterview(this.interviewId, { status: 'completed' }, this.userId);
                Logger.info(`Interview ${this.interviewId} completed (${Math.round((Date.now() - this.startedAt) / 60_000)} min)`);
                apm.recordCustomEvent('InterviewWsSessionEnded', {
                    interviewId: this.interviewId,
                    userId: this.userId,
                    durationMs: Date.now() - this.startedAt,
                    hadTranscript: this.hasTranscript,
                });
            } catch (e) {
                Logger.error('Failed to update interview status on disconnect', e);
            }
        }

        // Ensure pending transcripts get one more flush before we drop them.
        if (this.transcripts) {
            await this.transcripts.flush(2_000);
            this.transcripts.destroy();
        }
    }

    private trimHistory(): void {
        const KEEP_PREFIX = 3;
        if (this.conversationHistory.length > KEEP_PREFIX + MAX_CONVERSATION_HISTORY) {
            this.conversationHistory = [
                ...this.conversationHistory.slice(0, KEEP_PREFIX),
                ...this.conversationHistory.slice(-MAX_CONVERSATION_HISTORY),
            ];
        }
    }

    /**
     * F1: TRUE streaming TTS.
     *
     * Previously every chunk was buffered into one giant base64 frame at the
     * end. That defeated streaming entirely — the candidate would wait
     * 1500-3000ms before any audio played. Now we forward each ElevenLabs
     * audio chunk as it arrives:
     *   client → { type: 'audio_chunk', audio: <base64>, isFinal: false }
     *           ...
     *   client → { type: 'audio_chunk', audio: '',         isFinal: true  }
     *
     * Each chunk is ~5-15 KB MP3 so backpressure (F2) checks meaningfully
     * shed slow clients before our outbound buffer balloons.
     */
    private speakText(text: string): void {
        if (!this.connectionAlive || this.ws.readyState !== this.ws.OPEN) return;

        try {
            if (this.ttsStream) {
                try { this.ttsStream.close(); } catch { /* ignore */ }
                this.ttsStream = null;
            }

            let chunksSent = 0;
            let bytesSent = 0;
            let finalSent = false;

            const sendFinal = () => {
                if (finalSent) return;
                finalSent = true;
                safeSendJson(this.ws, { type: 'audio_chunk', audio: '', isFinal: true, bytes: bytesSent, chunks: chunksSent }, 'control');
                Logger.info(`[tts] streamed ${chunksSent} chunks / ${bytesSent} bytes`);
            };

            this.ttsStream = this.elevenLabsService.createStreamingTTS(
                DEFAULT_VOICE_ID,
                (chunk) => {
                    if (this.ws.readyState !== this.ws.OPEN) return;
                    chunksSent++;
                    bytesSent += chunk.length;
                    safeSendJson(
                        this.ws,
                        { type: 'audio_chunk', audio: chunk.toString('base64'), isFinal: false },
                        'audio',
                    );
                },
                () => sendFinal(),
                (err) => {
                    Logger.error('TTS Stream Error', err);
                    Sentry.captureException(err, { tags: { stage: 'ws-tts', interviewId: this.interviewId ?? 'none' } });
                    if (this.ws.readyState === this.ws.OPEN) {
                        safeSendJson(this.ws, { type: 'tts_error', message: 'AI voice failed; transcript still available.' }, 'control');
                        sendFinal();
                    }
                },
            );

            this.ttsStream.sendText(text, true);
        } catch (e) {
            Logger.error('Failed to speak text via TTS', e);
            safeSendJson(this.ws, { type: 'tts_error', message: 'AI voice unavailable.' }, 'control');
        }
    }

    /**
     * F9: Don't drop pendingUserText if the AI is still processing.
     * The previous code did:
     *     const userText = this.pendingUserText.trim();
     *     this.pendingUserText = '';                  ← dropped speech
     *     if (... this.isProcessingAI ...) return;    ← guarded too late
     * which silently discarded everything the candidate said while the AI
     * was thinking. Now we only consume `pendingUserText` once we've decided
     * to actually use it.
     */
    private async finalizeUserSpeech(): Promise<void> {
        if (this.speechDebounce) { clearTimeout(this.speechDebounce); this.speechDebounce = null; }

        if (this.isProcessingAI) {
            // Defer: keep `pendingUserText` accumulating, retry shortly.
            this.speechDebounce = setTimeout(() => this.finalizeUserSpeech(), SPEECH_DEBOUNCE_MS);
            return;
        }

        const userText = this.pendingUserText.trim();
        if (!userText || userText.length < 2 || !this.greetingDone || this.ws.readyState !== this.ws.OPEN) {
            return;
        }
        this.pendingUserText = '';

        if (this.speechStartedAt > 0) {
            sttTurnLatency.observe(Date.now() - this.speechStartedAt);
            this.speechStartedAt = 0;
        }

        this.isProcessingAI = true;

        safeSendJson(this.ws, { transcript: userText, isFinal: true, speaker: 'user' }, 'transcript');
        this.conversationHistory.push({ role: 'user', content: userText });
        this.trimHistory();

        // F8: enqueue
        this.transcripts?.enqueue('user', userText);
        if (this.interviewId) this.hasTranscript = true;

        safeSendJson(this.ws, { type: 'ai_thinking' }, 'control');

        this.aiCallStartedAt = Date.now();
        try {
            const aiResponse = await this.sarvamService.generateResponse(this.conversationHistory);
            aiResponseLatency.observe(Date.now() - this.aiCallStartedAt);

            this.conversationHistory.push({ role: 'assistant', content: aiResponse });
            this.trimHistory();
            Logger.info(`AI Response: "${aiResponse.substring(0, 80)}..."`);

            this.transcripts?.enqueue('ai', aiResponse);

            safeSendJson(this.ws, { type: 'ai_done' }, 'control');
            safeSendJson(this.ws, { transcript: aiResponse, isFinal: true, speaker: 'ai' }, 'transcript');
            this.speakText(aiResponse);
        } catch (err) {
            Logger.error('AI Processing Error', err);
            Sentry.captureException(err, {
                tags: { stage: 'ws-ai-processing', interviewId: this.interviewId ?? 'none', userId: this.userId },
            });
            apm.recordCustomEvent('InterviewWsAiFailure', {
                interviewId: this.interviewId ?? 'none',
                userId: this.userId,
            });
            safeSendJson(this.ws, { type: 'ai_done' }, 'control');
            safeSendJson(this.ws, { type: 'error', message: 'AI Processing Failed' }, 'control');
        } finally {
            this.isProcessingAI = false;
            // If more user speech accumulated while we were thinking, finalize it next.
            if (this.pendingUserText.trim().length >= 2) {
                this.speechDebounce = setTimeout(() => this.finalizeUserSpeech(), 100);
            }
        }
    }

    private connectSarvamSTT(): void {
        if (this.sarvamConnecting) return;
        this.sarvamConnecting = true;

        try {
            this.sarvamWs = this.sarvamService.startStreamingSTT(
                async (data) => {
                    if (this.ws.readyState !== this.ws.OPEN) return;
                    this.sarvamReconnectAttempts = 0;

                    if (data._event) {
                        if (data.signal_type === 'END_SPEECH' && this.pendingUserText.trim()) {
                            Logger.info('VAD: END_SPEECH — finalizing user speech');
                            await this.finalizeUserSpeech();
                        }
                        return;
                    }

                    if (data.transcript && data.transcript.trim()) {
                        this.pendingUserText += (this.pendingUserText ? ' ' : '') + data.transcript.trim();
                        safeSendJson(this.ws, { transcript: this.pendingUserText, isFinal: false, speaker: 'user' }, 'transcript');

                        if (this.speechDebounce) clearTimeout(this.speechDebounce);
                        this.speechDebounce = setTimeout(() => this.finalizeUserSpeech(), SPEECH_DEBOUNCE_MS);
                    }
                },
                (error) => {
                    Logger.error('Sarvam WS Error', error);
                    Sentry.captureException(error, {
                        tags: { stage: 'ws-sarvam-stream', interviewId: this.interviewId ?? 'none', userId: this.userId },
                    });
                    apm.recordCustomEvent('InterviewWsSttError', {
                        interviewId: this.interviewId ?? 'none',
                        userId: this.userId,
                    });
                    if (this.ws.readyState === WebSocket.OPEN) {
                        safeSendJson(this.ws, { type: 'error', message: 'Voice Service Connection Failed (Sarvam)' }, 'control');
                    }
                },
            );

            const currentSarvamWs = this.sarvamWs;
            this.sarvamWs.on('open', () => { this.sarvamConnecting = false; });

            this.sarvamWs.on('close', () => {
                this.sarvamConnecting = false;
                if (currentSarvamWs !== this.sarvamWs) return;
                if (!this.connectionAlive || this.sarvamFailed) return;

                const audioRecentlyActive = (Date.now() - this.lastAudioSentAt) < 10_000;
                if (!audioRecentlyActive) {
                    Logger.info('Sarvam STT closed (no active audio — will reconnect when audio resumes)');
                    return;
                }

                if (this.sarvamReconnectAttempts < SARVAM_MAX_RECONNECT) {
                    this.sarvamReconnectAttempts++;
                    const delay = Math.min(1000 * Math.pow(2, this.sarvamReconnectAttempts - 1), 8000);
                    Logger.warn(`Sarvam STT disconnected. Reconnecting (attempt ${this.sarvamReconnectAttempts}/${SARVAM_MAX_RECONNECT}) in ${delay}ms...`);
                    safeSendJson(this.ws, { type: 'stt_reconnecting', attempt: this.sarvamReconnectAttempts }, 'control');
                    setTimeout(() => {
                        if (this.connectionAlive) this.connectSarvamSTT();
                    }, delay);
                } else {
                    this.sarvamFailed = true;
                    Logger.error('Sarvam STT max reconnect attempts reached');
                    apm.recordCustomEvent('InterviewWsSttMaxReconnectReached', {
                        interviewId: this.interviewId ?? 'none',
                        userId: this.userId,
                    });
                    safeSendJson(this.ws, { type: 'error', message: 'Voice recognition disconnected. Please toggle your microphone to reconnect.' }, 'control');
                }
            });
        } catch (e) {
            this.sarvamConnecting = false;
            Logger.error('Failed to connect Sarvam STT', e);
            Sentry.captureException(e, {
                tags: { stage: 'ws-sarvam-connect', interviewId: this.interviewId ?? 'none', userId: this.userId },
            });
            safeSendJson(this.ws, { type: 'error', message: 'Failed to start voice recognition' }, 'control');
        }
    }
}

// keep `safeSend` referenced so it shows up as a usage in tooling — it is
// imported above but only used via the safeSendJson wrapper in this module.
void safeSend;
