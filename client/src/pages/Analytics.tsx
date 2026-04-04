import { useEffect, useMemo } from 'react';
import { BarChart3, Brain, Clock, Mic, Signal, Target, TrendingUp } from 'lucide-react';
import { IInterview } from '../types';
import { useInterviewStatsQuery, useUserInterviewsQuery } from '../hooks/useInterviewQueries';
import BlurFade from '../components/ui/BlurFade';
import PageHero from '../components/ui/PageHero';
import PageLayout from '../components/ui/PageLayout';
import SurfaceCard from '../components/ui/SurfaceCard';

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

const Analytics = () => {
  const statsQuery = useInterviewStatsQuery();
  const interviewsQuery = useUserInterviewsQuery();
  const stats = statsQuery.data ?? null;
  const interviewList = useMemo(() => interviewsQuery.data ?? [], [interviewsQuery.data]);
  const loading = statsQuery.isLoading || interviewsQuery.isLoading;
  const error = useMemo(() => {
    if (statsQuery.error || interviewsQuery.error) {
      return 'Failed to load analytics data. Please try again later.';
    }

    return null;
  }, [statsQuery.error, interviewsQuery.error]);
  
  useEffect(() => {
    if (statsQuery.error || interviewsQuery.error) {
      console.error('Failed to load analytics data:', statsQuery.error || interviewsQuery.error);
    }
  }, [statsQuery.error, interviewsQuery.error]);

  // rerender-memo: Memoize derived chart data so it only recalculates when interviewList changes
  const weeklyData = useMemo(() => buildWeeklyData(interviewList), [interviewList]);
  const typeBreakdown = useMemo(() => buildTypeBreakdown(interviewList), [interviewList]);
  const maxScore = useMemo(() => Math.max(...weeklyData.map((d) => d.score), 1), [weeklyData]);
  const hasWeeklyData = useMemo(() => weeklyData.some((d) => d.score > 0), [weeklyData]);

  const completedInterviews = useMemo(() =>
    interviewList
      .filter((iv) => iv.status === 'completed')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [interviewList]
  );

  const statCards = [
    {
      label: 'Average Score',
      value: stats?.averageScore != null ? `${Math.round(stats.averageScore)}%` : '--',
      icon: <Target size={18} />,
      accent: 'text-primary',
    },
    {
      label: 'Completed',
      value: String(stats?.completedInterviews ?? 0),
      icon: <Clock size={18} />,
      accent: 'text-secondary',
    },
    {
      label: 'Total Interviews',
      value: String(stats?.totalInterviews ?? 0),
      icon: <TrendingUp size={18} />,
      accent: 'text-fuchsia-300',
    },
    {
      label: 'Global Rank',
      value: stats?.rank != null ? `#${stats.rank}` : '--',
      icon: <Brain size={18} />,
      accent: 'text-emerald-300',
    },
  ];

  return (
    <PageLayout contentClassName="max-w-7xl">
      <PageHero
        kicker="Performance Intelligence"
        title="ANALYTICS"
        description="Track how your interview quality evolves over time, which formats are strongest, and where the next lift should come from."
        meta={[
          { label: '7-Day Trend', value: hasWeeklyData ? 'Live' : '--' },
          { label: 'Interview Types', value: String(typeBreakdown.length) },
          { label: 'Recent Reports', value: String(completedInterviews.length) },
        ]}
        aside={
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-secondary/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-secondary">
              <Signal size={14} />
              Trend Capture
            </div>
            <p className="text-sm font-mono leading-relaxed text-zinc-300">Strong prep is visible in the data: steadier averages, more completed interviews, and fewer score swings between formats.</p>
            <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5">
              <div className="grid grid-cols-2 gap-3 text-xs font-mono text-zinc-400">
                <div className="rounded-2xl border border-white/8 bg-white/3 px-4 py-4">
                  <div className="text-lg text-white">{stats?.highestScore != null ? `${stats.highestScore}%` : '--'}</div>
                  Best Score
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/3 px-4 py-4">
                  <div className="text-lg text-white">{stats?.completedInterviews ?? 0}</div>
                  Completed
                </div>
              </div>
            </div>
          </div>
        }
      />

      {error ? <div className="mb-8 rounded-3xl border border-red-400/20 bg-red-400/10 px-5 py-4 text-sm font-mono text-red-200">{error}</div> : null}

      <section className="mb-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => (
              <SurfaceCard key={`analytics-stat-skeleton-${index}`} className="premium-panel p-6">
                <div className="animate-pulse space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-3 w-24 rounded bg-white/10" />
                    <div className="h-9 w-9 rounded-2xl bg-white/10" />
                  </div>
                  <div className="h-9 w-20 rounded bg-white/10" />
                </div>
              </SurfaceCard>
            ))
          : statCards.map((card, index) => (
              <BlurFade key={card.label} delay={index * 0.05}>
                <SurfaceCard className="premium-panel p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">{card.label}</span>
                    <div className={`rounded-2xl border border-white/10 bg-white/5 p-3 ${card.accent}`}>{card.icon}</div>
                  </div>
                  <div className="font-pixel text-4xl tracking-[0.08em] text-white">{card.value}</div>
                </SurfaceCard>
              </BlurFade>
            ))}
      </section>

      <section className="mb-8 grid gap-6 xl:grid-cols-2">
        <BlurFade>
          <SurfaceCard className="premium-panel p-6">
            <h2 className="mb-6 flex items-center gap-2 font-pixel text-2xl tracking-[0.08em] text-white">
              <BarChart3 size={20} className="text-primary" />
              WEEKLY PERFORMANCE
            </h2>
            {hasWeeklyData ? (
              <div className="flex h-52 items-end justify-between gap-3">
                {weeklyData.map((data) => (
                  <div key={data.day} className="flex flex-1 flex-col items-center gap-3">
                    <div className="flex h-full w-full items-end">
                      <div className="group relative w-full">
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 rounded-full border border-white/8 bg-black/60 px-2 py-1 text-[11px] font-mono text-zinc-300 opacity-0 transition-opacity group-hover:opacity-100">
                          {data.score}%
                        </div>
                        <div className="w-full rounded-t-[1.25rem] bg-white/6" style={{ height: `${data.score > 0 ? (data.score / maxScore) * 100 : 6}%` }}>
                          <div className="h-full rounded-t-[1.25rem] bg-linear-to-t from-primary via-amber-300 to-orange-300" />
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-mono uppercase tracking-[0.18em] text-zinc-500">{data.day}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-52 items-center justify-center rounded-[1.75rem] border border-dashed border-white/10 bg-black/20 text-sm font-mono text-zinc-500">
                No interview data from the past 7 days.
              </div>
            )}
          </SurfaceCard>
        </BlurFade>

        <BlurFade delay={0.06}>
          <SurfaceCard className="premium-panel p-6">
            <h2 className="mb-6 flex items-center gap-2 font-pixel text-2xl tracking-[0.08em] text-white">
              <Mic size={20} className="text-secondary" />
              PERFORMANCE BY TYPE
            </h2>
            {typeBreakdown.length > 0 ? (
              <div className="space-y-5">
                {typeBreakdown.map((item) => (
                  <div key={item.type}>
                    <div className="mb-2 flex items-center justify-between text-sm font-mono text-zinc-300">
                      <span>
                        {item.label} <span className="text-zinc-500">({item.count} completed)</span>
                      </span>
                      <span className="text-zinc-400">{item.score}%</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-white/6">
                      <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-52 items-center justify-center rounded-[1.75rem] border border-dashed border-white/10 bg-black/20 text-sm font-mono text-zinc-500">
                Complete interviews to unlock a type breakdown.
              </div>
            )}
          </SurfaceCard>
        </BlurFade>
      </section>

      <BlurFade delay={0.1}>
        <SurfaceCard className="premium-panel overflow-hidden">
          <div className="border-b border-white/8 px-6 py-5">
            <h2 className="font-pixel text-2xl tracking-[0.08em] text-white">RECENT INTERVIEWS</h2>
            <p className="mt-2 text-sm font-mono text-zinc-400">Your latest completed sessions, ordered from newest to oldest.</p>
          </div>

          {loading ? (
            <div className="space-y-3 px-6 py-6">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`analytics-table-skeleton-${index}`} className="grid animate-pulse grid-cols-4 gap-4 rounded-2xl border border-white/6 bg-white/2 px-4 py-4">
                  <div className="h-4 rounded bg-white/10" />
                  <div className="h-4 rounded bg-white/10" />
                  <div className="h-4 rounded bg-white/10" />
                  <div className="h-4 rounded bg-white/10" />
                </div>
              ))}
            </div>
          ) : completedInterviews.length > 0 ? (
            <div className="overflow-x-auto px-6 py-4">
              <table className="w-full min-w-160">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                    <th className="pb-4 font-medium">Type</th>
                    <th className="pb-4 font-medium">Status</th>
                    <th className="pb-4 font-medium">Score</th>
                    <th className="pb-4 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/6">
                  {completedInterviews.map((interview) => (
                    <tr key={interview.id} className="transition-colors hover:bg-white/3">
                      <td className="py-4 font-mono text-sm text-white">{TYPE_LABELS[interview.type] || interview.type}</td>
                      <td className="py-4 text-sm font-mono text-zinc-400 capitalize">{interview.status}</td>
                      <td className="py-4 text-sm font-mono">
                        {interview.score != null ? (
                          <span className={interview.score >= 80 ? 'text-emerald-300' : interview.score >= 60 ? 'text-amber-200' : 'text-red-300'}>
                            {interview.score}%
                          </span>
                        ) : (
                          <span className="text-zinc-500">--</span>
                        )}
                      </td>
                      <td className="py-4 text-sm font-mono text-zinc-500">{formatDate(interview.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-16 text-center text-sm font-mono text-zinc-500">No completed interviews yet.</div>
          )}
        </SurfaceCard>
      </BlurFade>
    </PageLayout>
  );
};

export default Analytics;
