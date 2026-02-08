import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Trophy, Medal, Crown } from 'lucide-react';
import { interviews } from '../services/api';
import { toast } from 'sonner';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar?: string;
  totalInterviews: number;
  averageScore: number;
}

const RankIcon = ({ rank }: { rank: number }) => {
  if (rank === 1) return <Crown size={20} className="text-yellow-400" />;
  if (rank === 2) return <Medal size={20} className="text-gray-300" />;
  if (rank === 3) return <Medal size={20} className="text-amber-600" />;
  return <span className="font-mono text-gray-500">#{rank}</span>;
};

const Leaderboard = () => {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await interviews.getLeaderboard();
        setLeaders(response.data.data.leaderboard);
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
        toast.error('Failed to load leaderboard. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  return (
    <div className="min-h-screen bg-background text-white font-sans">
      <Navbar />

      <main className="pt-32 pb-24 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
              <Trophy size={16} className="text-primary" />
              <span className="text-sm font-mono text-gray-300">Weekly Rankings</span>
            </div>

            <h1 className="font-pixel text-4xl md:text-5xl tracking-wider text-white mb-4">
              GLOBAL LEADERBOARD
            </h1>
            <p className="text-gray-400 font-mono">
              See who's mastering the interviews this week.
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-zinc-400 font-mono text-sm">Loading rankings...</p>
              </div>
            </div>
          ) : leaders.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <Trophy size={48} className="text-zinc-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">No Rankings Yet</h2>
              <p className="text-zinc-400 font-mono text-sm">
                Complete interviews to appear on the leaderboard.
              </p>
            </div>
          ) : (
            <>
              {/* Leaderboard Table */}
              <div className="glass-card overflow-hidden">
                {/* Header Row */}
                <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/10 bg-white/5">
                  <div className="col-span-2 text-center text-xs font-mono text-gray-500 uppercase tracking-wider">Rank</div>
                  <div className="col-span-5 text-xs font-mono text-gray-500 uppercase tracking-wider">User</div>
                  <div className="col-span-3 text-right text-xs font-mono text-gray-500 uppercase tracking-wider">Interviews</div>
                  <div className="col-span-2 text-right text-xs font-mono text-gray-500 uppercase tracking-wider">Avg Score</div>
                </div>

                {/* User Rows */}
                {leaders.map((user, idx) => (
                  <div
                    key={user.userId}
                    className={`grid grid-cols-12 gap-4 p-4 border-b border-white/5 hover:bg-white/5 transition-colors items-center ${idx < 3 ? 'bg-white/2' : ''}`}
                  >
                    <div className="col-span-2 flex justify-center">
                      <RankIcon rank={user.rank} />
                    </div>
                    <div className="col-span-5 font-medium flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-linear-to-br from-secondary/30 to-secondary/10 flex items-center justify-center text-xs font-bold text-secondary overflow-hidden">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-full h-full object-cover rounded-full" />
                        ) : (
                          user.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <div className="font-mono text-sm">{user.name}</div>
                      </div>
                    </div>
                    <div className="col-span-3 text-right text-sm text-gray-400 font-mono">
                      {user.totalInterviews}
                    </div>
                    <div className="col-span-2 text-right text-sm font-bold text-secondary font-mono">
                      {user.averageScore}%
                    </div>
                  </div>
                ))}
              </div>

              {/* Note */}
              <p className="text-center text-gray-500 text-xs font-mono mt-8">
                Rankings update every 24 hours based on interview performance
              </p>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Leaderboard;
