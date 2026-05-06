import { useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Compass, Plus, Sparkles, Terminal, Timer, Trophy, Waves, Zap } from 'lucide-react';
import { toast } from 'sonner';
import Button from '../components/ui/Button';
import BlurFade from '../components/ui/BlurFade';
import HoverGlowButton from '../components/ui/HoverGlowButton';
import PageHero from '../components/ui/PageHero';
import PageLayout from '../components/ui/PageLayout';
import SurfaceCard from '../components/ui/SurfaceCard';
import { useAuth } from '../hooks/useAuth';
import { useInterviewStatsQuery, useUserInterviewsQuery } from '../hooks/useInterviewQueries';

const STAT_ICONS = {
    interviews: <Timer size={18} />,
    score: <Terminal size={18} />,
    rank: <Trophy size={18} />,
} as const;

const quickActions = [
    {
        title: 'Leaderboard',
        description: 'Benchmark against top performers and see how your consistency stacks up.',
        href: '/leaderboard',
        icon: <Trophy size={18} />,
    },
    {
        title: 'Analytics',
        description: 'Track your score trend, recent sessions, and interview-type breakdowns.',
        href: '/analytics',
        icon: <Compass size={18} />,
    },
];

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function formatType(type: string): string {
    return type
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function getStatusLabel(status: string): string {
    switch (status) {
        case 'completed':
            return 'Completed';
        case 'in-progress':
            return 'In Progress';
        case 'pending':
            return 'Pending';
        default:
            return status;
    }
}

function getTypeIcon(type: string) {
    switch (type) {
        case 'technical':
            return <Terminal size={18} />;
        case 'system-design':
            return <Zap size={18} />;
        default:
            return <Waves size={18} />;
    }
}

function getTypeColor(type: string): string {
    switch (type) {
        case 'technical':
            return 'text-primary';
        case 'system-design':
            return 'text-fuchsia-300';
        default:
            return 'text-secondary';
    }
}

export default function Dashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const statsQuery = useInterviewStatsQuery();
    const interviewsQuery = useUserInterviewsQuery();
    const stats = statsQuery.data ?? null;
    const recentInterviews = interviewsQuery.data ?? [];
    const loading = statsQuery.isLoading || interviewsQuery.isLoading;

    useEffect(() => {
        if (statsQuery.error || interviewsQuery.error) {
            console.error('Failed to load dashboard data:', statsQuery.error || interviewsQuery.error);
            toast.error('Failed to load dashboard data. Please try again.');
        }
    }, [statsQuery.error, interviewsQuery.error]);

    const statCards = useMemo(() => {
        if (!stats) {
            return [];
        }

        return [
            {
                label: 'Interviews',
                value: String(stats.totalInterviews),
                icon: STAT_ICONS.interviews,
                accent: 'text-secondary',
            },
            {
                label: 'Average Score',
                value: stats.averageScore != null && stats.averageScore > 0 ? `${stats.averageScore.toFixed(1)}%` : '--',
                icon: STAT_ICONS.score,
                accent: 'text-primary',
            },
            {
                label: 'Global Rank',
                value: stats.rank != null && stats.rank > 0 ? `#${stats.rank}` : '--',
                icon: STAT_ICONS.rank,
                accent: 'text-fuchsia-300',
            },
        ];
    }, [stats]);

    const firstName = user?.name?.split(' ')[0] || 'Developer';

    return (
        <PageLayout contentClassName="max-w-7xl">
            <PageHero
                kicker="Command Center"
                title="DASHBOARD"
                description={`Keep momentum visible. ${firstName}, this is your operating layer for new sessions, recent feedback, and measurable progress.`}
                meta={[
                    { label: 'Recent Sessions', value: String(recentInterviews.length) },
                    { label: 'Completed', value: String(stats?.completedInterviews ?? 0) },
                    { label: 'Best Score', value: stats?.highestScore != null ? `${stats.highestScore}%` : '--' },
                ]}
                actions={
                    <>
                        <div className="min-w-[220px]">
                            <HoverGlowButton onClick={() => navigate('/interview-setup')}>
                                <Plus size={18} />
                                Launch New Interview
                            </HoverGlowButton>
                        </div>
                        <Button variant="secondary" size="lg" onClick={() => navigate('/analytics')}>View Analytics</Button>
                    </>
                }
                aside={
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-primary">
                            <Sparkles size={14} />
                            Session Rhythm
                        </div>
                        <div className="rounded-[1.75rem] border border-white/10 bg-white/3 p-5">
                            <div className="mb-4 flex items-center justify-between">
                                <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">Readiness</span>
                                <span className="text-sm font-mono text-white">{stats?.averageScore != null ? `${Math.round(stats.averageScore)}%` : '--'}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-white/8">
                                <div className="h-full rounded-full bg-linear-to-r from-primary via-amber-300 to-orange-400" style={{ width: `${Math.max(12, Math.round(stats?.averageScore ?? 12))}%` }} />
                            </div>
                            <div className="mt-4 grid grid-cols-3 gap-3 text-xs font-mono text-zinc-400">
                                <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-3">
                                    <div className="text-lg text-white">{stats?.totalInterviews ?? 0}</div>
                                    Sessions
                                </div>
                                <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-3">
                                    <div className="text-lg text-white">{stats?.completedInterviews ?? 0}</div>
                                    Closed
                                </div>
                                <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-3">
                                    <div className="text-lg text-white">{stats?.rank != null ? `#${stats.rank}` : '--'}</div>
                                    Rank
                                </div>
                            </div>
                        </div>
                    </div>
                }
            />

            <section className="mb-8 grid gap-5 md:grid-cols-3">
                {loading
                    ? Array.from({ length: 3 }).map((_, index) => (
                            <SurfaceCard key={`dashboard-stat-skeleton-${index}`} className="premium-panel p-6">
                                <div className="animate-pulse space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="h-3 w-24 rounded bg-white/10" />
                                        <div className="h-9 w-9 rounded-2xl bg-white/10" />
                                    </div>
                                    <div className="h-10 w-24 rounded bg-white/10" />
                                </div>
                            </SurfaceCard>
                        ))
                    : statCards.map((stat, index) => (
                            <BlurFade key={stat.label} delay={index * 0.05}>
                                <SurfaceCard className="premium-panel p-6" interactive>
                                    <div className="mb-4 flex items-center justify-between">
                                        <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">{stat.label}</span>
                                        <div className={`rounded-2xl border border-white/10 bg-white/5 p-3 ${stat.accent}`}>{stat.icon}</div>
                                    </div>
                                    <div className="font-pixel text-4xl tracking-[0.08em] text-white">{stat.value}</div>
                                </SurfaceCard>
                            </BlurFade>
                        ))}
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
                <BlurFade>
                    <SurfaceCard className="premium-panel overflow-hidden" interactive>
                        <div className="flex items-center justify-between border-b border-white/8 px-6 py-5">
                            <div>
                                <h2 className="font-pixel text-2xl tracking-[0.08em] text-white">RECENT ACTIVITY</h2>
                                <p className="mt-2 text-sm font-mono text-zinc-400">Completed sessions open feedback. Live sessions reopen the interview room so you can continue where you left off.</p>
                            </div>
                            <Link to="/analytics" className="inline-flex items-center gap-2 text-sm font-mono text-primary transition-colors hover:text-white">
                                Open history
                                <ArrowRight size={16} />
                            </Link>
                        </div>

                        <div className="divide-y divide-white/6">
                            {loading ? (
                                Array.from({ length: 4 }).map((_, index) => (
                                    <div key={`dashboard-row-skeleton-${index}`} className="animate-pulse px-6 py-6">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="h-11 w-11 rounded-2xl bg-white/10" />
                                                <div className="space-y-2">
                                                    <div className="h-4 w-32 rounded bg-white/10" />
                                                    <div className="h-3 w-24 rounded bg-white/10" />
                                                </div>
                                            </div>
                                            <div className="h-7 w-20 rounded-full bg-white/10" />
                                        </div>
                                    </div>
                                ))
                            ) : recentInterviews.length === 0 ? (
                                <div className="px-6 py-16 text-center">
                                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-white/8 bg-white/5 text-zinc-400">
                                        <Plus size={24} />
                                    </div>
                                    <h3 className="font-pixel text-2xl tracking-[0.08em] text-white">NO SESSIONS YET</h3>
                                    <p className="mx-auto mt-3 max-w-md text-sm font-mono text-zinc-400">Start the first interview and this feed becomes your review trail for technical, behavioral, and system design rounds.</p>
                                    <div className="mt-6">
                                        <Button variant="primary" onClick={() => navigate('/interview-setup')}>
                                            <Plus size={18} />
                                            Start First Interview
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                recentInterviews.map((interview) => {
                                    const targetPath = interview.status === 'completed'
                                        ? `/feedback/${interview.id}`
                                        : `/interview/${interview.id}`;

                                    return (
                                    <button
                                        key={interview.id}
                                        type="button"
                                        onClick={() => navigate(targetPath)}
                                        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-white/4"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 ${getTypeColor(interview.type)}`}>
                                                {getTypeIcon(interview.type)}
                                            </div>
                                            <div>
                                                <div className="font-mono text-sm text-white">{formatType(interview.type)} Round</div>
                                                <div className="mt-1 text-xs uppercase tracking-[0.2em] text-zinc-500">{formatDate(interview.created_at)}</div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <span className={`rounded-full border px-3 py-1 text-[11px] font-mono uppercase tracking-[0.18em] ${
                                                interview.status === 'completed'
                                                    ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                                                    : interview.status === 'in-progress'
                                                        ? 'border-amber-300/30 bg-amber-300/10 text-amber-200'
                                                        : 'border-white/10 bg-white/5 text-zinc-400'
                                            }`}>
                                                {getStatusLabel(interview.status)}
                                            </span>
                                            {interview.score != null ? <span className="font-pixel text-xl tracking-[0.08em] text-primary">{interview.score}%</span> : null}
                                            <ArrowRight size={16} className="text-zinc-500" />
                                        </div>
                                    </button>
                                )})
                            )}
                        </div>
                    </SurfaceCard>
                </BlurFade>

                <div className="space-y-6">
                    {quickActions.map((action, index) => (
                        <BlurFade key={action.title} delay={0.08 + index * 0.05}>
                            <Link to={action.href}>
                                <SurfaceCard className="premium-panel p-6" interactive>
                                    <div className="mb-5 flex items-center justify-between">
                                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-primary">{action.icon}</div>
                                        <ArrowRight size={18} className="text-zinc-500" />
                                    </div>
                                    <h3 className="font-pixel text-2xl tracking-[0.08em] text-white">{action.title}</h3>
                                    <p className="mt-3 text-sm font-mono leading-relaxed text-zinc-400">{action.description}</p>
                                </SurfaceCard>
                            </Link>
                        </BlurFade>
                    ))}

                    <BlurFade delay={0.18}>
                        <SurfaceCard className="premium-panel p-6" interactive>
                            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-secondary/10 px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-secondary">
                                <Sparkles size={14} />
                                Coach Note
                            </div>
                            <p className="text-sm font-mono leading-relaxed text-zinc-300">Run one focused interview, review one specific weakness, and repeat. The compounding effect matters more than session volume.</p>
                        </SurfaceCard>
                    </BlurFade>
                </div>
            </section>
        </PageLayout>
    );
}
