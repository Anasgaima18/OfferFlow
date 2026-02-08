<div align="center">

# OfferFlow — Client

**React SPA for the OfferFlow AI Mock Interview Platform**

[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.2-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.x-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

</div>

---

## Overview

The OfferFlow client is a single-page application built with **React 19**, **TypeScript**, and **Vite**. It provides a rich, interactive interview experience including real-time voice streaming via WebSocket, an embedded Monaco code editor, and a comprehensive analytics dashboard.

## Tech Stack

| Library | Version | Role |
|---|---|---|
| React | 19.2.0 | UI framework |
| TypeScript | 5.9.3 | Type safety |
| Vite | 7.2.4 | Build tool & dev server |
| TailwindCSS | 4.1.x | Utility-first styling |
| Monaco Editor | 4.7.x | In-browser code editor |
| Framer Motion | 12.x | Declarative animations |
| React Router | 7.12.x | Client-side routing |
| Axios | 1.13.x | HTTP client |
| Lucide React | 0.562.x | Icon library |
| Sonner | 2.x | Toast notifications |

## Getting Started

### Prerequisites

- **Node.js** ≥ 18.0.0
- **npm** ≥ 9.0.0
- Running [OfferFlow server](../server/) on port 5000

### Installation

```bash
cd client
npm install
```

### Environment Variables

Create a `.env` file in the `client/` directory:

```env
VITE_API_URL=http://localhost:5000/api/v1
VITE_WS_URL=ws://localhost:5000/api/v1/interviews/ws
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR at `:5173` |
| `npm run build` | Type-check (`tsc -b`) then bundle for production |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint across all source files |

## Project Structure

```
client/
├── public/
│   └── pcm-processor.js            # AudioWorklet for raw PCM capture
│
├── src/
│   ├── components/                  # Shared components
│   │   ├── ui/                      # Design system primitives (Button, FeatureCard)
│   │   ├── Navbar.tsx               # Global navigation
│   │   ├── Footer.tsx               # Global footer
│   │   ├── Hero.tsx                 # Landing page hero
│   │   ├── ProcessSection.tsx       # Landing process section
│   │   ├── ErrorBoundary.tsx        # React error boundary
│   │   └── ProtectedRoute.tsx       # Auth guard wrapper
│   │
│   ├── config/
│   │   └── env.ts                   # Typed env variable access
│   │
│   ├── context/
│   │   ├── AuthContext.ts           # Auth context definition
│   │   └── AuthProvider.tsx         # JWT auth state provider
│   │
│   ├── hooks/
│   │   └── useAuth.ts               # Auth context consumer hook
│   │
│   ├── pages/                       # Route-level components
│   │   ├── Landing.tsx              # Marketing page
│   │   ├── Login.tsx / Signup.tsx    # Authentication
│   │   ├── Dashboard.tsx            # User dashboard
│   │   ├── InterviewSetup.tsx       # Interview configuration
│   │   ├── InterviewRoom.tsx        # Live interview (voice + editor)
│   │   ├── FeedbackReport.tsx       # Post-interview analysis
│   │   ├── Analytics.tsx            # Performance trends
│   │   ├── QuestionBank.tsx         # Practice questions
│   │   ├── DailyChallenge.tsx       # Daily coding challenge
│   │   ├── Leaderboard.tsx          # Global rankings
│   │   ├── Achievements.tsx         # Badge system
│   │   ├── Profile.tsx              # User settings
│   │   ├── ResumeReview.tsx         # AI resume analysis
│   │   └── ...                      # Legal, support, tips pages
│   │
│   ├── services/
│   │   └── api.ts                   # Axios instance with JWT interceptors
│   │
│   ├── types.ts                     # Shared type definitions
│   ├── App.tsx                      # Root component + router
│   ├── main.tsx                     # Entry point
│   └── index.css                    # Global styles + Tailwind directives
│
├── Dockerfile                       # Multi-stage build → Nginx
├── nginx.conf                       # Production reverse proxy config
├── vite.config.ts                   # Vite configuration
├── tailwind.config.js               # TailwindCSS configuration
├── tsconfig.json                    # TypeScript project references
├── tsconfig.app.json                # App-level TS config
├── tsconfig.node.json               # Node/Vite TS config
└── eslint.config.js                 # ESLint flat config
```

## Key Architecture Decisions

### Audio Pipeline

The interview voice flow uses a custom **AudioWorklet** (`pcm-processor.js`) to capture raw PCM audio from the microphone, which is streamed to the server over WebSocket. The server forwards audio to Sarvam AI for transcription and generates AI responses via ElevenLabs TTS, sent back as audio over the same WebSocket connection.

### Authentication

JWT tokens are stored in memory via React Context (`AuthProvider`). The `useAuth` hook exposes `user`, `login`, `signup`, and `logout`. All authenticated API requests attach the Bearer token via an Axios request interceptor in `services/api.ts`.

### Routing

React Router v7 handles client-side routing. Protected routes are wrapped with `ProtectedRoute`, which redirects unauthenticated users to `/login`.

### Styling

TailwindCSS 4 is used with `clsx` + `tailwind-merge` for conditional class composition. Framer Motion handles page transitions and micro-interactions.

## Production Build

```bash
npm run build
```

Output is written to `dist/`. The included `Dockerfile` creates a multi-stage image:

1. **Build stage** — installs deps, runs `npm run build`
2. **Serve stage** — copies `dist/` into an Nginx container with custom `nginx.conf`

### Docker

```bash
docker build -t offerflow-client .
docker run -p 80:80 offerflow-client
```

## Browser Support

| Browser | Supported | Notes |
|---|---|---|
| Chrome | ✅ Recommended | Full AudioWorklet + WebSocket support |
| Edge | ✅ | Chromium-based, full support |
| Firefox | ⚠️ Partial | AudioWorklet support may vary |
| Safari | ⚠️ Partial | Limited AudioWorklet support |

## ESLint Configuration

The project uses ESLint flat config with TypeScript support. To enable stricter type-aware linting for production:

```js
// eslint.config.js
export default defineConfig([
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
])
```

---

<div align="center">

**[Back to main README](../README.md)**

</div>
