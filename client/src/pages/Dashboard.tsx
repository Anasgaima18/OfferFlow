import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Plus, Clock, Terminal, Trophy, ChevronRight, Zap } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { interviews } from '../services/api';
import { IInterview } from '../types';
import { toast } from 'sonner';

interface DashboardStats {
    totalInterviews: number;
    completedInterviews: number;
    averageScore: number;
    rank: number;
}

const StatSkeleton: React.FC = () => (
    <div className="glass-card p-6 animate-pulse">
        <div className="flex items-center justify-between mb-4">
            <div className="h-3 w-20 bg-white/10 rounded" />
            <div className="h-9 w-9 bg-white/10 rounded-lg" />
        </div>
        <div className="h-10 w-24 bg-white/10 rounded" />
    </div>
);

const RowSkeleton: React.FC = () => (
    <div className="p-6 flex items-center justify-between animate-pulse">
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-white/10" />
            <div>
                <div className="h-4 w-32 bg-white/10 rounded mb-2" />
                <div className="h-3 w-24 bg-white/10 rounded" />
            </div>
        </div>
        <div className="flex items-center gap-6">
            <div className="h-6 w-20 bg-white/10 rounded-full" />
            <div className="h-6 w-12 bg-white/10 rounded" />
        </div>
    </div>
);

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentInterviews, setRecentInterviews] = useState<IInterview[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [statsRes, interviewsRes] = await Promise.all([
                    interviews.getStats(),
                    interviews.getAll(),
                ]);

                setStats(statsRes.data.data);
                setRecentInterviews(interviewsRes.data.data.interviews);
            } catch (error) {
                console.error('Failed to load dashboard data:', error);
                toast.error('Failed to load dashboard data. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const formatType = (type: string): string => {
        return type
            .split('-')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const getStatusLabel = (status: string): string => {
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
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'technical':
                return <Terminal size={18} />;
            case 'system-design':
                return <Zap size={18} />;
            default:
                return <Clock size={18} />;
        }
    };

    const getTypeColor = (type: string): string => {
        switch (type) {
            case 'technical':
                return 'text-primary';
            case 'system-design':
                return 'text-purple-400';
            default:
                return 'text-secondary';
        }
    };

    const statCards = stats
        ? [
              {
                  label: 'Interviews',
                  value: String(stats.totalInterviews),
                  icon: <Clock size={20} />,
                  color: 'text-secondary',
              },
              {
                  label: 'Technical Score',
                  value: stats.averageScore > 0 ? stats.averageScore.toFixed(1) : '--',
                  icon: <Terminal size={20} />,
                  color: 'text-primary',
              },
              {
                  label: 'Global Rank',
                  value: stats.rank > 0 ? `#${stats.rank}` : '--',
                  icon: <Trophy size={20} />,
                  color: 'text-purple-400',
              },
          ]
        : [];

    const firstName = user?.name?.split(' ')[0] || 'Developer';

    return (
        <div className="min-h-screen bg-background text-white">
            <Navbar />

            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-4">
                    <div>
                        <h1 className="font-pixel text-3xl tracking-wider text-white mb-2">DASHBOARD</h1>
                        <p className="text-gray-400 font-mono text-sm">
                            Welcome back, {firstName}.
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/interview-setup')}
                        className="btn-gradient font-mono text-sm inline-flex items-center gap-2"
                    >
                        <Plus size={18} />
                        New Interview
                    </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    {loading
                        ? Array.from({ length: 3 }).map((_, i) => <StatSkeleton key={i} />)
                        : statCards.map((stat, i) => (
                              <div
                                  key={i}
                                  className="glass-card p-6 hover:-translate-y-1 transition-all duration-300"
                              >
                                  <div className="flex items-center justify-between mb-4">
                                      <span className="text-gray-400 text-xs font-mono uppercase tracking-wider">
                                          {stat.label}
                                      </span>
                                      <div className={`${stat.color} glass p-2 rounded-lg`}>
                                          {stat.icon}
                                      </div>
                                  </div>
                                  <div className="font-pixel text-4xl tracking-wider">
                                      {stat.value}
                                  </div>
                              </div>
                          ))}
                </div>

                {/* Recent Activity */}
                <div className="glass-card overflow-hidden">
                    <div className="p-6 border-b border-white/10 flex items-center justify-between">
                        <h2 className="font-mono text-lg font-semibold">Recent Activity</h2>
                        <Link
                            to="/analytics"
                            className="text-secondary text-sm font-mono hover:underline inline-flex items-center gap-1"
                        >
                            View All <ChevronRight size={14} />
                        </Link>
                    </div>

                    <div className="divide-y divide-white/5">
                        {loading ? (
                            Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={i} />)
                        ) : recentInterviews.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="text-gray-500 font-mono text-sm mb-4">
                                    No interviews yet. Start your first one!
                                </div>
                                <button
                                    onClick={() => navigate('/interview-setup')}
                                    className="btn-gradient font-mono text-sm inline-flex items-center gap-2"
                                >
                                    <Plus size={18} />
                                    New Interview
                                </button>
                            </div>
                        ) : (
                            recentInterviews.map((interview) => (
                                <div
                                    key={interview.id}
                                    onClick={() => navigate(`/feedback/${interview.id}`)}
                                    className="p-6 hover:bg-white/5 transition-colors flex items-center justify-between cursor-pointer"
                                >
                                    <div className="flex items-center gap-4">
                                        <div
                                            className={`w-10 h-10 rounded-lg glass flex items-center justify-center ${getTypeColor(interview.type)}`}
                                        >
                                            {getTypeIcon(interview.type)}
                                        </div>
                                        <div>
                                            <p className="font-mono font-medium text-white">
                                                {formatType(interview.type)} Round
                                            </p>
                                            <p className="text-gray-500 text-sm font-mono">
                                                {formatDate(interview.created_at)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-mono ${
                                                interview.status === 'completed'
                                                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                                    : interview.status === 'in-progress'
                                                      ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                                      : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                                            }`}
                                        >
                                            {getStatusLabel(interview.status)}
                                        </span>

                                        {interview.score !== null && (
                                            <span className="font-pixel text-xl text-secondary">
                                                {interview.score}%
                                            </span>
                                        )}

                                        <ChevronRight
                                            size={18}
                                            className="text-gray-400 group-hover:text-white transition-colors"
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="mt-8 grid md:grid-cols-2 gap-6">
                    <Link
                        to="/leaderboard"
                        className="glass-card p-6 hover:-translate-y-1 transition-all duration-300 group"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-mono font-semibold text-white mb-1">
                                    Leaderboard
                                </h3>
                                <p className="text-gray-500 text-sm">See your global ranking</p>
                            </div>
                            <ChevronRight
                                size={20}
                                className="text-gray-500 group-hover:text-secondary transition-colors"
                            />
                        </div>
                    </Link>

                    <Link
                        to="/analytics"
                        className="glass-card p-6 hover:-translate-y-1 transition-all duration-300 group"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-mono font-semibold text-white mb-1">
                                    Analytics
                                </h3>
                                <p className="text-gray-500 text-sm">Track your progress</p>
                            </div>
                            <ChevronRight
                                size={20}
                                className="text-gray-500 group-hover:text-secondary transition-colors"
                            />
                        </div>
                    </Link>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Dashboard;
