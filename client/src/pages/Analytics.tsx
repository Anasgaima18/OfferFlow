import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { BarChart3, TrendingUp, Target, Clock, Brain, Mic } from 'lucide-react';
import { interviews, InterviewStats } from '../services/api';
import { IInterview } from '../types';

interface DayData {
  day: string;
  score: number;
}

interface TypeBreakdown {
  type: string;
  label: string;
  score: number;
  count: number;
  color: string;
}

const TYPE_LABELS: Record<string, string> = {
  behavioral: 'Behavioral',
  technical: 'Technical',
  'system-design': 'System Design',
};

const TYPE_COLORS: Record<string, string> = {
  behavioral: 'bg-secondary',
  technical: 'bg-primary',
  'system-design': 'bg-purple-500',
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

function buildWeeklyData(interviewList: IInterview[]): DayData[] {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const buckets: Record<string, { total: number; count: number }> = {};
  dayNames.forEach((d) => {
    buckets[d] = { total: 0, count: 0 };
  });

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  interviewList
    .filter((iv) => iv.status === 'completed' && iv.score !== null)
    .forEach((iv) => {
      const created = new Date(iv.created_at);
      if (created >= sevenDaysAgo) {
        const dayName = dayNames[created.getDay()];
        buckets[dayName].total += iv.score!;
        buckets[dayName].count += 1;
      }
    });

  // Reorder so chart starts from Monday
  const ordered = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return ordered.map((day) => ({
    day,
    score: buckets[day].count > 0 ? Math.round(buckets[day].total / buckets[day].count) : 0,
  }));
}

function buildTypeBreakdown(interviewList: IInterview[]): TypeBreakdown[] {
  const buckets: Record<string, { total: number; count: number }> = {};

  interviewList
    .filter((iv) => iv.status === 'completed' && iv.score !== null)
    .forEach((iv) => {
      if (!buckets[iv.type]) {
        buckets[iv.type] = { total: 0, count: 0 };
      }
      buckets[iv.type].total += iv.score!;
      buckets[iv.type].count += 1;
    });

  return Object.entries(buckets).map(([type, data]) => ({
    type,
    label: TYPE_LABELS[type] || type,
    score: Math.round(data.total / data.count),
    count: data.count,
    color: TYPE_COLORS[type] || 'bg-blue-500',
  }));
}

/* ---------- Skeleton Primitives ---------- */

const SkeletonBlock = ({ className = '', style }: { className?: string; style?: React.CSSProperties }) => (
  <div className={`bg-zinc-800 rounded animate-pulse ${className}`} style={style} />
);

const StatsCardSkeleton = () => (
  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
    <div className="flex items-center justify-between mb-2">
      <SkeletonBlock className="h-5 w-5" />
      <SkeletonBlock className="h-4 w-10" />
    </div>
    <SkeletonBlock className="h-8 w-16 mb-2" />
    <SkeletonBlock className="h-4 w-24" />
  </div>
);

const ChartSkeleton = () => {
  // Pre-compute values so render is pure
  const heights = [60, 45, 80, 50, 75, 40, 90];
  
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
      <SkeletonBlock className="h-5 w-40 mb-6" />
      <div className="flex items-end justify-between h-40 gap-2">
        {heights.map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center">
            <SkeletonBlock
              className="w-full rounded-t-md"
              style={{ height: `${h}%` } as React.CSSProperties}
            />
            <SkeletonBlock className="h-3 w-6 mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
};

const BreakdownSkeleton = () => (
  <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
    <SkeletonBlock className="h-5 w-40 mb-6" />
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i}>
          <div className="flex justify-between mb-1">
            <SkeletonBlock className="h-4 w-28" />
            <SkeletonBlock className="h-4 w-10" />
          </div>
          <SkeletonBlock className="h-2 w-full rounded-full" />
        </div>
      ))}
    </div>
  </div>
);

const TableSkeleton = () => (
  <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
    <SkeletonBlock className="h-5 w-40 mb-6" />
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-8">
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="h-4 w-20" />
          <SkeletonBlock className="h-4 w-12" />
          <SkeletonBlock className="h-4 w-20" />
        </div>
      ))}
    </div>
  </div>
);

/* ---------- Main Component ---------- */

