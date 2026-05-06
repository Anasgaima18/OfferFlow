// Load environment variables FIRST - before any other imports
import dotenv from 'dotenv';
dotenv.config();

import apm from './observability/apm';

// Validate environment variables immediately (env singleton is created on import)
import { config } from './config/env';

import './instrument'; // MUST BE IMPORTED FIRST
import express, { Express, Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { Logger } from './utils/logger';
import { globalLimiter } from './middleware/rateLimit.middleware';
import { AppError } from './utils/appError';
import { enrichNewRelicRequest } from './middleware/observability.middleware';

// Initialize Supabase client (after dotenv)
import './config/supabase';

// Import routes (after Supabase is initialized)
import authRoutes from './routes/auth.routes';
import interviewRoutes from './routes/interview.routes';
import contentRoutes from './routes/content.routes';

// Import Services for DI setup
import { InterviewRepository } from './repositories/InterviewRepository';
import { InterviewService } from './services/interview.service';
import { SarvamService } from './services/sarvam.service';
import { ElevenLabsService } from './services/elevenlabs.service';
import { FeedbackService } from './services/feedback.service';

const app: Express = express();
const PORT = config.PORT;
const isProduction = config.NODE_ENV === 'production';

app.set('trust proxy', 1);

// --- Security Middleware ---


// S1: CORS — restrict origins
const allowedOrigins = config.CLIENT_URL
    ? config.CLIENT_URL.split(',').map(o => o.trim())
    : ['http://localhost:5173'];

if (!isProduction && !allowedOrigins.includes('http://localhost:5173')) {
    allowedOrigins.push('http://localhost:5173');
}

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
    allowedHeaders: ['Content-Type', 'Authorization', 'newrelic', 'traceparent', 'tracestate', 'x-request-id'],
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

// Add request-level New Relic context and custom request events.
app.use(enrichNewRelicRequest);

// S2: Global rate limiter
app.use(globalLimiter);

// R3: Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
        status: 'ok',
        uptime: Math.floor(process.uptime()),
        environment: config.NODE_ENV,
    });
});

// Phase 5: Prometheus metrics endpoint. Optionally protect with a token so
// random scanners can't scrape internal counters in production.
import { registry as metricsRegistry } from './observability/metrics';
const METRICS_TOKEN = process.env.METRICS_TOKEN;
app.get('/metrics', async (req: Request, res: Response) => {
    if (METRICS_TOKEN) {
        const provided = req.headers.authorization?.replace(/^Bearer\s+/i, '') ?? req.query.token;
        if (provided !== METRICS_TOKEN) {
            res.status(401).end('unauthorized');
            return;
        }
    }
    res.set('Content-Type', metricsRegistry.contentType);
    res.send(await metricsRegistry.metrics());
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/interviews', interviewRoutes);
app.use('/api/v1/content', contentRoutes);

app.get('/', (_req: Request, res: Response) => {
    res.json({
        success: true,
        message: 'OfferFlow API is running',
        version: '1.0.0',
        database: 'Supabase'
    });
});

// 404 catch-all for undefined routes
app.use((req: Request, _res: Response, next: NextFunction) => {
    next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
});

// Global error handler
import { globalErrorHandler } from './middleware/error.middleware';

// Sentry error handler must be before any other error middleware
Sentry.setupExpressErrorHandler(app);

// Global Error Handler
app.use(globalErrorHandler);

const server = app.listen(PORT, () => {
    Logger.info(`Server running in ${config.NODE_ENV} mode on port ${PORT}`);
    Logger.info(`API is ready: OfferFlow (Supabase)`);
});

// --- WebSocket Server for Interview Sessions ---
import { setupWebSocket } from './ws/interviewSession';
import { drainAllSessions, activeSessionCount } from './ws/sessionRegistry';
import { startOAuthJanitor } from './services/auth.service';

const interviewRepository = new InterviewRepository();
const sarvamService = new SarvamService();
const elevenLabsService = new ElevenLabsService();
const interviewService = new InterviewService(interviewRepository);
const feedbackService = new FeedbackService(interviewService, sarvamService);

const wss = setupWebSocket(server, interviewService, sarvamService, elevenLabsService, feedbackService);

// F6: Sweep abandoned OAuth exchange entries every minute.
const oauthJanitorHandle = startOAuthJanitor();

// --- R1: Global process error handlers ---
process.on('unhandledRejection', (reason: unknown) => {
    apm.noticeError(new Error('Unhandled Rejection'), {
        reason: reason instanceof Error ? reason.message : String(reason),
    });
    Logger.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error: Error) => {
    apm.noticeError(error);
    Logger.error('Uncaught Exception:', error);
    process.exit(1);
});

/**
 * F15: Graceful shutdown that actually drains active interview WebSockets.
 *
 * Render's rolling deploys send SIGTERM and wait ~30s before SIGKILL.
 * Previously `server.close()` only stopped accepting NEW HTTP connections;
 * existing WS sessions stayed open until the kernel reaped them — meaning
 * mid-interview candidates lost everything on every deploy.
 *
 * We now:
 *   1. Stop the WSS from accepting new upgrades.
 *   2. Notify each active session and run its cleanup (which flushes the
 *      pending transcript queue and marks the interview completed).
 *   3. Close all sockets with code 1012 (Service Restart) so the client
 *      shows a "reconnecting" UI rather than a generic error.
 *   4. Then close the HTTP server.
 */
const SHUTDOWN_TIMEOUT_MS = Number(process.env.SHUTDOWN_TIMEOUT_MS || 25_000);

let shuttingDown = false;
const gracefulShutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    Logger.info(`${signal} received — shutting down gracefully (active sessions=${activeSessionCount()})...`);

    clearInterval(oauthJanitorHandle);

    try {
        wss.close(() => Logger.info('WSS closed (no new upgrades)'));
        await drainAllSessions(`server_${signal.toLowerCase()}`, SHUTDOWN_TIMEOUT_MS - 5_000);
    } catch (e) {
        Logger.error('[shutdown] drain error', e);
    }

    server.close(() => {
        Logger.info('HTTP server closed');
        process.exit(0);
    });

    setTimeout(() => {
        Logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
};

process.on('SIGTERM', () => { void gracefulShutdown('SIGTERM'); });
process.on('SIGINT', () => { void gracefulShutdown('SIGINT'); });
