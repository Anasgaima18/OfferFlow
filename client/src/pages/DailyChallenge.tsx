import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Button from '../components/ui/Button';
import BlurFade from '../components/ui/BlurFade';
import SurfaceCard from '../components/ui/SurfaceCard';
import StatTile from '../components/ui/StatTile';
import { Clock, Trophy, Flame, ChevronRight, Loader2 } from 'lucide-react';
import { useInterviewStatsQuery } from '../hooks/useInterviewQueries';
import { useDailyChallengeQuery } from '../hooks/useContentQueries';

const difficultyColor: Record<string, string> = {
  Easy: 'text-green-400 bg-green-400/10',
  Medium: 'text-yellow-400 bg-yellow-400/10',
  Hard: 'text-red-400 bg-red-400/10',
};



const DailyChallenge = () => {
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

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeUntilMidnight());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background text-white font-sans">
      <Navbar />

      <main className="pt-32 pb-24 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-4">
              <Flame className="text-primary" size={18} />
              <span className="text-primary font-medium">
                {loading ? '...' : `${stats?.completedInterviews ?? 0} Challenges Done!`}
              </span>
            </div>
            <h1 className="text-4xl font-bold mb-2">Daily Challenge</h1>
            <p className="text-zinc-400">
              Complete today&apos;s challenge to keep improving
            </p>
          </div>

          {/* Timer */}
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

          {/* Challenge Card */}
          <BlurFade delay={0.05}>
          <SurfaceCard className="p-8 mb-8">
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

            <Link to="/interview-setup">
              <Button variant="primary" className="w-full group" disabled={!challenge || challengeQuery.isLoading}>
                Start Challenge
                <ChevronRight className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </SurfaceCard>
          </BlurFade>

          {/* Stats */}
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
      </main>

      <Footer />
    </div>
  );
};

export default DailyChallenge;
