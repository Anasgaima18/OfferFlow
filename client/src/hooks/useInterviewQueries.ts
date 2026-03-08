import { useQuery } from '@tanstack/react-query';
import { interviews, type InterviewStats, type LeaderboardEntry } from '../services/api';
import { type IInterview, type ITranscriptMessage } from '../types';

type StatsPayload = InterviewStats | { stats: InterviewStats };

const queryKeys = {
  stats: ['interviews', 'stats'] as const,
  list: ['interviews', 'list'] as const,
  leaderboard: (limit: number) => ['interviews', 'leaderboard', limit] as const,
  detail: (id: string) => ['interviews', 'detail', id] as const,
  transcript: (id: string) => ['interviews', 'transcript', id] as const,
};

const emptyStats: InterviewStats = {
  totalInterviews: 0,
  completedInterviews: 0,
  averageScore: 0,
  highestScore: 0,
  totalBehavioral: 0,
  totalTechnical: 0,
  totalSystemDesign: 0,
  rank: undefined,
  interviewsByType: {
    behavioral: 0,
    technical: 0,
    'system-design': 0,
  },
};

function normalizeStats(payload: StatsPayload | undefined): InterviewStats {
  const stats = payload && 'stats' in payload ? payload.stats : payload;
  if (!stats) {
    return emptyStats;
  }

  const interviewsByType = stats.interviewsByType ?? {
    behavioral: stats.totalBehavioral ?? 0,
    technical: stats.totalTechnical ?? 0,
    'system-design': stats.totalSystemDesign ?? 0,
  };

  return {
    totalInterviews: stats.totalInterviews ?? 0,
    completedInterviews: stats.completedInterviews ?? 0,
    averageScore: stats.averageScore ?? 0,
    highestScore: stats.highestScore ?? 0,
    totalBehavioral: stats.totalBehavioral ?? interviewsByType.behavioral ?? 0,
    totalTechnical: stats.totalTechnical ?? interviewsByType.technical ?? 0,
    totalSystemDesign: stats.totalSystemDesign ?? interviewsByType['system-design'] ?? 0,
    rank: stats.rank,
    interviewsByType,
  };
}

export function useInterviewStatsQuery() {
  return useQuery({
    queryKey: queryKeys.stats,
    queryFn: async () => normalizeStats((await interviews.getStats()).data.data),
  });
}

export function useUserInterviewsQuery() {
  return useQuery({
    queryKey: queryKeys.list,
    queryFn: async (): Promise<IInterview[]> => (await interviews.getAll()).data.data.interviews ?? [],
  });
}

export function useLeaderboardQuery(limit = 10) {
  return useQuery({
    queryKey: queryKeys.leaderboard(limit),
    queryFn: async (): Promise<LeaderboardEntry[]> => (await interviews.getLeaderboard(limit)).data.data.leaderboard ?? [],
    staleTime: 2 * 60_000,
  });
}

export function useInterviewDetailQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.detail(id),
    queryFn: async (): Promise<IInterview> => (await interviews.getOne(id)).data.data.interview,
    enabled: Boolean(id),
  });
}

export function useTranscriptQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.transcript(id),
    queryFn: async (): Promise<ITranscriptMessage[]> => (await interviews.getTranscript(id)).data.data.transcript ?? [],
    enabled: Boolean(id),
  });
}