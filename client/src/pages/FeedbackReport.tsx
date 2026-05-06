import { useEffect, useReducer, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import BlurFade from '../components/ui/BlurFade';
import PageHero from '../components/ui/PageHero';
import PageLayout from '../components/ui/PageLayout';
import SurfaceCard from '../components/ui/SurfaceCard';
import { Trophy, MessageSquare, Code2, Brain, ChevronRight, Star, TrendingUp, Download, RotateCcw } from 'lucide-react';
import { interviews } from '../services/api';
import { useInterviewRealtime } from '../hooks/useInterviewRealtime';

interface ApiError {
  response?: {
    status?: number;
  };
}

interface FeedbackCategory {
  name: string;
  score: number;
  feedback: string;
}

interface FeedbackData {
  overallScore: number;
  categories: FeedbackCategory[];
  strengths: string[];
  improvements: string[];
  summary: string;
}

interface InterviewData {
  type: string;
  status: string;
  created_at: string;
}

interface FeedbackReportState {
  isLoading: boolean;
  error: string | null;
  feedback: FeedbackData | null;
  interview: InterviewData | null;
}

type FeedbackReportAction = {
  type: 'set';
  value: FeedbackReportState;
};

function feedbackReportReducer(_: FeedbackReportState, action: FeedbackReportAction): FeedbackReportState {
  if (action.type === 'set') {
    return action.value;
  }

  return _;
}

const getCategoryIcon = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes('problem') || lower.includes('analytical')) return <Brain size={20} />;
  if (lower.includes('communication') || lower.includes('clarity')) return <MessageSquare size={20} />;
  if (lower.includes('code') || lower.includes('technical')) return <Code2 size={20} />;
  return <Star size={20} />;
};

