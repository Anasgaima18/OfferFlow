import axios, { InternalAxiosRequestConfig, AxiosError } from 'axios';
import { IInterview, InterviewType, ITranscriptMessage } from '../types';
import env from '../config/env';
import { noticeBrowserError, setBrowserAttribute, trackPageAction } from '../lib/newRelicBrowser';

// --- API Response Types ---

export interface UserData {
    name?: string;
  username?: string;
    email: string;
    password?: string;
    avatar?: string;
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

// Flat response type for Auth wrapped in typicalApiResponse (already exists below, but let's change AuthResponse directly)
interface AuthResponse {
  success: boolean;
  data: {
    token: string;
    user: {
        id: string;
        name: string;
    username?: string | null;
        email: string;
        avatar?: string;
    };
  };
  message?: string;
}

interface SignupResponse {
  success: boolean;
  data: {
    user: AuthResponse['data']['user'];
    requiresEmailVerification: boolean;
    verificationToken?: string;
  };
  message?: string;
}

export type OAuthProvider = 'google' | 'github';

export interface QuestionBankItem {
  id: number;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  company: string;
  category: string;
  acceptance: string;
}

export interface QuestionBankResponse {
  questions: QuestionBankItem[];
  total: number;
  page: number;
  pageSize: number;
  categories: string[];
}

export interface DailyChallengeResponse {
  date: string;
  challenge: QuestionBankItem;
}

export interface ResumeReviewResponse {
  score: number;
  feedback: string[];
  summary: string;
  extractedTextLength: number;
  storedResumeUrl?: string | null;
  storedResumePath?: string | null;
}

export interface InterviewStats {
    totalInterviews: number;
    completedInterviews: number;
    averageScore: number | null;
    highestScore?: number;
    totalBehavioral?: number;
    totalTechnical?: number;
    totalSystemDesign?: number;
    rank?: number;
    interviewsByType?: Record<string, number>;
}

export interface LeaderboardEntry {
    rank: number;
    userId: string;
    name: string;
    avatar?: string;
    totalInterviews: number;
    averageScore: number;
}

export interface FeedbackResponse {
    id: string;
    interview_id: string;
    overall_score: number;
    summary: string;
    strengths: string[];
    improvements: string[];
    detailed_feedback: string;
}

// --- Axios Instance ---

interface TelemetryRequestConfig extends InternalAxiosRequestConfig {
  metadata?: {
    startedAt: number;
  };
}

const api = axios.create({
  baseURL: env.API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to add the auth token to requests
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const telemetryConfig = config as TelemetryRequestConfig;
    telemetryConfig.metadata = { startedAt: performance.now() };

    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    setBrowserAttribute('api.lastRequestPath', config.url ?? 'unknown');

    return config;
  },
  (error: AxiosError) => {
    noticeBrowserError(error, {
      phase: 'request-interceptor',
      path: error.config?.url ?? 'unknown',
      method: error.config?.method?.toUpperCase() ?? 'UNKNOWN',
    });
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle expired/invalid tokens
api.interceptors.response.use(
  (response) => {
    const telemetryConfig = response.config as TelemetryRequestConfig;
    const durationMs = telemetryConfig.metadata
      ? Number((performance.now() - telemetryConfig.metadata.startedAt).toFixed(2))
      : -1;

    trackPageAction('ApiRequest', {
      path: response.config.url ?? 'unknown',
      method: response.config.method?.toUpperCase() ?? 'UNKNOWN',
      statusCode: response.status,
      durationMs,
    });

    setBrowserAttribute('api.lastStatusCode', response.status);
    return response;
  },
  (error: AxiosError) => {
    const telemetryConfig = (error.config as TelemetryRequestConfig | undefined);
    const durationMs = telemetryConfig?.metadata
      ? Number((performance.now() - telemetryConfig.metadata.startedAt).toFixed(2))
      : -1;

    trackPageAction('ApiRequestError', {
      path: error.config?.url ?? 'unknown',
      method: error.config?.method?.toUpperCase() ?? 'UNKNOWN',
      statusCode: error.response?.status ?? 0,
      durationMs,
      hasResponse: Boolean(error.response),
    });

    noticeBrowserError(error, {
      phase: 'response-interceptor',
      path: error.config?.url ?? 'unknown',
      method: error.config?.method?.toUpperCase() ?? 'UNKNOWN',
      statusCode: error.response?.status ?? 0,
    });

    if (error.response?.status === 401) {
      // Token is invalid or user no longer exists — clear auth state
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login if not already there
      if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// --- Typed API Methods ---

export const auth = {
  login: (email: string, password?: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }),
  signup: (userData: UserData) =>
    api.post<SignupResponse>('/auth/signup', userData),
  me: () =>
    api.get<ApiResponse<{ user: AuthResponse['data']['user'] }>>('/auth/me'),
  exchangeOAuth: (code: string) =>
    api.post<AuthResponse>('/auth/oauth/exchange', { code }),
  updateProfile: (userData: Partial<UserData>) =>
    api.patch<ApiResponse<{ user: AuthResponse['data']['user'] }>>('/auth/me', userData),
  verifyEmail: (token: string) =>
    api.post<ApiResponse<{ user: AuthResponse['data']['user'] }>>('/auth/verify-email', { token }),
  resendVerification: (email: string) =>
    api.post<ApiResponse<{ verificationToken?: string }>>('/auth/resend-verification', { email }),
  forgotPassword: (email: string) =>
    api.post<ApiResponse<{ resetToken?: string }>>('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    api.post<ApiResponse<Record<string, never>>>('/auth/reset-password', { token, password }),
  deleteAccount: () =>
    api.delete<ApiResponse<Record<string, never>>>('/auth/me'),
  getSupabaseToken: () =>
    api.get<ApiResponse<{ token: string; expiresIn: number }>>('/auth/supabase-token'),
  getOAuthStartUrl: (provider: OAuthProvider) => `${env.API_URL}/auth/oauth/${provider}/start`,
};

export const interviews = {
  getAll: () =>
    api.get<ApiResponse<{ interviews: IInterview[] }>>('/interviews'),
  create: (type: InterviewType) =>
    api.post<ApiResponse<{ interview: IInterview }>>('/interviews', { type }),
  getOne: (id: string) =>
    api.get<ApiResponse<{ interview: IInterview }>>(`/interviews/${id}`),
  update: (id: string, data: Partial<IInterview>) =>
    api.patch<ApiResponse<{ interview: IInterview }>>(`/interviews/${id}`, data),
  getStats: () =>
    api.get<ApiResponse<InterviewStats>>('/interviews/stats'),
  getLeaderboard: (limit?: number) =>
    api.get<ApiResponse<{ leaderboard: LeaderboardEntry[] }>>(`/interviews/leaderboard${limit ? `?limit=${limit}` : ''}`),
  getFeedback: (id: string) =>
    api.get<ApiResponse<{ feedback: FeedbackResponse, interview: IInterview }>>(`/interviews/${id}/feedback`),
  getTranscript: (id: string) =>
    api.get<ApiResponse<{ transcript: ITranscriptMessage[] }>>(`/interviews/${id}/transcript`),
};

export const content = {
  getQuestions: (params?: { search?: string; difficulty?: string; category?: string; page?: number; pageSize?: number }) =>
    api.get<ApiResponse<QuestionBankResponse>>('/content/questions', { params }),
  getDailyChallenge: () =>
    api.get<ApiResponse<DailyChallengeResponse>>('/content/daily-challenge'),
  reviewResume: (file: File) => {
    const formData = new FormData();
    formData.append('resume', file);
    return api.post<ApiResponse<ResumeReviewResponse>>('/content/resume-review', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

export default api;
