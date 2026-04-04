import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import BlurFade from '../components/ui/BlurFade';
import PageHero from '../components/ui/PageHero';
import PageLayout from '../components/ui/PageLayout';
import SurfaceCard from '../components/ui/SurfaceCard';
import StatTile from '../components/ui/StatTile';
import DataErrorAlert from '../components/ui/DataErrorAlert';
import { Clock, Trophy, Flame, ChevronRight, Loader2 } from 'lucide-react';
import { useInterviewStatsQuery } from '../hooks/useInterviewQueries';
import { useDailyChallengeQuery } from '../hooks/useContentQueries';

const difficultyColor: Record<string, string> = {
  Easy: 'text-green-400 bg-green-400/10',
  Medium: 'text-yellow-400 bg-yellow-400/10',
  Hard: 'text-red-400 bg-red-400/10',
};



const DailyChallenge = () => {
  const navigate = useNavigate();

  const getTimeUntilMidnight = () => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const diff = midnight.getTime() - now.getTime();
    return {
      hours: Math.floor(diff / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
    };
  };

  const [timeLeft, setTimeLeft] = useState(() => getTimeUntilMidnight());
  const statsQuery = useInterviewStatsQuery();
  const stats = statsQuery.data;
  const loading = statsQuery.isLoading;

  const challengeQuery = useDailyChallengeQuery();
  const challenge = challengeQuery.data?.challenge;
  const dataError = statsQuery.isError || challengeQuery.isError;

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeUntilMidnight());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <PageLayout contentClassName="max-w-5xl">
      <PageHero
        kicker="Daily Momentum"
        title="DAILY CHALLENGE"
        description="A single focused challenge every day. Build streaks, sharpen pattern recognition, and keep your prep loop active even on busy days."
        meta={[
          { label: 'Completed', value: loading ? '--' : String(stats?.completedInterviews ?? 0) },
          { label: 'Total Sessions', value: loading ? '--' : String(stats?.totalInterviews ?? 0) },
          { label: 'Rank', value: loading ? '--' : `#${stats?.rank ?? '-'}` },
        ]}
        aside={<div className="text-sm font-mono leading-relaxed text-zinc-300">Reset happens at midnight. One good daily rep is enough to keep the interview muscle active.</div>}
      />

      {dataError && (
        <BlurFade>
          <DataErrorAlert
            message="Could not load today's challenge or your stats. Check your connection and try again."
            onRetry={() => { statsQuery.refetch(); challengeQuery.refetch(); }}
            className="mb-8 max-w-xl mx-auto"
          />
        </BlurFade>
      )}

      <div className="mx-auto max-w-3xl">
        <BlurFade>
          <SurfaceCard className="p-6 mb-8">
            <div className="flex items-center justify-center gap-2 text-zinc-400 mb-4">
              <Clock size={18} />
              <span>Time until next challenge</span>
            </div>
            <div className="flex justify-center gap-4">
              {(['hours', 'minutes', 'seconds'] as const).map((unit) => (
                <div key={unit} className="text-center">
                  <div className="w-16 h-16 bg-zinc-800 rounded-xl flex items-center justify-center text-2xl font-mono font-bold">
                    {String(timeLeft[unit]).padStart(2, '0')}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1 capitalize">
                    {unit}
                  </div>
                </div>
              ))}
            </div>
          </SurfaceCard>
          </BlurFade>

          <BlurFade delay={0.05}>
          <SurfaceCard className="premium-panel p-8 mb-8">
            <div className="flex items-center justify-between mb-4">
              {challenge ? (
                <>
                  <span
                    className={`text-sm font-medium px-3 py-1 rounded-full ${difficultyColor[challenge.difficulty] ?? 'text-zinc-400 bg-zinc-400/10'}`}
                  >
                    {challenge.difficulty}
                  </span>
                  <span className="text-sm text-zinc-400">
                    Asked by {challenge.company}
                  </span>
                </>
              ) : (
                <span className="text-sm text-zinc-500">Loading today&apos;s challenge...</span>
              )}
            </div>

            <h2 className="text-2xl font-bold mb-4">{challenge?.title ?? 'Preparing challenge...'}</h2>
            <p className="text-zinc-400 mb-6 leading-relaxed">
              {challenge
                ? `${challenge.title} from the ${challenge.category} track with a historical acceptance rate of ${challenge.acceptance}.`
                : 'We are pulling the current daily challenge from the backend.'}
            </p>

            <Button
              variant="primary"
              className="w-full group"
              disabled={!challenge || challengeQuery.isLoading}
              onClick={() => navigate('/interview-setup')}
            >
              Start Challenge
              <ChevronRight className="ml-2 transition-transform group-hover:translate-x-1" />
            </Button>
          </SurfaceCard>
          </BlurFade>

          <div className="grid grid-cols-3 gap-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex items-center justify-center h-26"
                >
                  <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
                </div>
              ))
            ) : (
              <>
                <BlurFade delay={0.1}><StatTile icon={<Trophy className="w-5 h-5 text-primary" />} label="Challenges Done" value={String(stats?.completedInterviews ?? 0)} accentClassName="text-primary" /></BlurFade>
                <BlurFade delay={0.14}><StatTile icon={<Flame className="w-5 h-5 text-orange-400" />} label="Total Sessions" value={String(stats?.totalInterviews ?? 0)} accentClassName="text-orange-400" /></BlurFade>
                <BlurFade delay={0.18}><StatTile icon={<Trophy className="w-5 h-5 text-secondary" />} label="Global Rank" value={`#${stats?.rank ?? '-'}`} accentClassName="text-secondary" /></BlurFade>
              </>
            )}
          </div>
      </div>
    </PageLayout>
  );
};

export default DailyChallenge;
