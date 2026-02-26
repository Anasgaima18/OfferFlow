import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { URL } from 'url';
import { Logger } from '../utils/logger';
import { sarvamService } from '../services/sarvam.service';
import { elevenLabsService } from '../services/elevenlabs.service';
import { interviewService } from '../services/interview.service';
import { feedbackService } from '../services/feedback.service';
import { env } from '../config/env';

// --- Constants ---
const MAX_CONVERSATION_HISTORY = 20;
const HEARTBEAT_INTERVAL_MS = 30_000;
const SARVAM_MAX_RECONNECT = 3;
const DEFAULT_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // Sarah - natural conversational voice
const WS_AUTH_TIMEOUT_MS = 10_000;
const SPEECH_DEBOUNCE_MS = 2000;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// --- B1: Dynamic system prompts per interview type ---
function getSystemPrompt(interviewType: string): string {
    const rules = `RULES:
1. You MUST respond ONLY in English. Do NOT use Hindi, Hinglish, or any other language.
2. You are a STRICT evaluator. If the candidate gives a wrong, vague, or incomplete answer, point out the mistake clearly and ask them to think again. Do NOT agree with incorrect answers. Challenge weak reasoning.
3. Ask one question at a time. Keep responses concise (2-4 sentences).
4. After the candidate answers, briefly evaluate their answer (correct/incorrect/partially correct) before moving on.`;

    switch (interviewType) {
        case 'behavioral':
            return `${rules}\n\nYou are a professional behavioral interviewer at a top tech company. Conduct a behavioral interview using the STAR method (Situation, Task, Action, Result). Ask about leadership, teamwork, conflict resolution, and decision-making. If the candidate gives a generic or superficial answer, probe deeper — ask for specific examples, numbers, outcomes, and lessons learned. Start by welcoming the candidate warmly and asking your first behavioral question.`;
        case 'system-design':
            return `${rules}\n\nYou are a senior systems architect conducting a system design interview at a top tech company. Ask the candidate to design a real-world system (e.g., URL shortener, chat application, news feed). Probe their understanding of scalability, load balancing, database choices, caching, API design, and trade-offs. If they make incorrect assumptions or miss important considerations, point it out and ask them to reconsider. Guide them step-by-step. Start by welcoming the candidate and presenting the design problem.`;
        case 'technical':
        default:
            return `${rules}\n\nYou are a professional technical interviewer at a top tech company. Conduct a coding interview. Ask one clear coding question at a time. Evaluate the candidate's problem-solving approach, code quality, time/space complexity, and edge cases. If the candidate's solution is wrong or suboptimal, tell them what's wrong and ask them to fix it. Do NOT accept incorrect solutions. Start by welcoming the candidate and asking your first coding question.`;
    }
}

/**
 * Sets up the WebSocket server for real-time interview sessions.
 * Handles authentication, STT (Sarvam), TTS (ElevenLabs), and AI conversation.
 */
export function setupWebSocket(server: http.Server): WebSocketServer {
    const wss = new WebSocketServer({ server, path: '/api/v1/interviews/ws' });

    wss.on('connection', async (ws, req) => {
        Logger.info('Client attempting to connect to Interview Room');

        const url = new URL(req.url || '', `http://${req.headers.host}`);
        const interviewId = url.searchParams.get('interviewId');

        // Validate interviewId format (UUID) if provided
        if (interviewId && !UUID_REGEX.test(interviewId)) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid interview ID format' }));
            ws.close(4000, 'Invalid interviewId');
            return;
        }

        // --- First-message authentication (token NOT in URL to prevent logging/exposure) ---
        const userId = await authenticateClient(ws);
        if (!userId) return; // Client was disconnected or auth failed

        ws.send(JSON.stringify({ type: 'auth_success' }));

        // --- B1: Load interview record and build dynamic system prompt ---
        const interviewType = await initializeInterview(ws, interviewId, userId);
        if (interviewType === null) return; // Forbidden or error

        // --- Start interview session ---
        const session = new InterviewSession(ws, interviewId, userId, interviewType);
        session.start();
    });

    return wss;
}

