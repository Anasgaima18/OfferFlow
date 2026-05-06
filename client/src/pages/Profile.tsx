import { Link } from 'react-router-dom';
import { Calendar, Mail, ShieldCheck, Trophy, Target, Upload, Clock } from 'lucide-react';
import BlurFade from '../components/ui/BlurFade';
import PageHero from '../components/ui/PageHero';
import PageLayout from '../components/ui/PageLayout';
import StatTile from '../components/ui/StatTile';
import SurfaceCard from '../components/ui/SurfaceCard';
import DataErrorAlert from '../components/ui/DataErrorAlert';
import SpinnerBlock from '../components/ui/SpinnerBlock';
import { useAuth } from '../hooks/useAuth';
import { useInterviewStatsQuery } from '../hooks/useInterviewQueries';
import { buttonStyles } from '../lib/buttonStyles';
import { auth } from '../services/api';
import { toast } from 'sonner';

const Profile = () => {
  const { user, logout } = useAuth();
  const statsQuery = useInterviewStatsQuery();
  const stats = statsQuery.data;
  const isLoading = statsQuery.isLoading;
  const isError = statsQuery.isError;
  const userName = user?.name || 'User';
  const userEmail = user?.email || '';
  const userAvatar = user?.avatar;

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm('Delete your account and associated data? This cannot be undone.');
    if (!confirmed) return;
    try {
      await auth.deleteAccount();
      toast.success('Your account has been deleted.');
      logout();
    } catch {
      toast.error('Failed to delete account. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <PageLayout contentClassName="max-w-5xl">
        <SpinnerBlock message="Loading profile..." className="min-h-[40vh]" />
      </PageLayout>
    );
  }

  if (isError) {
    return (
      <PageLayout contentClassName="max-w-5xl">
        <PageHero kicker="Identity Layer" title="PROFILE" description="Your prep identity and performance snapshot." />
        <DataErrorAlert
          message="Could not load your profile stats. Your account info is still available below."
          onRetry={() => statsQuery.refetch()}
          className="max-w-xl mx-auto"
        />
        <section className="mt-8">
          <SurfaceCard className="premium-panel p-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-br from-primary to-secondary text-2xl font-bold text-black">
                {userAvatar ? <img src={userAvatar} alt={userName} className="h-full w-full rounded-full object-cover" /> : userName.charAt(0)}
              </div>
              <h2 className="font-pixel text-2xl text-white">{userName}</h2>
              <p className="text-sm text-zinc-400">{userEmail}</p>
              <Link to="/dashboard" className={buttonStyles({ variant: 'primary', size: 'md' })}>
                Go to Dashboard
              </Link>
            </div>
          </SurfaceCard>
        </section>
      </PageLayout>
    );
  }

  return (
    <PageLayout contentClassName="max-w-6xl">
      <PageHero
        kicker="Identity Layer"
        title="PROFILE"
        description="Your prep identity and performance snapshot live here. Use resume review to tighten your story before the next live session."
        meta={[
          { label: 'Total Interviews', value: String(stats?.totalInterviews ?? 0) },
          { label: 'Average Score', value: `${Math.round(stats?.averageScore ?? 0)}%` },
          { label: 'Completed', value: String(stats?.completedInterviews ?? 0) },
        ]}
        actions={
          <Link to="/dashboard" className={buttonStyles({ variant: 'primary', size: 'lg' })}>
            View Dashboard
          </Link>
        }
        aside={
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-primary">
              <ShieldCheck size={14} />
              Profile Signals
            </div>
            <p className="text-sm font-mono leading-relaxed text-zinc-300">Avatar sync comes from your sign-in provider today, and resume review is available as a dedicated workflow for sharpening your narrative.</p>
          </div>
        }
      />

      <section className="mb-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <BlurFade>
          <SurfaceCard className="premium-panel p-8">
            <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
              <div>
                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-linear-to-br from-primary to-secondary text-4xl font-bold text-black">
                  {userAvatar ? <img src={userAvatar} alt={userName} className="h-full w-full object-cover" /> : userName.charAt(0)}
                </div>
                <div className="mt-4 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-center text-[11px] uppercase tracking-[0.18em] text-zinc-400">
                  Avatar synced
                </div>
              </div>

              <div className="flex-1 text-center md:text-left">
                <h2 className="font-pixel text-3xl tracking-[0.08em] text-white">{userName}</h2>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm font-mono text-zinc-400 md:justify-start">
                  <span className="inline-flex items-center gap-2"><Mail size={14} /> {userEmail}</span>
                  <span className="inline-flex items-center gap-2"><Calendar size={14} /> Active member</span>
                </div>
                <p className="mt-5 max-w-xl text-sm font-mono leading-relaxed text-zinc-400">This profile keeps your account identity, results, and prep utilities in one place so it is easy to move from reflection into the next rep.</p>
              </div>
            </div>
          </SurfaceCard>
        </BlurFade>

        <BlurFade delay={0.05}>
          <SurfaceCard className="premium-panel p-8">
            <h3 className="font-pixel text-2xl tracking-[0.08em] text-white">PERSONAL STATS</h3>
            <div className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <StatTile icon={<Trophy className="h-6 w-6 text-primary" />} label="Interviews" value={String(stats?.totalInterviews ?? 0)} accentClassName="text-primary" />
              <StatTile icon={<Target className="h-6 w-6 text-secondary" />} label="Average" value={`${Math.round(stats?.averageScore ?? 0)}%`} accentClassName="text-secondary" />
              <StatTile icon={<Clock className="h-6 w-6 text-fuchsia-300" />} label="Completed" value={String(stats?.completedInterviews ?? 0)} accentClassName="text-fuchsia-300" />
            </div>
          </SurfaceCard>
        </BlurFade>
      </section>

      <BlurFade delay={0.1}>
        <SurfaceCard className="premium-panel p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-secondary/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-secondary">
                <Upload size={14} />
                Resume Review
              </div>
              <h3 className="font-pixel text-2xl tracking-[0.08em] text-white">REVIEW YOUR RESUME</h3>
              <p className="mt-3 max-w-2xl text-sm font-mono leading-relaxed text-zinc-400">Run your latest resume through the reviewer for fast hiring-focused feedback on clarity, positioning, and signal strength before interviews.</p>
            </div>
            <Link to="/resume-review" className={buttonStyles({ variant: 'secondary', size: 'md' })}>
              Open Resume Review
            </Link>
          </div>

          <div className="mt-6 rounded-[1.75rem] border border-dashed border-white/10 bg-black/20 px-6 py-8">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Accepted Files</div>
                <div className="mt-2 text-sm font-mono text-white">PDF and DOCX</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Turnaround</div>
                <div className="mt-2 text-sm font-mono text-white">A few seconds</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Output</div>
                <div className="mt-2 text-sm font-mono text-white">Score, summary, and coaching notes</div>
              </div>
            </div>
            <p className="mt-6 max-w-2xl text-sm font-mono leading-relaxed text-zinc-400">Review feedback is live today. Saved resume-driven interview personalization is still expanding, so the resume reviewer is the current source of truth for this workflow.</p>
          </div>
          <div className="mt-8 pt-6 border-t border-white/10">
            <button
              type="button"
              onClick={handleDeleteAccount}
              className="text-xs uppercase tracking-[0.18em] text-red-400 hover:text-red-300"
            >
              Delete Account
            </button>
          </div>
        </SurfaceCard>
      </BlurFade>
    </PageLayout>
  );
};

export default Profile;
