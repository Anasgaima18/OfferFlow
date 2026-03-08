import { useQuery } from '@tanstack/react-query';
import { content, type DailyChallengeResponse, type QuestionBankResponse } from '../services/api';

const queryKeys = {
  questions: (params: { search?: string; difficulty?: string; category?: string; page?: number; pageSize?: number }) =>
    ['content', 'questions', params] as const,
  dailyChallenge: ['content', 'daily-challenge'] as const,
};

export function useQuestionsQuery(params: { search?: string; difficulty?: string; category?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: queryKeys.questions(params),
    queryFn: async (): Promise<QuestionBankResponse> => (await content.getQuestions(params)).data.data,
    placeholderData: (previousData) => previousData,
  });
}

export function useDailyChallengeQuery() {
  return useQuery({
    queryKey: queryKeys.dailyChallenge,
    queryFn: async (): Promise<DailyChallengeResponse> => (await content.getDailyChallenge()).data.data,
    staleTime: 5 * 60_000,
  });
}