import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Button from '../components/ui/Button';
import BlurFade from '../components/ui/BlurFade';
import SurfaceCard from '../components/ui/SurfaceCard';
import StatTile from '../components/ui/StatTile';
import { Mail, Calendar, Trophy, Target, Clock, Edit2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useInterviewStatsQuery } from '../hooks/useInterviewQueries';

const Profile = () => {
  const { user } = useAuth();
  const statsQuery = useInterviewStatsQuery();
  const stats = statsQuery.data;
  const isLoading = statsQuery.isLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-white font-sans">
        <Navbar />
        <main className="pt-32 pb-24 px-4">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-zinc-400 font-mono text-sm">Loading profile...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const userName = user?.name || 'User';
  const userEmail = user?.email || '';
  const userAvatar = user?.avatar;

  return (
    <div className="min-h-screen bg-background text-white font-sans">
      <Navbar />

      <main className="pt-32 pb-24 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Profile Header */}
          <BlurFade>
          <SurfaceCard className="p-8 mb-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Avatar */}
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-linear-to-br from-primary to-secondary flex items-center justify-center text-4xl font-bold text-black overflow-hidden">
                  {userAvatar ? (
                    <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
                  ) : (
                    userName.charAt(0)
                  )}
                </div>
                <button aria-label="Edit Avatar" className="absolute bottom-0 right-0 w-8 h-8 bg-zinc-800 border border-zinc-700 rounded-full flex items-center justify-center hover:bg-zinc-700 transition-colors">
                  <Edit2 size={14} />
                </button>
              </div>

              {/* Info */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-2xl font-bold mb-1">{userName}</h1>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-zinc-400 mb-4">
                  <span className="flex items-center gap-1"><Mail size={14} /> {userEmail}</span>
                  <span className="flex items-center gap-1"><Calendar size={14} /> Member</span>
                </div>

                <Link to="/dashboard">
                  <Button variant="primary" size="sm">View Dashboard</Button>
                </Link>
              </div>
            </div>
          </SurfaceCard>
          </BlurFade>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <BlurFade delay={0.05}><StatTile icon={<Trophy className="w-6 h-6 text-primary" />} label="Total Interviews" value={String(stats?.totalInterviews ?? 0)} accentClassName="text-primary" /></BlurFade>
            <BlurFade delay={0.1}><StatTile icon={<Target className="w-6 h-6 text-secondary" />} label="Average Score" value={`${stats?.averageScore ?? 0}%`} accentClassName="text-secondary" /></BlurFade>
            <BlurFade delay={0.15}><StatTile icon={<Clock className="w-6 h-6 text-purple-400" />} label="Completed" value={String(stats?.completedInterviews ?? 0)} accentClassName="text-purple-400" /></BlurFade>
          </div>

          {/* Resume Upload */}
          <BlurFade delay={0.2}>
          <SurfaceCard className="p-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Edit2 size={20} /> Resume
            </h2>
            <p className="text-sm text-zinc-400 mb-4">
              Upload your resume to get personalized interview questions based on your experience.
            </p>
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                id="resume-upload"
              />
              <label
                htmlFor="resume-upload"
                className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                Choose File
              </label>
              <span className="text-sm text-zinc-500">No file selected</span>
            </div>
            <p className="text-xs text-zinc-600 mt-3">
              Supported formats: PDF, DOC, DOCX (max 5MB)
            </p>
          </SurfaceCard>
          </BlurFade>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Profile;
