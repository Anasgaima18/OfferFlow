import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Button from '../components/ui/Button';
import { Trophy, MessageSquare, Code2, Brain, ChevronRight, Star, TrendingUp, Download } from 'lucide-react';
import { interviews } from '../services/api';

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [interview, setInterview] = useState<InterviewData | null>(null);

  useEffect(() => {
    const fetchFeedback = async () => {
      if (!id) {
        setError('No interview ID provided.');
        setIsLoading(false);
        return;
      }

      try {
        const response = await interviews.getFeedback(id);
        const data = response.data.data;
        setFeedback(data.feedback);
        setInterview(data.interview);
      } catch (err: any) {
        if (err.response?.status === 404) {
          setError('not-found');
        } else {
          setError('Failed to load feedback report. Please try again.');
        }
        console.error('Failed to fetch feedback:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeedback();
  }, [id]);

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
      <div className="min-h-screen bg-background text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Generating your feedback report...</p>
        </div>
      </div>
    );
  }

  if (error === 'not-found') {
    return (
      <div className="min-h-screen bg-background text-white font-sans">
        <Navbar />
        <main className="pt-32 pb-24 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="glass-card p-12">
              <Trophy size={48} className="text-zinc-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Feedback Not Found</h2>
              <p className="text-zinc-400 mb-6">
                This interview doesn't have feedback yet, or the interview ID is invalid.
              </p>
              <Link to="/dashboard">
                <Button variant="primary">Back to Dashboard</Button>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-white font-sans">
        <Navbar />
        <main className="pt-32 pb-24 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="glass-card p-12">
              <h2 className="text-2xl font-bold mb-2 text-red-400">Error</h2>
              <p className="text-zinc-400 mb-6">{error}</p>
              <Button variant="primary" onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
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
    <div className="min-h-screen bg-background text-white font-sans">
      <Navbar />

      <main className="pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-4">
              <Trophy size={16} className="text-emerald-400" />
              <span className="text-sm font-mono text-emerald-400">{getHireRecommendation(feedback.overallScore)}</span>
            </div>
            <h1 className="text-4xl font-bold mb-2">Interview Complete!</h1>
            <p className="text-zinc-400">
              {interviewType} • Session ID: {id} • {completedAt}
            </p>
          </div>

          {/* Overall Score */}
          <div className="glass-card p-8 mb-8 text-center">
            <h2 className="text-sm font-mono text-zinc-400 uppercase mb-2">Overall Score</h2>
            <div className={`text-7xl font-bold ${getScoreColor(feedback.overallScore)}`}>
              {feedback.overallScore}
            </div>
            <p className="text-zinc-400 mt-2">out of 100</p>
          </div>

          {/* Score Breakdown */}
          {feedback.categories && feedback.categories.length > 0 && (
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {feedback.categories.map((category) => (
                <div key={category.name} className="glass-card p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-zinc-800 text-zinc-400">
                      {getCategoryIcon(category.name)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{category.name}</h3>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getScoreBarColor(category.score)} transition-all duration-500`}
                            style={{ width: `${category.score}%` }}
                          />
                        </div>
                        <span className={`text-sm font-bold ${getScoreColor(category.score)}`}>
                          {category.score}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-400">{category.feedback}</p>
                </div>
              ))}
            </div>
          )}

          {/* Summary */}
          {feedback.summary && (
            <div className="glass-card p-6 mb-8">
              <h3 className="font-medium text-zinc-300 mb-3">Summary</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{feedback.summary}</p>
            </div>
          )}

          {/* Strengths & Improvements */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {feedback.strengths && feedback.strengths.length > 0 && (
              <div className="glass-card p-6">
                <h3 className="font-medium text-emerald-400 mb-4 flex items-center gap-2">
                  <Star size={18} /> Strengths
                </h3>
                <ul className="space-y-2">
                  {feedback.strengths.map((item, idx) => (
                    <li key={idx} className="text-sm text-zinc-300 flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">&#10003;</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {feedback.improvements && feedback.improvements.length > 0 && (
              <div className="glass-card p-6">
                <h3 className="font-medium text-yellow-400 mb-4 flex items-center gap-2">
                  <TrendingUp size={18} /> Areas for Improvement
                </h3>
                <ul className="space-y-2">
                  {feedback.improvements.map((item, idx) => (
                    <li key={idx} className="text-sm text-zinc-300 flex items-start gap-2">
                      <span className="text-yellow-400 mt-0.5">&rarr;</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button onClick={() => navigate('/interview-setup')} variant="primary" className="group">
              Practice Again
              <ChevronRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Link to="/analytics">
              <Button variant="secondary">
                <Download size={16} className="mr-2" />
                View All Reports
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FeedbackReport;
