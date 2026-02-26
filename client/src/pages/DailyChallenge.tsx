import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Button from '../components/ui/Button';
import { Clock, Trophy, Flame, ChevronRight, Loader2 } from 'lucide-react';
import { interviews, InterviewStats } from '../services/api';

// Rotating daily challenges — one per day based on day-of-year
const challengePool = [
  {
    title: 'Two Sum',
    difficulty: 'Easy',
    company: 'Google',
    description:
      'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
  },
  {
    title: 'Valid Parentheses',
    difficulty: 'Easy',
    company: 'Amazon',
    description:
      'Given a string s containing just the characters \'(\', \')\', \'{\', \'}\', \'[\' and \']\', determine if the input string is valid.',
  },
  {
    title: 'Merge Intervals',
    difficulty: 'Medium',
    company: 'Meta',
    description:
      'Given an array of intervals where intervals[i] = [starti, endi], merge all overlapping intervals.',
  },
  {
    title: 'LRU Cache',
    difficulty: 'Medium',
    company: 'Microsoft',
    description:
      'Design a data structure that follows the constraints of a Least Recently Used (LRU) cache.',
  },
  {
    title: 'Trapping Rain Water',
    difficulty: 'Hard',
    company: 'Goldman Sachs',
    description:
      'Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.',
  },
  {
    title: 'Longest Substring Without Repeating Characters',
    difficulty: 'Medium',
    company: 'Apple',
    description:
      'Given a string s, find the length of the longest substring without repeating characters.',
  },
  {
    title: 'Reverse Linked List',
    difficulty: 'Easy',
    company: 'Adobe',
    description:
      'Given the head of a singly linked list, reverse the list, and return the reversed list.',
  },
];

function getDailyChallenge() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return challengePool[dayOfYear % challengePool.length];
}

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

  const [timeLeft, setTimeLeft] = useState(getTimeUntilMidnight());
  const [stats, setStats] = useState<InterviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  const challenge = getDailyChallenge();

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeUntilMidnight());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await interviews.getStats();
        if (res.data.success && res.data.data) {
          setStats(res.data.data);
        }
      } catch {
        // Stats will show fallback
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
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
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 mb-8">
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
          </div>

          {/* Challenge Card */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 mb-8">
            <div className="flex items-center justify-between mb-4">
              <span
                className={`text-sm font-medium px-3 py-1 rounded-full ${difficultyColor[challenge.difficulty] ?? 'text-zinc-400 bg-zinc-400/10'}`}
              >
                {challenge.difficulty}
              </span>
              <span className="text-sm text-zinc-400">
                Asked by {challenge.company}
              </span>
            </div>

            <h2 className="text-2xl font-bold mb-4">{challenge.title}</h2>
            <p className="text-zinc-400 mb-6 leading-relaxed">
              {challenge.description}
            </p>

            <Link to="/interview-setup">
              <Button variant="primary" className="w-full group">
                Start Challenge
                <ChevronRight className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex items-center justify-center h-[104px]"
                >
                  <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
                </div>
              ))
            ) : (
              <>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
                  <Trophy className="w-6 h-6 text-primary mx-auto mb-2" />
                  <div className="text-xl font-bold">
                    {stats?.completedInterviews ?? 0}
                  </div>
                  <div className="text-xs text-zinc-400">Challenges Done</div>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
                  <Flame className="w-6 h-6 text-orange-400 mx-auto mb-2" />
                  <div className="text-xl font-bold">
                    {stats?.totalInterviews ?? 0}
                  </div>
                  <div className="text-xs text-zinc-400">Total Sessions</div>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
                  <Trophy className="w-6 h-6 text-secondary mx-auto mb-2" />
                  <div className="text-xl font-bold">
                    #{stats?.rank ?? '-'}
                  </div>
                  <div className="text-xs text-zinc-400">Global Rank</div>
                </div>
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