/**
 * Authenticates the WebSocket client via a first-message JWT token.
 * Returns the userId on success, or null on failure.
 */
async function authenticateClient(ws: WebSocket): Promise<string | null> {
    const authTimeout = setTimeout(() => {
        ws.send(JSON.stringify({ type: 'error', message: 'Authentication timeout — send { type: "auth", token: "..." } within 10s' }));
        ws.close(4001, 'Auth timeout');
    }, WS_AUTH_TIMEOUT_MS);

    const authMessage = await new Promise<string | null>((resolve) => {
        ws.once('message', (msg) => {
            clearTimeout(authTimeout);
            resolve(msg.toString());
        });
        ws.once('close', () => {
            clearTimeout(authTimeout);
            resolve(null);
        });
    });

    if (!authMessage) return null;

    try {
        const authData = JSON.parse(authMessage);
        if (authData.type !== 'auth' || !authData.token) {
            ws.send(JSON.stringify({ type: 'error', message: 'First message must be { type: "auth", token: "..." }' }));
            ws.close(4001, 'Unauthorized');
            return null;
        }

        const decoded = jwt.verify(authData.token, env.JWT_SECRET) as { id: string };
        Logger.info(`WebSocket authenticated for user: ${decoded.id}`);
        return decoded.id;
    } catch (err) {
        Logger.error('WebSocket auth failed', err);
        const message = err instanceof jwt.TokenExpiredError
            ? 'Token expired'
            : 'Invalid or expired token';
        ws.send(JSON.stringify({ type: 'error', message }));
        ws.close(4001, 'Unauthorized');
        return null;
    }
}

/**
 * Loads the interview record and verifies ownership.
 * Returns the interview type on success, or null on failure.
 */
async function initializeInterview(ws: WebSocket, interviewId: string | null, userId: string): Promise<string | null> {
    let interviewType = 'technical';

    if (interviewId) {
        try {
            const interviewRecord = await interviewService.getInterviewById(interviewId);
            if (interviewRecord) {
                if (interviewRecord.user_id !== userId) {
                    ws.send(JSON.stringify({ type: 'error', message: 'Forbidden: interview does not belong to you' }));
                    ws.close(4003, 'Forbidden');
                    return null;
                }
                interviewType = interviewRecord.type;
            }
            await interviewService.updateInterview(interviewId, { status: 'in-progress' });
            Logger.info(`Interview ${interviewId} (${interviewType}) status set to in-progress`);
        } catch (e) {
            Logger.warn(`Could not load/update interview: ${(e as Error).message}`);
        }
    }

    return interviewType;
}

