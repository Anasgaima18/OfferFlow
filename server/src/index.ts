// Load environment variables FIRST - before any other imports
import dotenv from 'dotenv';
dotenv.config();

// Validate environment variables immediately
import { validateEnv } from './config/env';
validateEnv();

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { Logger } from './utils/logger';
import { globalLimiter } from './middleware/rateLimit.middleware';

// Initialize Supabase client (after dotenv)
import './config/supabase';

// Import routes (after Supabase is initialized)
import authRoutes from './routes/auth.routes';
import interviewRoutes from './routes/interview.routes';

const app: Express = express();
const port = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

// --- Security Middleware ---

// S1: CORS — restrict origins
const allowedOrigins = process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(',').map(o => o.trim())
    : ['http://localhost:5173'];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, server-to-server)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// S3: Helmet hardening
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'", 'wss:', 'https:'],
        },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// P1: Compression
app.use(compression());

// S6: Morgan — production uses combined format, skip 2xx
if (isProduction) {
    app.use(morgan('combined', {
        skip: (_req, res) => res.statusCode < 400,
    }));
} else {
    app.use(morgan('dev'));
}

// Body parsing with size limit
app.use(express.json({ limit: '1mb' }));

// S2: Global rate limiter
app.use(globalLimiter);

// R3: Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
        status: 'ok',
        uptime: Math.floor(process.uptime()),
        environment: process.env.NODE_ENV || 'development',
    });
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/interviews', interviewRoutes);

app.get('/', (req: Request, res: Response) => {
    res.json({
        success: true,
        message: 'OfferFlow API is running',
        version: '1.0.0',
        database: 'Supabase'
    });
});

// Global error handler - must be registered BEFORE server starts
import { globalErrorHandler } from './middleware/error.middleware';
app.use(globalErrorHandler);

const server = app.listen(port, () => {
    Logger.info(`Server running on port ${port} (${isProduction ? 'production' : 'development'})`);
    Logger.info(`API is ready: OfferFlow (Supabase)`);
});

