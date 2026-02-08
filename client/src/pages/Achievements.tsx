import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Trophy, Target, Flame, Star, Award, Zap, Clock, Code } from 'lucide-react';
import { interviews } from '../services/api';

interface AchievementDef {
  id: number;
  name: string;
  description: string;
  icon: React.ReactNode;
  check: (stats: StatsData) => boolean;
  progress: (stats: StatsData) => number;
}

interface StatsData {
  totalInterviews: number;
  completedInterviews: number;
  averageScore: number;
  highestScore: number;
  totalBehavioral: number;
  totalTechnical: number;
  totalSystemDesign: number;
}

const achievementDefs: AchievementDef[] = [
  {
    id: 1,
    name: 'First Steps',
    description: 'Complete your first mock interview',
    icon: <Target />,
    check: (stats) => stats.completedInterviews >= 1,
    progress: (stats) => Math.min((stats.completedInterviews / 1) * 100, 100),
  },
  {
    id: 2,
    name: 'Getting Started',
    description: 'Complete 5 mock interviews',
    icon: <Flame />,
    check: (stats) => stats.completedInterviews >= 5,
    progress: (stats) => Math.min((stats.completedInterviews / 5) * 100, 100),
  },
  {
    id: 3,
    name: 'Dedicated Learner',
    description: 'Complete 10 mock interviews',
    icon: <Code />,
    check: (stats) => stats.completedInterviews >= 10,
    progress: (stats) => Math.min((stats.completedInterviews / 10) * 100, 100),
  },
  {
    id: 4,
    name: 'High Achiever',
    description: 'Score above 80% on any interview',
    icon: <Zap />,
    check: (stats) => stats.highestScore >= 80,
    progress: (stats) => Math.min((stats.highestScore / 80) * 100, 100),
  },
  {
    id: 5,
    name: 'Perfect Score',
    description: 'Score 100% on any interview',
    icon: <Star />,
    check: (stats) => stats.highestScore >= 100,
    progress: (stats) => Math.min((stats.highestScore / 100) * 100, 100),
  },
  {
    id: 6,
    name: 'Marathon Runner',
    description: 'Complete 25 interviews',
    icon: <Trophy />,
    check: (stats) => stats.completedInterviews >= 25,
    progress: (stats) => Math.min((stats.completedInterviews / 25) * 100, 100),
  },
  {
    id: 7,
    name: 'Consistent Performer',
    description: 'Maintain an average score above 70%',
    icon: <Clock />,
    check: (stats) => stats.completedInterviews >= 3 && stats.averageScore >= 70,
    progress: (stats) => stats.completedInterviews < 3 ? Math.min((stats.completedInterviews / 3) * 50, 50) : Math.min((stats.averageScore / 70) * 100, 100),
  },
  {
    id: 8,
    name: 'Interview Master',
    description: 'Complete 50 interviews with an average score above 75%',
    icon: <Award />,
    check: (stats) => stats.completedInterviews >= 50 && stats.averageScore >= 75,
    progress: (stats) => {
      const interviewProgress = Math.min(stats.completedInterviews / 50, 1);
      const scoreProgress = stats.averageScore >= 75 ? 1 : stats.averageScore / 75;
      return Math.min((interviewProgress * 0.6 + scoreProgress * 0.4) * 100, 100);
    },
  },
];

const Achievements = () => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await interviews.getStats();
        const data = response.data.data;
        setStats({
          totalInterviews: data.totalInterviews || 0,
          completedInterviews: data.completedInterviews || 0,
          averageScore: data.averageScore || 0,
          highestScore: data.highestScore || 0,
          totalBehavioral: data.totalBehavioral || 0,
          totalTechnical: data.totalTechnical || 0,
          totalSystemDesign: data.totalSystemDesign || 0,
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
        setStats({
          totalInterviews: 0,
          completedInterviews: 0,
          averageScore: 0,
          highestScore: 0,
          totalBehavioral: 0,
          totalTechnical: 0,
          totalSystemDesign: 0,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-white font-sans">
        <Navbar />
        <main className="pt-32 pb-24 px-4">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-zinc-400 font-mono text-sm">Loading achievements...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const badges = achievementDefs.map((def) => ({
    ...def,
    earned: stats ? def.check(stats) : false,
    progressValue: stats ? Math.round(def.progress(stats)) : 0,
  }));

  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <div className="min-h-screen bg-background text-white font-sans">
      <Navbar />

      <main className="pt-32 pb-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
              <Trophy className="text-primary" /> Achievements
            </h1>
            <p className="text-zinc-400">
              You've earned <span className="text-primary font-bold">{earnedCount}</span> of {badges.length} badges
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className={`p-6 rounded-xl border transition-all ${
                  badge.earned
                    ? 'bg-zinc-900/50 border-primary/30'
                    : 'bg-zinc-900/30 border-zinc-800'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                    badge.earned
                      ? 'bg-primary/20 text-primary'
                      : 'bg-zinc-800 text-zinc-500'
                  }`}>
                    {badge.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={`font-bold ${badge.earned ? 'text-white' : 'text-zinc-400'}`}>
                        {badge.name}
                      </h3>
                      {badge.earned && (
                        <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded">Earned</span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-400 mb-2">{badge.description}</p>
                    {badge.earned ? (
                      <p className="text-xs text-zinc-500">Completed</p>
                    ) : (
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-zinc-500">Progress</span>
                          <span className="text-zinc-400">{badge.progressValue}%</span>
                        </div>
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-zinc-600 rounded-full"
                            style={{ width: `${badge.progressValue}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Achievements;
