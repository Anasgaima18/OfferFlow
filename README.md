# 🎯 OfferFlow - AI-Powered Mock Interview Platform

![OfferFlow](https://img.shields.io/badge/OfferFlow-Interview%20Platform-blue)
![React](https://img.shields.io/badge/React-19.2.0-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)

**OfferFlow** is a cutting-edge AI-powered mock interview platform that helps candidates prepare for technical interviews through realistic, voice-based conversations with AI interviewers. Practice coding challenges, receive instant feedback, and track your progress over time.

## ✨ Features

### 🎙️ **Voice-Based Interviews**

- Real-time voice conversation with AI interviewer
- Natural language processing for contextual responses
- Speech-to-text powered by Sarvam AI
- Text-to-speech powered by ElevenLabs

### 💻 **Integrated Code Editor**

- Monaco Editor with 40+ language support
- Real-time code execution
- Syntax highlighting and IntelliSense
- Console output display

### 📊 **Comprehensive Analytics**

- Detailed performance metrics
- Interview transcripts
- Progress tracking
- Personalized feedback reports

### 🏆 **Gamification**

- Daily challenges
- Achievement system
- Global leaderboard
- Skill-based rankings

### 🔐 **Secure Authentication**

- JWT-based authentication
- Protected routes
- User profile management
- Supabase backend

## 🛠️ Technology Stack

### Frontend

- **React 19.2.0** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TailwindCSS 4** - Styling
- **Monaco Editor** - Code editor
- **Framer Motion** - Animations
- **Axios** - HTTP client

### Backend

- **Node.js** - Runtime
- **Express 5** - Web framework
- **TypeScript** - Type safety
- **Supabase** - PostgreSQL database
- **WebSocket (ws)** - Real-time communication
- **JWT** - Authentication
- **Winston** - Logging

### AI Services

- **ElevenLabs** - Text-to-Speech
- **Sarvam AI** - Speech-to-Text and LLM

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Git**

You'll also need accounts for:

- [Supabase](https://supabase.com/) - Database
- [ElevenLabs](https://elevenlabs.io/) - TTS service
- [Sarvam AI](https://www.sarvam.ai/) - STT and LLM service

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd Interview
```

### 2. Set Up Supabase

1. Create a new project on [Supabase](https://supabase.com/)
2. Go to the SQL Editor in your Supabase dashboard
3. Run the schema located at `server/supabase_schema.sql`
4. Copy your project URL and API keys

### 3. Configure Environment Variables

#### Server Environment (.env)

```bash
cd server
cp .env.example .env
```

Edit `server/.env` with your credentials:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-role-key-here

# JWT Secret for Auth
JWT_SECRET=your-super-secret-jwt-key

# ElevenLabs API (for Text-to-Speech)
ELEVENLABS_API_KEY=your-elevenlabs-api-key

# Sarvam API (for Speech-to-Text)
SARVAM_API_KEY=your-sarvam-api-key

# Server Configuration
PORT=5000
NODE_ENV=development
```

#### Client Environment (.env)

The client `.env` file is already created with default values:

```env
VITE_API_URL=http://localhost:5000/api/v1
VITE_WS_URL=ws://localhost:5000/api/v1/interviews/ws
```

### 4. Install Dependencies

#### Server

```bash
cd server
npm install
```

#### Client

```bash
cd client
npm install
```

### 5. Build the Projects

#### Server

```bash
cd server
npm run build
```

#### Client

```bash
cd client
npm run build
```

### 6. Run in Development Mode

Open two terminal windows:

**Terminal 1 - Server:**

```bash
cd server
npm run dev
```

**Terminal 2 - Client:**

```bash
cd client
npm run dev
```

The application will be available at:

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:5000

## 🐳 Docker Deployment

### Using Docker Compose

1. Create a `.env` file in the root directory (copy from `.env.docker`):

```bash
cp .env.docker .env
```

2. Edit the `.env` file with your actual credentials

3. Build and run:

```bash
docker-compose up --build
```

The application will be available at:

- **Frontend**: http://localhost:80
- **Backend**: http://localhost:5000

## 📁 Project Structure

```
Interview/
├── client/                 # React frontend
│   ├── public/            # Static files
│   │   └── pcm-processor.js  # AudioWorklet for PCM capture
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── context/       # React context (Auth)
│   │   ├── hooks/         # Custom React hooks
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   └── types.ts       # TypeScript types
│   ├── .env              # Environment variables
│   └── package.json
│
├── server/                # Node.js backend
│   ├── src/
│   │   ├── config/       # Configuration files
│   │   ├── controllers/  # Route controllers
│   │   ├── middleware/   # Express middleware
│   │   ├── models/       # Data models
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   ├── types/        # TypeScript types
│   │   └── utils/        # Utility functions
│   ├── .env             # Environment variables
│   ├── supabase_schema.sql  # Database schema
│   └── package.json
│
├── docker-compose.yml    # Docker orchestration
└── README.md            # This file
```

## 🔑 API Endpoints

### Authentication

- `POST /api/v1/auth/signup` - Register a new user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/me` - Get current user

### Interviews

- `GET /api/v1/interviews` - Get all interviews for user
- `POST /api/v1/interviews` - Create a new interview
- `GET /api/v1/interviews/:id` - Get interview by ID
- `PATCH /api/v1/interviews/:id` - Update interview

### WebSocket

- `WS /api/v1/interviews/ws` - Real-time interview connection

## 🎮 Usage Guide

### Starting an Interview

1. **Sign Up / Login**
   - Create an account or login with existing credentials

2. **Navigate to Dashboard**
   - View your statistics and recent interviews

3. **Start Interview**
   - Click "Start Interview"
   - Select interview type (Technical, Behavioral, System Design)
   - Choose difficulty level

4. **Conduct Interview**
   - Enable microphone for voice conversation
   - Speak naturally with the AI interviewer
   - Use the code editor for technical questions
   - Run and test your code

5. **Review Feedback**
   - After completing the interview, view detailed feedback
   - Review transcripts
   - Check performance metrics
   - Get personalized recommendations

## 🧪 Testing

### Manual Testing Checklist

- [ ] User registration and login
- [ ] Dashboard displays correctly
- [ ] Interview setup flow works
- [ ] WebSocket connection establishes
- [ ] Audio recording and streaming works
- [ ] Real-time transcription displays
- [ ] AI responses are generated
- [ ] Code editor executes code
- [ ] Feedback report is generated
- [ ] All routes are accessible

### Browser Testing

- Chrome (recommended)
- Firefox
- Safari
- Edge

## 🔧 Troubleshooting

### WebSocket Connection Issues

- Ensure backend is running on port 5000
- Check firewall settings
- Verify `.env` file has correct WS URL

### Audio Not Working

- Grant microphone permissions in browser
- Check browser compatibility (Chrome recommended)
- Ensure `pcm-processor.js` is in the public folder

### Build Errors

- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear build cache: `npm run build -- --force`
- Check Node.js version: `node --version` (should be v18+)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- **ElevenLabs** for TTS services
- **Sarvam AI** for STT and LLM services
- **Supabase** for database and authentication
- **Monaco Editor** for the code editor
- **React** and **Vite** teams for amazing tools

## 📞 Support

For issues and questions:

- Create an issue on GitHub
- Check the troubleshooting section
- Review the documentation

---

**Built with ❤️ using React, TypeScript, Node.js, and AI**
