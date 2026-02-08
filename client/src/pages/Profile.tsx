import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Button from '../components/ui/Button';
import { Mail, Calendar, Trophy, Target, Clock, Edit2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { interviews } from '../services/api';

interface Stats {
  totalInterviews: number;
  averageScore: number;
  completedInterviews: number;
}

const Profile = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const [statsRes, interviewsRes] = await Promise.all([
          interviews.getStats(),
          interviews.getAll(),
        ]);

        const statsData = statsRes.data.data;
        const interviewList = interviewsRes.data.data.interviews || interviewsRes.data.data || [];

        setStats({
          totalInterviews: Array.isArray(interviewList) ? interviewList.length : statsData.totalInterviews || 0,
          averageScore: statsData.averageScore || 0,
          completedInterviews: statsData.completedInterviews || 0,
        });
      } catch (error) {
        console.error('Failed to fetch profile data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, []);

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
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 mb-8">
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
          </div>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 text-center">
              <Trophy className="w-8 h-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">{stats?.totalInterviews ?? 0}</div>
              <div className="text-sm text-zinc-400">Total Interviews</div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 text-center">
              <Target className="w-8 h-8 text-secondary mx-auto mb-2" />
              <div className="text-2xl font-bold">{stats?.averageScore ?? 0}%</div>
              <div className="text-sm text-zinc-400">Average Score</div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 text-center">
              <Clock className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <div className="text-2xl font-bold">{stats?.completedInterviews ?? 0}</div>
              <div className="text-sm text-zinc-400">Completed</div>
            </div>
          </div>

          {/* Resume Upload */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
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
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Profile;