const FeedbackReport = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(feedbackReportReducer, {
    isLoading: true,
    error: null,
    feedback: null,
    interview: null,
  });
  const { isLoading, error, feedback, interview } = state;

  const fetchFeedback = useCallback(async () => {
    if (!id) {
      dispatch({ type: 'set', value: { isLoading: false, error: 'No interview ID provided.', feedback: null, interview: null } });
      return;
    }

    try {
      const response = await interviews.getFeedback(id);
      const data = response.data.data;
      const apiFeedback = data.feedback;
      
      let parsedCategories = [];
      if (apiFeedback.detailed_feedback) {
          try {
              parsedCategories = typeof apiFeedback.detailed_feedback === 'string' 
                 ? JSON.parse(apiFeedback.detailed_feedback) 
                 : apiFeedback.detailed_feedback;
          } catch (e) {
              console.error("Could not parse detailed feedback:", e);
          }
      }
      
      dispatch({
        type: 'set',
        value: {
          isLoading: false,
          error: null,
          feedback: {
            overallScore: apiFeedback.overall_score || 0,
            summary: apiFeedback.summary || '',
            strengths: apiFeedback.strengths || [],
            improvements: apiFeedback.improvements || [],
            categories: Array.isArray(parsedCategories) ? parsedCategories : [],
          },
          interview: data.interview as unknown as InterviewData,
        },
      });
    } catch (err: unknown) {
      const apiError = err as ApiError;
      const status = apiError.response?.status;

      dispatch({
        type: 'set',
        value: {
          isLoading: false,
          error:
            status === 404
              ? 'not-found'
              : status === 409
                ? 'not-ready'
                : 'Failed to load feedback report. Please try again.',
          feedback: null,
          interview: null,
        },
      });
      console.error('Failed to fetch feedback:', apiError);
    }
  }, [id]);

  useEffect(() => {
    void fetchFeedback();
  }, [fetchFeedback]);

  useInterviewRealtime(id, () => {
    void fetchFeedback();
  }, Boolean(id));

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getHireRecommendation = (score: number) => {
    if (score >= 80) return 'Likely Hire';
    if (score >= 60) return 'Leaning Hire';
    return 'Needs Improvement';
  };

  if (isLoading) {
    return (
      <PageLayout contentClassName="max-w-5xl">
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm font-mono text-zinc-400">Generating your feedback report...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (error === 'not-found') {
    return (
      <PageLayout contentClassName="max-w-5xl">
        <div className="py-12 text-center">
          <SurfaceCard className="premium-panel mx-auto max-w-3xl p-12">
            <Trophy size={48} className="mx-auto mb-4 text-zinc-600" />
            <h2 className="font-pixel text-3xl tracking-[0.08em] text-white">FEEDBACK NOT FOUND</h2>
            <p className="mx-auto mt-4 max-w-xl text-sm font-mono leading-relaxed text-zinc-400">This interview does not have feedback yet, or the session ID is invalid.</p>
            <div className="mt-8">
              <Button variant="primary" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
            </div>
          </SurfaceCard>
        </div>
      </PageLayout>
    );
  }

  if (error === 'not-ready') {
    return (
      <PageLayout contentClassName="max-w-5xl">
        <div className="py-12 text-center">
          <SurfaceCard className="premium-panel mx-auto max-w-3xl p-12">
            <Trophy size={48} className="mx-auto mb-4 text-zinc-600" />
            <h2 className="font-pixel text-3xl tracking-[0.08em] text-white">REPORT NOT READY</h2>
            <p className="mx-auto mt-4 max-w-xl text-sm font-mono leading-relaxed text-zinc-400">
              This session needs actual interview activity before a feedback report can be generated.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button variant="primary" onClick={() => navigate(`/interview/${id}`)}>
                Continue Interview
              </Button>
              <Button variant="secondary" onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </Button>
            </div>
          </SurfaceCard>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout contentClassName="max-w-5xl">
        <div className="py-12 text-center">
          <SurfaceCard className="premium-panel mx-auto max-w-3xl p-12">
            <h2 className="font-pixel text-3xl tracking-[0.08em] text-red-300">ERROR</h2>
            <p className="mx-auto mt-4 max-w-xl text-sm font-mono leading-relaxed text-zinc-400">{error}</p>
            <div className="mt-8">
              <Button variant="primary" onClick={() => window.location.reload()}>
                <RotateCcw size={16} />
                Try Again
              </Button>
            </div>
          </SurfaceCard>
        </div>
      </PageLayout>
    );
  }

  if (!feedback) return null;

  const completedAt = interview?.created_at
    ? new Date(interview.created_at).toLocaleDateString()
    : new Date().toLocaleDateString();

  const interviewType = interview?.type
    ? interview.type.charAt(0).toUpperCase() + interview.type.slice(1).replace('-', ' ')
    : 'Interview';

  return (
    <PageLayout contentClassName="max-w-6xl">
      <PageHero
        kicker="Session Review"
        title="FEEDBACK REPORT"
        description={`Your ${interviewType.toLowerCase()} session is complete. Review the signal, keep the strengths, and convert weak spots into the next practice target.`}
        meta={[
          { label: 'Recommendation', value: getHireRecommendation(feedback.overallScore) },
          { label: 'Session ID', value: id ?? '--' },
          { label: 'Completed', value: completedAt },
        ]}
        actions={
          <>
            <Button onClick={() => navigate('/interview-setup')} variant="primary" size="lg">
              Practice Again
              <ChevronRight size={18} />
            </Button>
            <Button variant="secondary" size="lg" onClick={() => navigate('/analytics')}>
              <Download size={16} />
              View All Reports
            </Button>
          </>
        }
        aside={
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-emerald-200">
              <Trophy size={14} />
              {getHireRecommendation(feedback.overallScore)}
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-6 text-center">
              <div className={`font-pixel text-7xl tracking-[0.08em] ${getScoreColor(feedback.overallScore)}`}>{feedback.overallScore}</div>
              <div className="mt-2 text-xs uppercase tracking-[0.2em] text-zinc-500">Overall score</div>
            </div>
          </div>
        }
      />

      {feedback.categories && feedback.categories.length > 0 ? (
        <section className="mb-8 grid gap-4 md:grid-cols-2">
          {feedback.categories.map((category, index) => (
            <BlurFade key={category.name} delay={index * 0.04}>
              <SurfaceCard className="premium-panel p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-zinc-300">{getCategoryIcon(category.name)}</div>
                  <div className="flex-1">
                    <div className="font-mono text-sm text-white">{category.name}</div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/8">
                        <div className={`h-full ${getScoreBarColor(category.score)}`} style={{ width: `${category.score}%` }} />
                      </div>
                      <span className={`text-sm font-mono ${getScoreColor(category.score)}`}>{category.score}</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm font-mono leading-relaxed text-zinc-400">{category.feedback}</p>
              </SurfaceCard>
            </BlurFade>
          ))}
        </section>
      ) : null}

      {feedback.summary ? (
        <BlurFade>
          <SurfaceCard className="premium-panel mb-8 p-6">
            <h2 className="font-pixel text-2xl tracking-[0.08em] text-white">SUMMARY</h2>
            <p className="mt-4 text-sm font-mono leading-relaxed text-zinc-400">{feedback.summary}</p>
          </SurfaceCard>
        </BlurFade>
      ) : null}

      <section className="grid gap-6 md:grid-cols-2">
        {feedback.strengths && feedback.strengths.length > 0 ? (
          <BlurFade>
            <SurfaceCard className="premium-panel p-6">
              <h3 className="mb-5 flex items-center gap-2 font-pixel text-2xl tracking-[0.08em] text-emerald-200">
                <Star size={18} />
                STRENGTHS
              </h3>
              <ul className="space-y-3">
                {feedback.strengths.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm font-mono text-zinc-300">
                    <span className="mt-1 text-emerald-300">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </SurfaceCard>
          </BlurFade>
        ) : null}
        {feedback.improvements && feedback.improvements.length > 0 ? (
          <BlurFade delay={0.05}>
            <SurfaceCard className="premium-panel p-6">
              <h3 className="mb-5 flex items-center gap-2 font-pixel text-2xl tracking-[0.08em] text-amber-200">
                <TrendingUp size={18} />
                NEXT IMPROVEMENTS
              </h3>
              <ul className="space-y-3">
                {feedback.improvements.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm font-mono text-zinc-300">
                    <span className="mt-1 text-amber-200">→</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </SurfaceCard>
          </BlurFade>
        ) : null}
      </section>
    </PageLayout>
  );
};

export default FeedbackReport;
