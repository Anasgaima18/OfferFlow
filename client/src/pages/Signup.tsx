import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, Clock, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, Target, User, Zap } from 'lucide-react';
import { auth } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';
import { useFadeIn, useScaleIn, useStaggerFadeIn } from '../hooks/useAnimations';
import { signupSchema, type SignupFormData } from '../lib/authSchema';
import HoverGlowButton from '../components/ui/HoverGlowButton';

const Signup = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit: rhfHandleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', username: '', email: '', password: '' },
  });

  const shellRef = useRef<HTMLDivElement>(null);
  const leftPaneRef = useRef<HTMLDivElement>(null);
  const formCardRef = useRef<HTMLDivElement>(null);
  const socialButtonsRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useFadeIn(shellRef, 0.04, 0.85, 24);
  useFadeIn(leftPaneRef, 0.1);
  useScaleIn(formCardRef, 0.3);
  useStaggerFadeIn(leftPaneRef, '.auth-feature', 0.18, 0.12, 18);
  useStaggerFadeIn(socialButtonsRef, '.auth-social', 0.26, 0.08, 16);
  useStaggerFadeIn(formRef, '.auth-field', 0.32, 0.1, 14);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const features = [
    { icon: Target, text: 'Real FAANG questions' },
    { icon: Zap, text: 'AI-powered feedback' },
    { icon: Clock, text: 'Practice anytime' },
  ];

  const onSubmit = async (values: SignupFormData) => {
    try {
      const { data } = await auth.signup({
        name: values.name,
        username: values.username || undefined,
        email: values.email,
        password: values.password,
      });
      const verificationToken = data.data.verificationToken;
      toast.success('Account created. Please verify your email before login.');
      if (verificationToken) {
        navigate(`/verify-email?token=${encodeURIComponent(verificationToken)}`);
      } else {
        navigate('/login');
      }
    } catch (error) {
      const err = error as { response?: { data?: { message?: string; errors?: { message: string }[] } } };
      const errorData = err.response?.data;
      if (errorData?.errors && errorData.errors.length > 0) {
        toast.error(errorData.errors[0].message);
      } else {
        toast.error(errorData?.message || 'Failed to create account');
      }
    }
  };

  const handleOAuthSignup = (provider: 'google' | 'github') => {
    window.location.href = auth.getOAuthStartUrl(provider);
  };

  return (
    <div className="min-h-screen bg-background flex overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(255,184,0,0.1),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(20,184,166,0.12),transparent_26%)]" />
      <div ref={shellRef} className="relative z-10 flex min-h-screen w-full">
      {/* Left Side - Benefits */}
      <div ref={leftPaneRef} className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative">
        <div>
          <Link to="/" className="flex items-center gap-2 mb-16">
            <Zap size={24} className="text-secondary" />
            <span className="font-pixel text-xl tracking-wider">OFFERFLOW</span>
          </Link>

          <div className="max-w-md">
            <div className="section-kicker mb-5">New Candidate Setup</div>
            <h2 className="font-pixel text-5xl tracking-[0.08em] text-white mb-4">
              START YOUR JOURNEY
            </h2>
            <p className="text-gray-400 font-mono text-sm leading-relaxed mb-8">
              Join thousands of candidates who've improved their interview skills with AI-powered practice.
            </p>

            <div className="rounded-[1.75rem] border border-white/10 bg-white/4 p-5 mb-8 backdrop-blur-xl">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-zinc-500 font-mono mb-3">
                <span>Prep loop activated</span>
                <span className="text-white">Day 01</span>
              </div>
              <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                <div className="h-full w-[68%] rounded-full bg-linear-to-r from-secondary via-primary to-amber-300" />
              </div>
            </div>

            <div className="space-y-6">
              {features.map((feature) => (
                <div key={feature.text} className="auth-feature flex items-center gap-4 rounded-2xl border border-white/8 bg-white/4 px-4 py-4 backdrop-blur-md">
                  <div className="w-10 h-10 rounded-lg glass flex items-center justify-center">
                    <feature.icon size={18} className="text-secondary" />
                  </div>
                  <span className="text-gray-300 font-mono text-sm">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/8 bg-white/3 p-5 max-w-md">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-primary font-mono mb-3">
            <ShieldCheck size={14} /> Guided onboarding
          </div>
          <p className="text-gray-400 text-sm font-mono leading-relaxed">Create the account once, then keep every practice session, report, and leaderboard jump in one place.</p>
        </div>
      </div>

      {/* Right Side - Signup Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div ref={formCardRef} className="premium-panel p-8 md:p-9 rounded-4xl border border-white/10 bg-black/45 shadow-[0_28px_90px_rgba(0,0,0,0.4)]">
            <h1 className="font-pixel text-4xl tracking-[0.08em] text-white text-center mb-2">
              Create Account
            </h1>
            <p className="text-gray-400 text-center text-sm mb-8">
              Already have an account? <Link to="/login" className="text-secondary hover:underline">Sign in</Link>
            </p>

            {/* Social Login Buttons */}
            <div ref={socialButtonsRef} className="flex gap-4 mb-6">
              <button
                type="button"
                onClick={() => handleOAuthSignup('google')}
                aria-label="Continue with Google"
                className="auth-social flex-1 py-3 rounded-2xl border border-white/10 bg-white/4 hover:bg-white/10 transition-colors flex items-center justify-center group"
              >
                <svg className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </button>
              <button
                type="button"
                onClick={() => handleOAuthSignup('github')}
                aria-label="Continue with GitHub"
                className="auth-social flex-1 py-3 rounded-2xl border border-white/10 bg-white/4 hover:bg-white/10 transition-colors flex items-center justify-center group"
              >
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

            <form ref={formRef} onSubmit={rhfHandleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="auth-field">
                <label htmlFor="signup-name" className="block text-sm font-mono text-gray-400 mb-2">Full Name</label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden />
                  <input
                    id="signup-name"
                    type="text"
                    autoComplete="name"
                    placeholder="John Doe"
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? 'signup-name-error' : undefined}
                    className={`w-full bg-white/5 border rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none font-mono text-sm ${errors.name ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-secondary/50'}`}
                    {...register('name')}
                  />
                </div>
                {errors.name && <p id="signup-name-error" className="mt-1.5 text-xs text-red-400 font-mono" role="alert">{errors.name.message}</p>}
              </div>

              <div className="auth-field">
                <label htmlFor="signup-username" className="block text-sm font-mono text-gray-400 mb-2">Username (optional)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden>@</span>
                  <input
                    id="signup-username"
                    type="text"
                    autoComplete="username"
                    placeholder="johndoe"
                    aria-invalid={!!errors.username}
                    aria-describedby={errors.username ? 'signup-username-error' : undefined}
                    className={`w-full bg-white/5 border rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none font-mono text-sm ${errors.username ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-secondary/50'}`}
                    {...register('username')}
                  />
                </div>
                {errors.username && <p id="signup-username-error" className="mt-1.5 text-xs text-red-400 font-mono" role="alert">{errors.username.message}</p>}
              </div>

              <div className="auth-field">
                <label htmlFor="signup-email" className="block text-sm font-mono text-gray-400 mb-2">Email</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden />
                  <input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? 'signup-email-error' : undefined}
                    className={`w-full bg-white/5 border rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none font-mono text-sm ${errors.email ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-secondary/50'}`}
                    {...register('email')}
                  />
                </div>
                {errors.email && <p id="signup-email-error" className="mt-1.5 text-xs text-red-400 font-mono" role="alert">{errors.email.message}</p>}
              </div>

              <div className="auth-field">
                <label htmlFor="signup-password" className="block text-sm font-mono text-gray-400 mb-2">Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden />
                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? 'signup-password-error' : undefined}
                    className={`w-full bg-white/5 border rounded-lg py-3 pl-10 pr-12 text-white placeholder-gray-500 focus:outline-none font-mono text-sm ${errors.password ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-secondary/50'}`}
                    {...register('password')}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <p id="signup-password-error" className="mt-1.5 text-xs text-red-400 font-mono" role="alert">{errors.password.message}</p>}
              </div>

              <div className="auth-field mt-6">
                <HoverGlowButton
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full"
                >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
                </HoverGlowButton>
              </div>
            </form>

            <div className="auth-field mt-6 flex items-center justify-between gap-3 text-xs font-mono text-gray-500">
              <span className="inline-flex items-center gap-2"><ShieldCheck size={12} /> Session history preserved</span>
              <span className="inline-flex items-center gap-2 text-secondary">Get started <ArrowRight size={12} /></span>
            </div>
            <p className="text-center text-gray-500 text-xs mt-4">
              By signing up, you agree to our{' '}
              <Link to="/terms" className="text-secondary hover:underline">Terms</Link> and{' '}
              <Link to="/privacy" className="text-secondary hover:underline">Privacy Policy</Link>
            </p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Signup;
