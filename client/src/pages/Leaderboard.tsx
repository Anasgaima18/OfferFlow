import { useEffect } from 'react';
import { Crown, Medal, ShieldCheck, Sparkles, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import BlurFade from '../components/ui/BlurFade';
import PageHero from '../components/ui/PageHero';
import PageLayout from '../components/ui/PageLayout';
import SurfaceCard from '../components/ui/SurfaceCard';
import { useLeaderboardQuery } from '../hooks/useInterviewQueries';

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown size={20} className="text-yellow-300" />;
  if (rank === 2) return <Medal size={20} className="text-zinc-200" />;
  if (rank === 3) return <Medal size={20} className="text-amber-500" />;
  return <span className="font-mono text-sm text-zinc-500">#{rank}</span>;
}

export default function Leaderboard() {
  const leaderboardQuery = useLeaderboardQuery();
  const leaders = leaderboardQuery.data ?? [];
  const isLoading = leaderboardQuery.isLoading;

  useEffect(() => {
    if (leaderboardQuery.error) {
      console.error('Failed to fetch leaderboard:', leaderboardQuery.error);
      toast.error('Failed to load leaderboard. Please try again.');
    }
  }, [leaderboardQuery.error]);

  return (
    <PageLayout contentClassName="max-w-6xl">
      <PageHero
        kicker="Competitive Layer"
        title="LEADERBOARD"
        description="See who is compounding strong interview habits. Rankings reflect completed sessions and average interview performance across the platform."
        meta={[
          { label: 'Tracked Users', value: String(leaders.length) },
          { label: 'Refresh Window', value: '24h' },
          { label: 'Rank Basis', value: 'Score' },
        ]}
        aside={
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-primary">
              <Trophy size={14} />
              Weekly Rankings
            </div>
            <p className="text-sm font-mono leading-relaxed text-zinc-300">Top placements reward both quality and repetition. Keep finishing interviews and lifting your average to move up.</p>
            <div className="grid grid-cols-3 gap-3 text-xs font-mono text-zinc-400">
              <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-3 text-center">
                <div className="text-lg text-yellow-300">#1</div>
                Crown
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-3 text-center">
                <div className="text-lg text-zinc-100">#2</div>
                Silver
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-3 text-center">
                <div className="text-lg text-amber-500">#3</div>
                Bronze
              </div>
            </div>
          </div>
        }
      />

      <BlurFade>
        <SurfaceCard className="premium-panel overflow-hidden">
          <div className="grid grid-cols-12 gap-4 border-b border-white/8 bg-white/3 px-5 py-4 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
            <div className="col-span-2 text-center">Rank</div>
            <div className="col-span-5">Candidate</div>
            <div className="col-span-3 text-right">Interviews</div>
            <div className="col-span-2 text-right">Average</div>
          </div>

          {isLoading ? (
            <div className="space-y-3 px-5 py-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={`leaderboard-skeleton-${index}`} className="grid animate-pulse grid-cols-12 gap-4 rounded-2xl border border-white/6 bg-white/2 px-4 py-4">
                  <div className="col-span-2 h-5 rounded bg-white/10" />
                  <div className="col-span-5 h-5 rounded bg-white/10" />
                  <div className="col-span-3 h-5 rounded bg-white/10" />
                  <div className="col-span-2 h-5 rounded bg-white/10" />
                </div>
              ))}
            </div>
          ) : leaders.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-white/8 bg-white/5 text-zinc-500">
                <ShieldCheck size={24} />
              </div>
              <h2 className="font-pixel text-2xl tracking-[0.08em] text-white">NO RANKINGS YET</h2>
              <p className="mx-auto mt-3 max-w-md text-sm font-mono text-zinc-400">Complete interviews to enter the competitive pool. The board updates after backend score aggregation.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/6">
              {leaders.map((user, index) => (
                <div key={user.userId} className={`grid grid-cols-12 gap-4 px-5 py-5 transition-colors hover:bg-white/3 ${index < 3 ? 'bg-white/2' : ''}`}>
                  <div className="col-span-2 flex items-center justify-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 bg-black/20">
                      <RankIcon rank={user.rank} />
                    </div>
                  </div>
                  <div className="col-span-5 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-linear-to-br from-secondary/30 to-secondary/10 text-sm font-bold text-secondary">
                      {user.avatar ? <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" /> : user.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-mono text-sm text-white">{user.name}</div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-zinc-500">Ranked performer</div>
                    </div>
                  </div>
                  <div className="col-span-3 flex items-center justify-end text-sm font-mono text-zinc-300">{user.totalInterviews}</div>
                  <div className="col-span-2 flex items-center justify-end text-sm font-mono text-primary">{user.averageScore}%</div>
                </div>
              ))}
            </div>
          )}
        </SurfaceCard>
      </BlurFade>

      <div className="mt-6 text-center text-xs font-mono uppercase tracking-[0.18em] text-zinc-500">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/3 px-4 py-2">
          <Sparkles size={14} />
          Rankings refresh every 24 hours based on interview performance.
        </span>
      </div>
    </PageLayout>
  );
}
