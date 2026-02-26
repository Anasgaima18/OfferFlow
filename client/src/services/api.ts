import axios, { InternalAxiosRequestConfig, AxiosError } from 'axios';
import { IInterview, InterviewType, ITranscriptMessage } from '../types';
import env from '../config/env';

// --- API Response Types ---

export interface UserData {
    name?: string;
    email: string;
    password?: string;
    avatar?: string;
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

// Flat response type for Auth
interface AuthResponse {
    success: boolean;
    token: string;
    user: {
        id: string;
        name: string;
        email: string;
        avatar?: string;
    };
    message?: string;
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
    user_id: string;
    name: string;
    avatar: string | null;
    total_score: number;
    interview_count: number;
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

const api = axios.create({
  baseURL: env.API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to add the auth token to requests
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Add a response interceptor to handle expired/invalid tokens
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
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
    api.post<AuthResponse>('/auth/signup', userData),
  me: () =>
    api.get<ApiResponse<{ user: AuthResponse['user'] }>>('/auth/me'),
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

export default api;
