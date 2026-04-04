export type InterviewRole = 'software-engineer' | 'frontend-engineer';
export type InterviewLanguage = 'javascript' | 'python' | 'java' | 'cpp';

export interface InterviewSessionConfig {
  role: InterviewRole;
  language: InterviewLanguage;
}

const STORAGE_PREFIX = 'offerflow:interview-config:';

export function saveInterviewSessionConfig(interviewId: string, config: InterviewSessionConfig) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(`${STORAGE_PREFIX}${interviewId}`, JSON.stringify(config));
}

export function getInterviewSessionConfig(interviewId: string): InterviewSessionConfig | null {
  if (typeof window === 'undefined') return null;

  const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${interviewId}`);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<InterviewSessionConfig>;
    if (
      (parsed.role === 'software-engineer' || parsed.role === 'frontend-engineer') &&
      (parsed.language === 'javascript' || parsed.language === 'python' || parsed.language === 'java' || parsed.language === 'cpp')
    ) {
      return {
        role: parsed.role,
        language: parsed.language,
      };
    }
  } catch {
    // Ignore malformed session state and fall back to defaults.
  }

  return null;
}