// WebSocket Server for Conversation Loop
import WebSocket, { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { URL } from 'url';
import { sarvamService } from './services/sarvam.service';
import { elevenLabsService } from './services/elevenlabs.service';
import { interviewService } from './services/interview.service';
import { feedbackService } from './services/feedback.service';

const wss = new WebSocketServer({ server, path: '/api/v1/interviews/ws' });

const MAX_CONVERSATION_HISTORY = 20;
const HEARTBEAT_INTERVAL_MS = 30_000;
const SARVAM_MAX_RECONNECT = 3;
const DEFAULT_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // Sarah - natural conversational voice
const WS_AUTH_TIMEOUT_MS = 10_000;

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

wss.on('connection', async (ws, req) => {
    Logger.info('Client attempting to connect to Interview Room');

    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const interviewId = url.searchParams.get('interviewId');

    // --- First-message authentication (token NOT in URL to prevent logging/exposure) ---
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

    if (!authMessage) return; // Client disconnected before auth

    let userId: string;

    try {
        const authData = JSON.parse(authMessage);
        if (authData.type !== 'auth' || !authData.token) {
            ws.send(JSON.stringify({ type: 'error', message: 'First message must be { type: "auth", token: "..." }' }));
            ws.close(4001, 'Unauthorized');
            return;
        }

        if (!process.env.JWT_SECRET) {
            ws.send(JSON.stringify({ type: 'error', message: 'Server configuration error' }));
            ws.close(4500, 'Server error');
            return;
        }

        const decoded = jwt.verify(authData.token, process.env.JWT_SECRET) as { id: string };
        userId = decoded.id;
        Logger.info(`WebSocket authenticated for user: ${userId}, interview: ${interviewId}`);
    } catch (err) {
        Logger.error('WebSocket auth failed', err);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid or expired token' }));
        ws.close(4001, 'Unauthorized');
        return;
    }

    ws.send(JSON.stringify({ type: 'auth_success' }));

    // --- B1: Load interview record and build dynamic system prompt ---
    let interviewType = 'technical';
    if (interviewId) {
        try {
            const interviewRecord = await interviewService.getInterviewById(interviewId);
            if (interviewRecord) {
                // Authorization: verify interview belongs to authenticated user
                if (interviewRecord.user_id !== userId) {
                    ws.send(JSON.stringify({ type: 'error', message: 'Forbidden: interview does not belong to you' }));
                    ws.close(4003, 'Forbidden');
                    return;
                }
                interviewType = interviewRecord.type;
            }
            await interviewService.updateInterview(interviewId, { status: 'in-progress' });
            Logger.info(`Interview ${interviewId} (${interviewType}) status set to in-progress`);
        } catch (e) {
            Logger.warn(`Could not load/update interview: ${(e as Error).message}`);
        }
    }

    // --- B6: Duration tracking ---
    const startedAt = Date.now();

    // Conversation State with dynamic system prompt
    let conversationHistory: { role: string; content: string }[] = [
        { role: 'system', content: getSystemPrompt(interviewType) }
    ];
    let isProcessingAI = false;
    let greetingDone = false; // true after AI greeting is in conversationHistory
    let ttsStream: { sendText: (text: string, flush?: boolean) => void; close: () => void; } | null = null;
    let sarvamWs: WebSocket | null = null;
    let connectionAlive = true;
    let hasTranscript = false;

    // --- B3: Heartbeat keepalive ---
    let isAlive = true;
    const heartbeatInterval = setInterval(() => {
        if (!isAlive) {
            Logger.warn('Client heartbeat timeout — terminating connection');
            clearInterval(heartbeatInterval);
            ws.terminate();
            return;
        }
        isAlive = false;
        ws.ping();
    }, HEARTBEAT_INTERVAL_MS);

    ws.on('pong', () => {
        isAlive = true;
    });

    // Limit conversation history — preserve system prompt + initial user/assistant pair
    const trimHistory = () => {
        // Keep: [0]=system, [1]=synthetic user, [2]=greeting assistant, then last N messages
        const KEEP_PREFIX = 3;
        if (conversationHistory.length > KEEP_PREFIX + MAX_CONVERSATION_HISTORY) {
            conversationHistory = [
                ...conversationHistory.slice(0, KEEP_PREFIX),
                ...conversationHistory.slice(-(MAX_CONVERSATION_HISTORY))
            ];
        }
    };

    // Accumulate TTS chunks, send complete audio
    const speakText = (text: string) => {
        if (!connectionAlive || ws.readyState !== ws.OPEN) return;

        try {
            if (ttsStream) {
                try { ttsStream.close(); } catch(e) { /* ignore */ }
                ttsStream = null;
            }

            const audioChunks: Buffer[] = [];

            ttsStream = elevenLabsService.createStreamingTTS(
                DEFAULT_VOICE_ID,
                (chunk) => {
                    audioChunks.push(chunk);
                },
                () => {
                    if (audioChunks.length > 0 && ws.readyState === ws.OPEN) {
                        const fullAudio = Buffer.concat(audioChunks);
                        ws.send(JSON.stringify({ audio: fullAudio.toString('base64') }));
                        Logger.info(`TTS Complete: sent ${fullAudio.length} bytes of audio`);
                    }
                },
                (err) => {
                    Logger.error('TTS Stream Error', err);
                    if (audioChunks.length > 0 && ws.readyState === ws.OPEN) {
                        const partialAudio = Buffer.concat(audioChunks);
                        ws.send(JSON.stringify({ audio: partialAudio.toString('base64') }));
                    }
                }
            );

            ttsStream.sendText(text, true);
        } catch (e) {
            Logger.error('Failed to speak text via TTS', e);
        }
    };

    // --- B4: Sarvam STT connection with lazy-connect & auto-reconnect ---
    let sarvamReconnectAttempts = 0;
    let sarvamConnecting = false;
    let sarvamFailed = false; // true when max reconnects exhausted — reset on mic toggle
    let lastAudioSentAt = 0;

    // Speech finalization: accumulate transcript segments, finalize on VAD END_SPEECH or silence debounce
    let pendingUserText = '';
    let speechDebounce: ReturnType<typeof setTimeout> | null = null;
    const SPEECH_DEBOUNCE_MS = 2000;

    const finalizeUserSpeech = async () => {
        if (speechDebounce) { clearTimeout(speechDebounce); speechDebounce = null; }
        const userText = pendingUserText.trim();
        pendingUserText = '';

        if (!userText || userText.length < 2 || isProcessingAI || !greetingDone || ws.readyState !== ws.OPEN) return;

        isProcessingAI = true;

        // Send final transcript to client
        ws.send(JSON.stringify({ transcript: userText, isFinal: true, speaker: 'user' }));

        conversationHistory.push({ role: 'user', content: userText });
        trimHistory();

        // Save user transcript
        if (interviewId) {
            interviewService.addTranscriptMessage(interviewId, 'user', userText)
                .catch(e => Logger.error('Failed to save user transcript', e));
            hasTranscript = true;
        }

        // Notify client AI is thinking
        ws.send(JSON.stringify({ type: 'ai_thinking' }));

        try {
            const aiResponse = await sarvamService.generateResponse(conversationHistory);
            conversationHistory.push({ role: 'assistant', content: aiResponse });
            trimHistory();
            Logger.info(`AI Response: "${aiResponse.substring(0, 80)}..."`);

            // Save AI transcript
            if (interviewId) {
                interviewService.addTranscriptMessage(interviewId, 'ai', aiResponse)
                    .catch(e => Logger.error('Failed to save AI transcript', e));
            }

            // Notify client AI is done thinking
            ws.send(JSON.stringify({ type: 'ai_done' }));

            // Send transcript
            ws.send(JSON.stringify({ transcript: aiResponse, isFinal: true, speaker: 'ai' }));

            // Speak via TTS
            speakText(aiResponse);

        } catch (err) {
            Logger.error('AI Processing Error', err);
            ws.send(JSON.stringify({ type: 'ai_done' }));
            ws.send(JSON.stringify({ type: 'error', message: 'AI Processing Failed' }));
        } finally {
            isProcessingAI = false;
        }
    };

    const connectSarvamSTT = () => {
        if (sarvamConnecting) return;
        sarvamConnecting = true;
        try {
            sarvamWs = sarvamService.startStreamingSTT(
                async (data) => {
                    if (ws.readyState !== ws.OPEN) return;

                    // Reset reconnect counter on successful data
                    sarvamReconnectAttempts = 0;

                    // Handle VAD events (END_SPEECH triggers immediate finalization)
                    if (data._event) {
                        if (data.signal_type === 'END_SPEECH' && pendingUserText.trim()) {
                            Logger.info('VAD: END_SPEECH — finalizing user speech');
                            await finalizeUserSpeech();
                        }
                        return;
                    }

                    // Handle transcript segments
                    if (data.transcript && data.transcript.trim()) {
                        pendingUserText += (pendingUserText ? ' ' : '') + data.transcript.trim();

                        // Send partial transcript to client (for live display)
                        ws.send(JSON.stringify({ transcript: pendingUserText, isFinal: false, speaker: 'user' }));

                        // Reset debounce — finalize after sustained silence
                        if (speechDebounce) clearTimeout(speechDebounce);
                        speechDebounce = setTimeout(() => {
                            finalizeUserSpeech();
                        }, SPEECH_DEBOUNCE_MS);
                    }
                },
                (error) => {
                    Logger.error('Sarvam WS Error', error);
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'error', message: 'Voice Service Connection Failed (Sarvam)' }));
                    }
                }
            );

            // B4: Listen for Sarvam WS close and attempt reconnect
            const currentSarvamWs = sarvamWs;

            sarvamWs.on('open', () => {
                sarvamConnecting = false;
            });

            sarvamWs.on('close', () => {
                sarvamConnecting = false;
                // Only handle close for the CURRENT connection (not stale ones)
                if (currentSarvamWs !== sarvamWs) return;
                if (!connectionAlive || sarvamFailed) return;

                // Only auto-reconnect if audio was recently active (within 10s)
                const audioRecentlyActive = (Date.now() - lastAudioSentAt) < 10_000;
                if (!audioRecentlyActive) {
                    Logger.info('Sarvam STT closed (no active audio — will reconnect when audio resumes)');
                    return;
                }

                if (sarvamReconnectAttempts < SARVAM_MAX_RECONNECT) {
                    sarvamReconnectAttempts++;
                    const delay = Math.min(1000 * Math.pow(2, sarvamReconnectAttempts - 1), 8000);
                    Logger.warn(`Sarvam STT disconnected. Reconnecting (attempt ${sarvamReconnectAttempts}/${SARVAM_MAX_RECONNECT}) in ${delay}ms...`);
                    if (ws.readyState === ws.OPEN) {
                        ws.send(JSON.stringify({ type: 'stt_reconnecting', attempt: sarvamReconnectAttempts }));
                    }
                    setTimeout(() => {
                        if (connectionAlive) connectSarvamSTT();
                    }, delay);
                } else {
                    sarvamFailed = true;
                    Logger.error('Sarvam STT max reconnect attempts reached');
                    if (ws.readyState === ws.OPEN) {
                        ws.send(JSON.stringify({ type: 'error', message: 'Voice recognition disconnected. Please toggle your microphone to reconnect.' }));
                    }
                }
            });

        } catch (e) {
            sarvamConnecting = false;
            Logger.error('Failed to connect Sarvam STT', e);
            if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({ type: 'error', message: 'Failed to start voice recognition' }));
            }
        }
    };

    try {
        // Sarvam STT is lazy-connected: established when first audio chunk arrives

        // --- B2: AI Auto-Greeting on connect ---
        (async () => {
            try {
                // Sarvam chat requires first message after system to be 'user' role
                conversationHistory.push({ role: 'user', content: 'Hello, I am ready for the interview.' });
                const greetingResponse = await sarvamService.generateResponse(conversationHistory);
                conversationHistory.push({ role: 'assistant', content: greetingResponse });
                greetingDone = true;
                Logger.info(`AI Greeting: "${greetingResponse.substring(0, 80)}..."`);

                if (interviewId) {
                    interviewService.addTranscriptMessage(interviewId, 'ai', greetingResponse)
                        .catch(e => Logger.error('Failed to save greeting transcript', e));
                    hasTranscript = true;
                }

                if (ws.readyState === ws.OPEN) {
                    ws.send(JSON.stringify({ transcript: greetingResponse, isFinal: true, speaker: 'ai' }));
                    speakText(greetingResponse);
                }
            } catch (err) {
                Logger.error('Failed to generate AI greeting', err);
            }
        })();

        ws.on('message', (message) => {
            if (Buffer.isBuffer(message)) {
                lastAudioSentAt = Date.now();

                // Lazy-connect: establish Sarvam STT when first audio arrives
                if (!sarvamWs && !sarvamConnecting && !sarvamFailed) {
                    sarvamReconnectAttempts = 0;
                    connectSarvamSTT();
                    return; // first few chunks are lost while connecting — acceptable for STT
                }

                // If Sarvam is closed/closing, don't trigger reconnect from here —
                // the close handler manages retries with exponential backoff.
                if (!sarvamWs || sarvamWs.readyState !== WebSocket.OPEN) {
                    return;
                }

                sarvamService.sendAudio(sarvamWs, message);
            } else {
                try {
                    const parsed = JSON.parse(message.toString());
                    if (parsed.type === 'ping') {
                        ws.send(JSON.stringify({ type: 'pong' }));
                    }
                    // Allow client to reset STT (e.g., after mic toggle)
                    if (parsed.type === 'reset_stt') {
                        sarvamFailed = false;
                        sarvamReconnectAttempts = 0;
                        if (sarvamWs) try { sarvamWs.close(); } catch(e) { /* ignore */ }
                        sarvamWs = null;
                        Logger.info('STT reset by client — will reconnect on next audio');
                    }
                } catch (e) {
                    // Ignore parse errors for non-JSON messages
                }
            }
        });

        ws.on('close', async () => {
            connectionAlive = false;
            clearInterval(heartbeatInterval);
            if (speechDebounce) clearTimeout(speechDebounce);
            Logger.info('Client Disconnected - Cleaning up');
            if (sarvamWs) try { sarvamWs.close(); } catch (e) { /* ignore */ }
            if (ttsStream) try { ttsStream.close(); } catch (e) { /* ignore */ }

            if (interviewId && hasTranscript) {
                // --- B6: Compute duration ---
                const durationMs = Date.now() - startedAt;
                const durationMin = Math.round(durationMs / 60000);

                try {
                    await interviewService.updateInterview(interviewId, { status: 'completed' });
                    Logger.info(`Interview ${interviewId} completed (${durationMin} min)`);
                } catch (e) {
                    Logger.error('Failed to update interview status on disconnect', e);
                }

                // --- B5: Auto-generate feedback ---
                try {
                    Logger.info(`Auto-generating feedback for interview ${interviewId}...`);
                    await feedbackService.generateFeedback(interviewId);
                    Logger.info(`Feedback generated for interview ${interviewId}`);
                } catch (e) {
                    Logger.error('Failed to auto-generate feedback', e);
                }
            }
        });

    } catch (e: any) {
        Logger.error('Failed to init Interview Session', e);
        clearInterval(heartbeatInterval);
        ws.send(JSON.stringify({ type: 'error', message: e.message || 'Server setup failed' }));
        setTimeout(() => ws.close(), 100);
    }
});

// --- R1: Global process error handlers ---
process.on('unhandledRejection', (reason: unknown) => {
    Logger.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error: Error) => {
    Logger.error('Uncaught Exception:', error);
    process.exit(1);
});

// --- R2: Graceful shutdown ---
const gracefulShutdown = (signal: string) => {
    Logger.info(`${signal} received — shutting down gracefully...`);

    // Close all WebSocket connections
    wss.clients.forEach((client) => {
        client.close(1001, 'Server shutting down');
    });

    server.close(() => {
        Logger.info('HTTP server closed');
        process.exit(0);
    });

    // Force exit after 10s
    setTimeout(() => {
        Logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10_000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
