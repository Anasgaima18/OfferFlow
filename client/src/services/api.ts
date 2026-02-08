import axios, { InternalAxiosRequestConfig, AxiosError } from 'axios';
import { IInterview, InterviewType } from '../types';
import env from '../config/env';

// Define types for API responses and requests
export interface UserData {
    name?: string;
    email: string;
    password?: string;
    avatar?: string;
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

export const auth = {
  login: (email: string, password?: string) => api.post('/auth/login', { email, password }),
  signup: (userData: UserData) => api.post('/auth/signup', userData),
  me: () => api.get('/auth/me'),
};

export const interviews = {
  getAll: () => api.get('/interviews'),
  create: (type: InterviewType) => api.post('/interviews', { type }),
  getOne: (id: string) => api.get(`/interviews/${id}`),
  update: (id: string, data: Partial<IInterview>) => api.patch(`/interviews/${id}`, data),
  getStats: () => api.get('/interviews/stats'),
  getLeaderboard: (limit?: number) => api.get(`/interviews/leaderboard${limit ? `?limit=${limit}` : ''}`),
  getFeedback: (id: string) => api.get(`/interviews/${id}/feedback`),
  getTranscript: (id: string) => api.get(`/interviews/${id}/transcript`),
};

export default api;