/**
 * Encapsulates the state and logic for a single interview WebSocket session.
 */
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

    constructor(ws: WebSocket, interviewId: string | null, userId: string, interviewType: string) {
        this.ws = ws;
        this.interviewId = interviewId;
        this.userId = userId;
        this.startedAt = Date.now();
        this.conversationHistory = [
            { role: 'system', content: getSystemPrompt(interviewType) }
        ];

        // B3: Heartbeat keepalive
        this.heartbeatInterval = setInterval(() => {
            if (!this.isAlive) {
                Logger.warn('Client heartbeat timeout — terminating connection');
                clearInterval(this.heartbeatInterval);
                this.ws.terminate();
                return;
            }
            this.isAlive = false;
            this.ws.ping();
        }, HEARTBEAT_INTERVAL_MS);

        this.ws.on('pong', () => { this.isAlive = true; });
    }

    start(): void {
        this.sendGreeting();
        this.ws.on('message', (message) => this.handleMessage(message));
        this.ws.on('close', () => this.handleDisconnect());
    }

    // --- B2: AI Auto-Greeting on connect ---
    private async sendGreeting(): Promise<void> {
        try {
            this.conversationHistory.push({ role: 'user', content: 'Hello, I am ready for the interview.' });
            const greetingResponse = await sarvamService.generateResponse(this.conversationHistory);
            this.conversationHistory.push({ role: 'assistant', content: greetingResponse });
            this.greetingDone = true;
            Logger.info(`AI Greeting: "${greetingResponse.substring(0, 80)}..."`);

            if (this.interviewId) {
                interviewService.addTranscriptMessage(this.interviewId, 'ai', greetingResponse)
                    .catch(e => Logger.error('Failed to save greeting transcript', e));
                this.hasTranscript = true;
            }

            if (this.ws.readyState === this.ws.OPEN) {
                this.ws.send(JSON.stringify({ transcript: greetingResponse, isFinal: true, speaker: 'ai' }));
                this.speakText(greetingResponse);
            }
        } catch (err) {
            Logger.error('Failed to generate AI greeting', err);
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
        this.lastAudioSentAt = Date.now();

        // Lazy-connect: establish Sarvam STT when first audio arrives
        if (!this.sarvamWs && !this.sarvamConnecting && !this.sarvamFailed) {
            this.sarvamReconnectAttempts = 0;
            this.connectSarvamSTT();
            return; // first few chunks are lost while connecting — acceptable for STT
        }

        if (!this.sarvamWs || this.sarvamWs.readyState !== WebSocket.OPEN) return;
        sarvamService.sendAudio(this.sarvamWs, audioData);
    }

    private handleTextMessage(message: WebSocket.RawData): void {
        try {
            const parsed = JSON.parse(message.toString());
            if (parsed.type === 'ping') {
                this.ws.send(JSON.stringify({ type: 'pong' }));
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

    private async handleDisconnect(): Promise<void> {
        this.connectionAlive = false;
        clearInterval(this.heartbeatInterval);
        if (this.speechDebounce) clearTimeout(this.speechDebounce);
        Logger.info('Client Disconnected - Cleaning up');
        if (this.sarvamWs) try { this.sarvamWs.close(); } catch { /* ignore */ }
        if (this.ttsStream) try { this.ttsStream.close(); } catch { /* ignore */ }

        if (this.interviewId && this.hasTranscript) {
            const durationMs = Date.now() - this.startedAt;
            const durationMin = Math.round(durationMs / 60000);

            try {
                await interviewService.updateInterview(this.interviewId, { status: 'completed' });
                Logger.info(`Interview ${this.interviewId} completed (${durationMin} min)`);
            } catch (e) {
                Logger.error('Failed to update interview status on disconnect', e);
            }

            // B5: Auto-generate feedback
            try {
                Logger.info(`Auto-generating feedback for interview ${this.interviewId}...`);
                await feedbackService.generateFeedback(this.interviewId);
                Logger.info(`Feedback generated for interview ${this.interviewId}`);
            } catch (e) {
                Logger.error('Failed to auto-generate feedback', e);
            }
        }
    }

    // --- Conversation history management ---
    private trimHistory(): void {
        const KEEP_PREFIX = 3;
        if (this.conversationHistory.length > KEEP_PREFIX + MAX_CONVERSATION_HISTORY) {
            this.conversationHistory = [
                ...this.conversationHistory.slice(0, KEEP_PREFIX),
                ...this.conversationHistory.slice(-MAX_CONVERSATION_HISTORY)
            ];
        }
    }

    // --- TTS ---
    private speakText(text: string): void {
        if (!this.connectionAlive || this.ws.readyState !== this.ws.OPEN) return;

        try {
            if (this.ttsStream) {
                try { this.ttsStream.close(); } catch { /* ignore */ }
                this.ttsStream = null;
            }

            const audioChunks: Buffer[] = [];

            this.ttsStream = elevenLabsService.createStreamingTTS(
                DEFAULT_VOICE_ID,
                (chunk) => { audioChunks.push(chunk); },
                () => {
                    if (audioChunks.length > 0 && this.ws.readyState === this.ws.OPEN) {
                        const fullAudio = Buffer.concat(audioChunks);
                        this.ws.send(JSON.stringify({ audio: fullAudio.toString('base64') }));
                        Logger.info(`TTS Complete: sent ${fullAudio.length} bytes of audio`);
                    }
                },
                (err) => {
                    Logger.error('TTS Stream Error', err);
                    if (audioChunks.length > 0 && this.ws.readyState === this.ws.OPEN) {
                        const partialAudio = Buffer.concat(audioChunks);
                        this.ws.send(JSON.stringify({ audio: partialAudio.toString('base64') }));
                    }
                }
            );

            this.ttsStream.sendText(text, true);
        } catch (e) {
            Logger.error('Failed to speak text via TTS', e);
        }
    }

    // --- Speech finalization ---
    private async finalizeUserSpeech(): Promise<void> {
        if (this.speechDebounce) { clearTimeout(this.speechDebounce); this.speechDebounce = null; }
        const userText = this.pendingUserText.trim();
        this.pendingUserText = '';

        if (!userText || userText.length < 2 || this.isProcessingAI || !this.greetingDone || this.ws.readyState !== this.ws.OPEN) return;

        this.isProcessingAI = true;

        this.ws.send(JSON.stringify({ transcript: userText, isFinal: true, speaker: 'user' }));
        this.conversationHistory.push({ role: 'user', content: userText });
        this.trimHistory();

        if (this.interviewId) {
            interviewService.addTranscriptMessage(this.interviewId, 'user', userText)
                .catch(e => Logger.error('Failed to save user transcript', e));
            this.hasTranscript = true;
        }

        this.ws.send(JSON.stringify({ type: 'ai_thinking' }));

        try {
            const aiResponse = await sarvamService.generateResponse(this.conversationHistory);
            this.conversationHistory.push({ role: 'assistant', content: aiResponse });
            this.trimHistory();
            Logger.info(`AI Response: "${aiResponse.substring(0, 80)}..."`);

            if (this.interviewId) {
                interviewService.addTranscriptMessage(this.interviewId, 'ai', aiResponse)
                    .catch(e => Logger.error('Failed to save AI transcript', e));
            }

            this.ws.send(JSON.stringify({ type: 'ai_done' }));
            this.ws.send(JSON.stringify({ transcript: aiResponse, isFinal: true, speaker: 'ai' }));
            this.speakText(aiResponse);
        } catch (err) {
            Logger.error('AI Processing Error', err);
            this.ws.send(JSON.stringify({ type: 'ai_done' }));
            this.ws.send(JSON.stringify({ type: 'error', message: 'AI Processing Failed' }));
        } finally {
            this.isProcessingAI = false;
        }
    }

    // --- B4: Sarvam STT connection with lazy-connect & auto-reconnect ---
    private connectSarvamSTT(): void {
        if (this.sarvamConnecting) return;
        this.sarvamConnecting = true;

        try {
            this.sarvamWs = sarvamService.startStreamingSTT(
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
                        this.ws.send(JSON.stringify({ transcript: this.pendingUserText, isFinal: false, speaker: 'user' }));

                        if (this.speechDebounce) clearTimeout(this.speechDebounce);
                        this.speechDebounce = setTimeout(() => {
                            this.finalizeUserSpeech();
                        }, SPEECH_DEBOUNCE_MS);
                    }
                },
                (error) => {
                    Logger.error('Sarvam WS Error', error);
                    if (this.ws.readyState === WebSocket.OPEN) {
                        this.ws.send(JSON.stringify({ type: 'error', message: 'Voice Service Connection Failed (Sarvam)' }));
                    }
                }
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
                    if (this.ws.readyState === this.ws.OPEN) {
                        this.ws.send(JSON.stringify({ type: 'stt_reconnecting', attempt: this.sarvamReconnectAttempts }));
                    }
                    setTimeout(() => {
                        if (this.connectionAlive) this.connectSarvamSTT();
                    }, delay);
                } else {
                    this.sarvamFailed = true;
                    Logger.error('Sarvam STT max reconnect attempts reached');
                    if (this.ws.readyState === this.ws.OPEN) {
                        this.ws.send(JSON.stringify({ type: 'error', message: 'Voice recognition disconnected. Please toggle your microphone to reconnect.' }));
                    }
                }
            });
        } catch (e) {
            this.sarvamConnecting = false;
            Logger.error('Failed to connect Sarvam STT', e);
            if (this.ws.readyState === this.ws.OPEN) {
                this.ws.send(JSON.stringify({ type: 'error', message: 'Failed to start voice recognition' }));
            }
        }
    }
}
