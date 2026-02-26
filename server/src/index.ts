// Load environment variables FIRST - before any other imports
import dotenv from 'dotenv';
dotenv.config();

// Validate environment variables immediately (env singleton is created on import)
import { env } from './config/env';

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { Logger } from './utils/logger';
import { globalLimiter } from './middleware/rateLimit.middleware';
import { AppError } from './utils/appError';

// Initialize Supabase client (after dotenv)
import './config/supabase';

// Import routes (after Supabase is initialized)
import authRoutes from './routes/auth.routes';
import interviewRoutes from './routes/interview.routes';

const app: Express = express();
const port = env.PORT;
const isProduction = env.NODE_ENV === 'production';

// --- Security Middleware ---

// S1: CORS — restrict origins
const allowedOrigins = env.CLIENT_URL
    ? env.CLIENT_URL.split(',').map(o => o.trim())
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
        environment: env.NODE_ENV,
    });
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/interviews', interviewRoutes);

app.get('/', (_req: Request, res: Response) => {
    res.json({
        success: true,
        message: 'OfferFlow API is running',
        version: '1.0.0',
        database: 'Supabase'
    });
});

// 404 catch-all for undefined routes
app.all('*', (req: Request, _res: Response, next: NextFunction) => {
    next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
});

// Global error handler
import { globalErrorHandler } from './middleware/error.middleware';
app.use(globalErrorHandler);

const server = app.listen(port, () => {
    Logger.info(`Server running on port ${port} (${isProduction ? 'production' : 'development'})`);
    Logger.info(`API is ready: OfferFlow (Supabase)`);
});

// --- WebSocket Server for Interview Sessions ---
import { setupWebSocket } from './ws/interviewSession';
setupWebSocket(server);

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