const Analytics = () => {
  const [stats, setStats] = useState<InterviewStats | null>(null);
  const [interviewList, setInterviewList] = useState<IInterview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [statsRes, interviewsRes] = await Promise.all([
          interviews.getStats(),
          interviews.getAll(),
        ]);

        const statsData = statsRes.data?.data as InterviewStats;
        const interviewsData = (interviewsRes.data?.data?.interviews ?? []) as IInterview[];

        setStats(statsData);
        setInterviewList(interviewsData);
      } catch (err: unknown) {
        console.error('Failed to load analytics data:', err);
        setError('Failed to load analytics data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Derived chart data
  const weeklyData = buildWeeklyData(interviewList);
  const typeBreakdown = buildTypeBreakdown(interviewList);
  const maxScore = Math.max(...weeklyData.map((d) => d.score), 1);
  const hasWeeklyData = weeklyData.some((d) => d.score > 0);

  const completedInterviews = interviewList
    .filter((iv) => iv.status === 'completed')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="min-h-screen bg-background text-white font-sans">
      <Navbar />

      <main className="pt-32 pb-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Analytics</h1>
            <p className="text-zinc-400">Track your interview performance over time</p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Stats Cards */}
          {loading ? (
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <StatsCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <Target className="text-primary" size={20} />
                </div>
                <div className="text-2xl font-bold">
                  {stats?.averageScore != null ? `${Math.round(stats.averageScore)}%` : '--'}
                </div>
                <div className="text-sm text-zinc-400">Average Score</div>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="text-secondary" size={20} />
                </div>
                <div className="text-2xl font-bold">{stats?.completedInterviews ?? 0}</div>
                <div className="text-sm text-zinc-400">Completed</div>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="text-purple-400" size={20} />
                </div>
                <div className="text-2xl font-bold">{stats?.totalInterviews ?? 0}</div>
                <div className="text-sm text-zinc-400">Total Interviews</div>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <Brain className="text-pink-400" size={20} />
                </div>
                <div className="text-2xl font-bold">
                  {stats?.rank != null ? `#${stats.rank}` : '--'}
                </div>
                <div className="text-sm text-zinc-400">Global Rank</div>
              </div>
            </div>
          )}

          {/* Charts Row */}
          {loading ? (
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <ChartSkeleton />
              <BreakdownSkeleton />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              {/* Weekly Performance Chart */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                <h3 className="font-bold mb-6 flex items-center gap-2">
                  <BarChart3 size={18} /> Weekly Performance
                </h3>
                {hasWeeklyData ? (
                  <div className="flex items-end justify-between h-40 gap-2">
                    {weeklyData.map((data) => (
                      <div key={data.day} className="flex-1 flex flex-col items-center">
                        {data.score > 0 ? (
                          <div
                            className="w-full bg-primary/80 rounded-t-md transition-all hover:bg-primary relative group"
                            style={{ height: `${(data.score / maxScore) * 100}%` }}
                          >
                            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity">
                              {data.score}%
                            </span>
                          </div>
                        ) : (
                          <div className="w-full bg-zinc-800/40 rounded-t-md" style={{ height: '4px' }} />
                        )}
                        <span className="text-xs text-zinc-400 mt-2">{data.day}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-40 text-zinc-500 text-sm">
                    No interview data from the past 7 days
                  </div>
                )}
              </div>

              {/* Type Breakdown */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                <h3 className="font-bold mb-6 flex items-center gap-2">
                  <Mic size={18} /> Performance by Type
                </h3>
                {typeBreakdown.length > 0 ? (
                  <div className="space-y-4">
                    {typeBreakdown.map((item) => (
                      <div key={item.type}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>
                            {item.label}{' '}
                            <span className="text-zinc-500">({item.count} completed)</span>
                          </span>
                          <span className="text-zinc-400">{item.score}%</span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${item.color} rounded-full transition-all`}
                            style={{ width: `${item.score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-40 text-zinc-500 text-sm">
                    Complete interviews to see your performance breakdown
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recent Interviews Table */}
          {loading ? (
            <TableSkeleton />
          ) : (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
              <h3 className="font-bold mb-6">Recent Interviews</h3>
              {completedInterviews.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-zinc-400 border-b border-zinc-800">
                        <th className="pb-3">Type</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3">Score</th>
                        <th className="pb-3">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedInterviews.map((interview) => (
                        <tr
                          key={interview.id}
                          className="border-b border-zinc-800/50 hover:bg-zinc-800/20"
                        >
                          <td className="py-4 font-medium">
                            {TYPE_LABELS[interview.type] || interview.type}
                          </td>
                          <td className="py-4 text-zinc-400 capitalize">{interview.status}</td>
                          <td className="py-4">
                            {interview.score != null ? (
                              <span
                                className={`font-bold ${
                                  interview.score >= 80
                                    ? 'text-green-400'
                                    : interview.score >= 60
                                    ? 'text-yellow-400'
                                    : 'text-red-400'
                                }`}
                              >
                                {interview.score}%
                              </span>
                            ) : (
                              <span className="text-zinc-500">--</span>
                            )}
                          </td>
                          <td className="py-4 text-zinc-500 text-sm">
                            {formatDate(interview.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-zinc-500">
                  <p className="text-sm">No completed interviews yet</p>
                  <p className="text-xs mt-1">
                    Start an interview to see your results here
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Analytics;
