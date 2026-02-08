<div align="center">

# OfferFlow

### AI-Powered Mock Interview Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)](#docker-deployment)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](CONTRIBUTING.md)

**OfferFlow** is a production-grade, AI-powered mock interview platform that simulates realistic technical interviews through real-time voice conversations, integrated code execution, and comprehensive performance analytics.

[Getting Started](#getting-started) · [Architecture](#architecture) · [API Reference](#api-reference) · [Deployment](#deployment) · [Contributing](#contributing)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Development](#development)
- [Deployment](#deployment)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

OfferFlow enables candidates to practice technical, behavioral, and system design interviews with an AI interviewer that listens, responds, and evaluates in real time. The platform combines voice AI (Sarvam STT + ElevenLabs TTS), a full-featured Monaco code editor with 40+ language support, and data-driven analytics — all delivered through a modern React SPA backed by a hardened Express API.

## Key Features

| Category | Capabilities |
|---|---|
| **Voice Interviews** | Real-time bidirectional audio streaming via WebSocket, Sarvam AI speech-to-text, ElevenLabs text-to-speech, low-latency PCM AudioWorklet capture |
| **Code Editor** | Monaco Editor (40+ languages), live code execution, syntax highlighting, IntelliSense, console output panel |
| **Analytics** | Per-interview scoring, transcript history, performance trends, personalized feedback reports |
| **Gamification** | Daily coding challenges, achievement badges, global leaderboard, skill-based ranking system |
| **Authentication** | JWT-based auth with bcrypt password hashing, protected routes, session management, Supabase Row Level Security |
| **Infrastructure** | Docker Compose orchestration, Nginx reverse proxy, health checks, graceful shutdown, structured logging |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (React SPA)                       │
│  React 19 · TypeScript · Vite · TailwindCSS 4 · Monaco Editor  │
│                     Port 5173 (dev) / 80 (prod)                 │
└──────────────────┬────────────────────┬─────────────────────────┘
                   │  REST (HTTP/S)     │  WebSocket (WS/WSS)
                   ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Server (Express 5 API)                      │
│  Node.js · TypeScript · JWT · Helmet · Rate Limiting · Winston  │
│                          Port 5000                              │
├─────────────┬─────────────┬─────────────┬───────────────────────┤
│  Auth       │  Interview  │  Code Exec  │  Feedback             │
│  Controller │  Controller │  Controller │  Service              │
└──────┬──────┴──────┬──────┴─────────────┴───────────────────────┘
       │             │            │                │
       ▼             ▼            ▼                ▼
┌────────────┐ ┌──────────┐ ┌──────────┐  ┌──────────────┐
│  Supabase  │ │ Sarvam   │ │ Eleven   │  │  External    │
│ PostgreSQL │ │ AI (STT) │ │ Labs     │  │  Code Runner │
│  + RLS     │ │          │ │ (TTS)    │  │              │
└────────────┘ └──────────┘ └──────────┘  └──────────────┘
```

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 19.2.0 | Component-based UI framework |
| TypeScript | 5.9.3 | Static type checking |
| Vite | 7.2.4 | Build tooling & HMR dev server |
| TailwindCSS | 4.1.x | Utility-first CSS framework |
| Monaco Editor | 4.7.x | VS Code-grade code editor |
| Framer Motion | 12.x | Declarative animations |
| React Router | 7.12.x | Client-side routing |
| Axios | 1.13.x | HTTP client with interceptors |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Node.js | 18+ | JavaScript runtime |
| Express | 5.2.1 | HTTP framework |
| TypeScript | 5.9.3 | Static type checking |
| Supabase JS | 2.91.x | PostgreSQL client + auth |
| WebSocket (ws) | 8.19.x | Bidirectional real-time protocol |
| Zod | 4.3.x | Runtime schema validation |
| Winston | 3.19.x | Structured logging |
| Helmet | 8.1.x | HTTP security headers |
| bcrypt | 6.x | Password hashing |
| jsonwebtoken | 9.x | JWT generation & verification |

### External Services

| Service | Provider | Function |
|---|---|---|
| Database | Supabase (PostgreSQL) | Persistent storage with RLS |
| Speech-to-Text | Sarvam AI | Real-time voice transcription |
| Text-to-Speech | ElevenLabs | Natural voice synthesis |

---

## Getting Started

### Prerequisites

| Requirement | Minimum Version |
|---|---|
| Node.js | 18.0.0 |
| npm | 9.0.0 |
| Docker *(optional)* | 24.0.0 |
| Docker Compose *(optional)* | 2.20.0 |

**External accounts required:**
- [Supabase](https://supabase.com/) — database & auth infrastructure
- [ElevenLabs](https://elevenlabs.io/) — text-to-speech API key
- [Sarvam AI](https://www.sarvam.ai/) — speech-to-text API key

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/Anasgaima18/OfferFlow.git
cd OfferFlow

# 2. Set up the database
#    → Create a Supabase project at https://supabase.com
#    → Run server/supabase_schema.sql in the Supabase SQL Editor

# 3. Configure environment variables
cp server/.env.example server/.env
#    → Edit server/.env with your credentials (see Configuration section)

# 4. Install dependencies
cd server && npm install && cd ..
cd client && npm install && cd ..

# 5. Start development servers
# Terminal 1 — API server
cd server && npm run dev

# Terminal 2 — React dev server
cd client && npm run dev
```

The application will be available at:

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5000 |
| Health Check | http://localhost:5000/health |

---

## Configuration

### Server Environment Variables

Create `server/.env` from the provided example:

```bash
cp server/.env.example server/.env
```

| Variable | Required | Description | Default |
|---|---|---|---|
| `SUPABASE_URL` | Yes | Supabase project URL | — |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key | — |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service role key | — |
| `JWT_SECRET` | Yes | JWT signing secret (min 32 chars) | — |
| `ELEVENLABS_API_KEY` | Yes | ElevenLabs API key | — |
| `SARVAM_API_KEY` | Yes | Sarvam AI API key | — |
| `PORT` | No | Server listen port | `5000` |
| `NODE_ENV` | No | Runtime environment | `development` |
| `CLIENT_URL` | No | CORS allowed origins (comma-separated) | `http://localhost:5173` |

### Client Environment Variables

```env
VITE_API_URL=http://localhost:5000/api/v1
VITE_WS_URL=ws://localhost:5000/api/v1/interviews/ws
```

> **Security Note:** Never commit `.env` files. The `.gitignore` is pre-configured to exclude all environment files. Use `.env.example` as a reference template.

---

## Development

### Directory Structure

```
OfferFlow/
├── client/                          # React SPA (Vite)
│   ├── public/
│   │   └── pcm-processor.js        # AudioWorklet for PCM capture
│   ├── src/
│   │   ├── components/              # Shared UI components
│   │   │   ├── ui/                  # Primitive design system components
│   │   │   ├── Navbar.tsx           # Global navigation bar
│   │   │   ├── Footer.tsx           # Global footer
│   │   │   ├── Hero.tsx             # Landing page hero section
│   │   │   ├── ErrorBoundary.tsx    # React error boundary
│   │   │   └── ProtectedRoute.tsx   # Auth-guarded route wrapper
│   │   ├── config/
│   │   │   └── env.ts               # Typed environment config
│   │   ├── context/
│   │   │   ├── AuthContext.ts       # Auth context definition
│   │   │   └── AuthProvider.tsx     # Auth state provider
│   │   ├── hooks/
│   │   │   ├── useAuth.ts           # Authentication hook
│   │   │   └── useAudioRecorder.ts  # Microphone capture hook
│   │   ├── pages/                   # Route-level page components
│   │   │   ├── Landing.tsx          # Marketing landing page
│   │   │   ├── Dashboard.tsx        # User dashboard
│   │   │   ├── InterviewSetup.tsx   # Interview configuration
│   │   │   ├── InterviewRoom.tsx    # Live interview interface
│   │   │   ├── FeedbackReport.tsx   # Post-interview analysis
│   │   │   ├── Analytics.tsx        # Performance analytics
│   │   │   ├── QuestionBank.tsx     # Practice question library
│   │   │   ├── DailyChallenge.tsx   # Daily coding challenge
│   │   │   ├── Leaderboard.tsx      # Global rankings
│   │   │   ├── Achievements.tsx     # Achievement badges
│   │   │   ├── Profile.tsx          # User profile management
│   │   │   ├── ResumeReview.tsx     # AI resume analysis
│   │   │   └── ...                  # Auth, legal, support pages
│   │   ├── services/
│   │   │   └── api.ts               # Axios HTTP client + interceptors
│   │   └── types.ts                 # Shared TypeScript type definitions
│   ├── Dockerfile                   # Multi-stage production build
│   ├── nginx.conf                   # Nginx reverse proxy config
│   ├── tailwind.config.js           # TailwindCSS configuration
│   ├── vite.config.ts               # Vite build configuration
│   └── tsconfig.json                # TypeScript project references
│
├── server/                          # Express 5 API
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.ts               # Environment validation (Zod)
│   │   │   └── supabase.ts          # Supabase client singleton
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts   # Signup, login, user retrieval
│   │   │   ├── interview.controller.ts  # CRUD + interview lifecycle
│   │   │   └── code.controller.ts   # Code execution proxy
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts    # JWT verification guard
│   │   │   ├── error.middleware.ts   # Global error handler
│   │   │   ├── rateLimit.middleware.ts   # Rate limiting config
│   │   │   └── validate.middleware.ts    # Zod request validation
│   │   ├── models/
│   │   │   ├── User.ts              # User data model
│   │   │   └── Interview.ts         # Interview data model
│   │   ├── routes/
│   │   │   ├── auth.routes.ts       # Auth route definitions
│   │   │   └── interview.routes.ts  # Interview route definitions
│   │   ├── services/
│   │   │   ├── auth.service.ts      # Auth business logic
│   │   │   ├── interview.service.ts # Interview orchestration
│   │   │   ├── feedback.service.ts  # AI feedback generation
│   │   │   ├── sarvam.service.ts    # Sarvam AI integration
│   │   │   ├── elevenlabs.service.ts    # ElevenLabs integration
│   │   │   └── code.service.ts      # Code execution service
│   │   ├── types/                   # TypeScript type declarations
│   │   ├── utils/
│   │   │   ├── logger.ts            # Winston logger config
│   │   │   ├── appError.ts          # Custom error class
│   │   │   └── catchAsync.ts        # Async error wrapper
│   │   └── index.ts                 # Application entry point
│   ├── supabase_schema.sql          # Database DDL + RLS policies
│   ├── Dockerfile                   # Production container image
│   └── tsconfig.json                # TypeScript configuration
│
├── docker-compose.yml               # Multi-container orchestration
├── .gitignore                       # Git exclusion rules
└── README.md                        # ← You are here
```

### Available Scripts

#### Server

| Command | Description |
|---|---|
| `npm run dev` | Start development server with ts-node (auto-reload) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build |

#### Client

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint across the codebase |

---

## Deployment

### Docker Compose (Recommended)

The project ships with production-ready Docker configuration including multi-stage builds, health checks, and automatic restarts.

```bash
# 1. Configure environment
cp server/.env.example .env
#    → Edit .env with production credentials

# 2. Build and start containers
docker-compose up --build -d

# 3. Verify deployment
docker-compose ps
curl http://localhost:5000/health
```

| Service | Container Port | Host Port | Health Check |
|---|---|---|---|
| `server` | 5000 | 5000 | `GET /health` (30s interval) |
| `client` | 80 | 80 | Nginx default |

### Container Architecture

```
docker-compose.yml
├── server (Node.js + Express)
│   ├── Multi-stage Dockerfile
│   ├── Health check: wget → /health
│   ├── Restart policy: unless-stopped
│   └── Network: app-network (bridge)
│
└── client (Nginx + Static SPA)
    ├── Multi-stage Dockerfile (build → serve)
    ├── Nginx reverse proxy config
    ├── Depends on: server
    └── Network: app-network (bridge)
```

### Production Checklist

- [ ] Set `NODE_ENV=production` in server environment
- [ ] Use a strong, unique `JWT_SECRET` (minimum 32 characters)
- [ ] Configure `CLIENT_URL` to match your production domain
- [ ] Enable HTTPS via reverse proxy (Nginx, Cloudflare, etc.)
- [ ] Set up log aggregation for Winston structured output
- [ ] Configure Supabase RLS policies for production security
- [ ] Review and adjust rate limiting thresholds
- [ ] Set up monitoring and alerting on the `/health` endpoint

---

## API Reference

**Base URL:** `http://localhost:5000/api/v1`

### Authentication

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/auth/signup` | Register a new user account | No |
| `POST` | `/auth/login` | Authenticate and receive JWT | No |
| `GET` | `/auth/me` | Get current authenticated user | Bearer |

### Interviews

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/interviews` | List all interviews for current user | Bearer |
| `POST` | `/interviews` | Create a new interview session | Bearer |
| `GET` | `/interviews/:id` | Get interview details by ID | Bearer |
| `PATCH` | `/interviews/:id` | Update interview (score, feedback, status) | Bearer |

### WebSocket

| Protocol | Endpoint | Description | Auth |
|---|---|---|---|
| `WS` | `/interviews/ws` | Real-time interview audio/text streaming | JWT (query param) |

### Health

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/health` | Service health check | No |

#### Health Check Response

```json
{
  "status": "ok",
  "uptime": 3600,
  "environment": "production"
}
```

---

## Database Schema

OfferFlow uses **Supabase (PostgreSQL)** with Row Level Security enabled on all tables. The full schema is in [`server/supabase_schema.sql`](server/supabase_schema.sql).

### Entity Relationship

```
┌──────────────────┐       ┌──────────────────────┐       ┌────────────────────────┐
│      users       │       │     interviews       │       │  transcript_messages   │
├──────────────────┤       ├──────────────────────┤       ├────────────────────────┤
│ id          UUID │──PK   │ id          UUID     │──PK   │ id          UUID       │──PK
│ email       TEXT │       │ user_id     UUID     │──FK──▶│ interview_id UUID      │──FK
│ name        TEXT │       │ type        TEXT     │       │ role         TEXT      │
│ password    TEXT │       │ status      TEXT     │       │ content      TEXT      │
│ avatar      TEXT │       │ score       INT      │       │ timestamp    TIMESTAMPTZ│
│ created_at  TSZ  │       │ feedback    TEXT     │       └────────────────────────┘
│ updated_at  TSZ  │       │ created_at  TSZ      │
└──────────────────┘       │ updated_at  TSZ      │
        │                  └──────────────────────┘
        │                           │
        └───────────FK──────────────┘
```

**Interview Types:** `behavioral` · `technical` · `system-design`
**Interview Statuses:** `pending` · `in-progress` · `completed`
**Transcript Roles:** `user` · `ai`

### Indexes

| Index | Table | Column(s) | Purpose |
|---|---|---|---|
| `idx_interviews_user_id` | interviews | user_id | Fast user interview lookup |
| `idx_interviews_created_at` | interviews | created_at DESC | Chronological ordering |
| `idx_transcript_interview_id` | transcript_messages | interview_id | Transcript retrieval |
| `idx_transcript_timestamp` | transcript_messages | timestamp | Message ordering |

---

## Security

OfferFlow implements defense-in-depth security:

| Layer | Implementation |
|---|---|
| **Authentication** | JWT tokens with bcrypt password hashing (cost factor 10) |
| **Authorization** | Supabase Row Level Security — users access only their own data |
| **Transport** | CORS origin validation, HSTS preload, strict referrer policy |
| **Headers** | Helmet.js — CSP, X-Frame-Options, X-Content-Type-Options, etc. |
| **Rate Limiting** | express-rate-limit on all endpoints to prevent abuse |
| **Input Validation** | Zod schema validation on all request bodies |
| **Compression** | gzip/deflate compression via `compression` middleware |
| **Logging** | Structured Winston logging; production mode skips 2xx in morgan |
| **Secrets** | Environment-variable-based config; `.env` files excluded from VCS |

---

## Troubleshooting

<details>
<summary><strong>WebSocket connection fails</strong></summary>

1. Verify the backend is running on the expected port (`5000`)
2. Check that `VITE_WS_URL` in the client `.env` matches the server
3. Inspect browser DevTools → Network → WS tab for handshake errors
4. Ensure firewalls allow WebSocket upgrade on the target port
</details>

<details>
<summary><strong>Microphone / audio not working</strong></summary>

1. Grant microphone permission when the browser prompts
2. Use Chrome or Edge — Firefox/Safari may have limited AudioWorklet support
3. Verify `public/pcm-processor.js` exists in the client build
4. Check the browser console for `AudioContext` or `MediaStream` errors
</details>

<details>
<summary><strong>Build or dependency errors</strong></summary>

```bash
# Clear caches and reinstall
rm -rf node_modules dist .tsbuildinfo
npm install
npm run build
```

Verify Node.js version: `node --version` (must be ≥ 18.0.0)
</details>

<details>
<summary><strong>Supabase connection issues</strong></summary>

1. Confirm `SUPABASE_URL` starts with `https://` and ends with `.supabase.co`
2. Verify `SUPABASE_SERVICE_KEY` has the `service_role` prefix
3. Ensure the database schema has been applied (`server/supabase_schema.sql`)
4. Check Supabase dashboard → Database → Tables for expected structure
</details>

<details>
<summary><strong>Docker containers won't start</strong></summary>

```bash
# Check container logs
docker-compose logs server
docker-compose logs client

# Rebuild from scratch
docker-compose down -v
docker-compose up --build
```
</details>

---

## Contributing

We welcome contributions from the community. Please follow these guidelines:

1. **Fork** the repository
2. **Create** a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make** your changes with clear, descriptive commits
4. **Ensure** linting passes: `npm run lint`
5. **Push** to your fork and open a **Pull Request**

### Commit Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add resume parsing endpoint
fix: resolve WebSocket reconnection race condition
docs: update API reference with new endpoints
chore: upgrade dependencies to latest versions
```

### Code Style

- TypeScript strict mode enabled
- ESLint enforced on both client and server
- Functional components with hooks (no class components)
- Zod schemas for all external input validation

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

| Project / Service | Contribution |
|---|---|
| [Supabase](https://supabase.com/) | PostgreSQL database with real-time capabilities & RLS |
| [ElevenLabs](https://elevenlabs.io/) | Natural-sounding text-to-speech synthesis |
| [Sarvam AI](https://www.sarvam.ai/) | Speech-to-text transcription & language model |
| [Monaco Editor](https://microsoft.github.io/monaco-editor/) | VS Code-grade browser code editor |
| [React](https://react.dev/) | Component-based UI library |
| [Vite](https://vite.dev/) | Next-generation frontend build tooling |

---

<div align="center">

**[⬆ Back to Top](#offerflow)**

Built by [Anasgaima18](https://github.com/Anasgaima18) · Powered by AI

</div>
