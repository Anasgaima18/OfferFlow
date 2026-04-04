import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { auth } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useFadeIn, useScaleIn, useStaggerFadeIn } from '../hooks/useAnimations';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const shellRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);

  useFadeIn(shellRef, 0.08, 0.8, 24);
  useScaleIn(cardRef, 0.16);
  useStaggerFadeIn(chipsRef, '.oauth-chip', 0.22, 0.08, 18);

  useEffect(() => {
    const exchange = async () => {
      const code = searchParams.get('code');

      if (!code) {
        toast.error('Missing OAuth login code');
        navigate('/login', { replace: true });
        return;
      }

      try {
        const response = await auth.exchangeOAuth(code);
        login(response.data.data.token, response.data.data.user);
        toast.success('Signed in successfully');
      } catch (error) {
        const err = error as { response?: { data?: { message?: string } } };
        toast.error(err.response?.data?.message || 'OAuth sign-in failed');
        navigate('/login', { replace: true });
      }
    };

    void exchange();
  }, [login, navigate, searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(255,184,0,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.12),transparent_32%)]" />
      <div ref={shellRef} className="relative z-10 w-full max-w-lg">
        <div ref={cardRef} className="premium-panel rounded-[2rem] border border-white/10 bg-black/45 p-8 md:p-10 text-center shadow-[0_30px_100px_rgba(0,0,0,0.42)]">
          <div className="mx-auto mb-5 flex h-18 w-18 items-center justify-center rounded-3xl border border-primary/20 bg-primary/10 text-primary">
            <Loader2 className="h-9 w-9 animate-spin" />
          </div>
          <div className="section-kicker mx-auto mb-5 w-fit">OAuth Handshake</div>
          <h1 className="font-pixel text-4xl tracking-[0.08em] text-white mb-3">COMPLETING SIGN-IN</h1>
          <p className="mx-auto max-w-md text-sm font-mono leading-relaxed text-zinc-400">We&apos;re validating your provider response, creating the session, and preparing your dashboard.</p>
          <div ref={chipsRef} className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="oauth-chip rounded-2xl border border-white/8 bg-white/4 px-4 py-4 text-left">
              <ShieldCheck className="mb-3 h-5 w-5 text-secondary" />
              <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Auth</div>
              <div className="mt-1 text-sm font-mono text-white">Verified</div>
            </div>
            <div className="oauth-chip rounded-2xl border border-white/8 bg-white/4 px-4 py-4 text-left">
              <Sparkles className="mb-3 h-5 w-5 text-primary" />
              <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Session</div>
              <div className="mt-1 text-sm font-mono text-white">Provisioning</div>
            </div>
            <div className="oauth-chip rounded-2xl border border-white/8 bg-white/4 px-4 py-4 text-left">
              <Loader2 className="mb-3 h-5 w-5 animate-spin text-zinc-300" />
              <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Redirect</div>
              <div className="mt-1 text-sm font-mono text-white">Queued</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OAuthCallback;