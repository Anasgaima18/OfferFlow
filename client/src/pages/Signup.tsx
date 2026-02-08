import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Target, Zap, Clock, Mail, Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react';
import { auth } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';

const Signup = () => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const features = [
    { icon: Target, text: 'Real FAANG questions' },
    { icon: Zap, text: 'AI-powered feedback' },
    { icon: Clock, text: 'Practice anytime' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data } = await auth.signup({ name, email, password });
      login(data.token, data.user);
      toast.success('Account created successfully!');
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to create account');
      console.error('Signup error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Benefits */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative">
        <div>
          <Link to="/" className="flex items-center gap-2 mb-16">
            <Zap size={24} className="text-secondary" />
            <span className="font-pixel text-xl tracking-wider">OFFERFLOW</span>
          </Link>

          <div className="max-w-md">
            <h2 className="font-pixel text-3xl tracking-wide text-white mb-4">
              START YOUR JOURNEY
            </h2>
            <p className="text-gray-400 font-mono text-sm leading-relaxed mb-12">
              Join thousands of candidates who've improved their interview skills with AI-powered practice.
            </p>

            <div className="space-y-6">
              {features.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg glass flex items-center justify-center">
                    <feature.icon size={18} className="text-secondary" />
                  </div>
                  <span className="text-gray-300 font-mono text-sm">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-gray-600 text-xs font-mono">
          © {new Date().getFullYear()} OfferFlow
        </p>
      </div>

      {/* Right Side - Signup Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="glass-card p-8">
            <h1 className="font-pixel text-3xl tracking-wide text-white text-center mb-2">
              Create Account
            </h1>
            <p className="text-gray-400 text-center text-sm mb-8">
              Already have an account? <Link to="/login" className="text-secondary hover:underline">Sign in</Link>
            </p>

            {/* Social Login Buttons - Placeholder */}
            <div className="flex gap-4 mb-6">
              <button className="flex-1 py-3 rounded-lg glass hover:bg-white/10 transition-colors flex items-center justify-center group">
                <svg className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </button>
              <button className="flex-1 py-3 rounded-lg glass hover:bg-white/10 transition-colors flex items-center justify-center group">
                <svg className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </button>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-4 bg-background text-gray-500 font-mono">or continue with email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-mono text-gray-400 mb-2">Full Name</label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-secondary/50 font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-mono text-gray-400 mb-2">Username</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="johndoe"
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-secondary/50 font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-mono text-gray-400 mb-2">Email</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-secondary/50 font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-mono text-gray-400 mb-2">Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-secondary/50 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-gradient py-3 rounded-lg font-mono text-sm mt-6 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            <p className="text-center text-gray-500 text-xs mt-6">
              By signing up, you agree to our{' '}
              <Link to="/terms" className="text-secondary hover:underline">Terms</Link> and{' '}
              <Link to="/privacy" className="text-secondary hover:underline">Privacy Policy</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
