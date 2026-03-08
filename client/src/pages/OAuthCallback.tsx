import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { auth } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

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
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="glass-card p-8 text-center max-w-md w-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Completing sign-in</h1>
        <p className="text-zinc-400 text-sm">We&apos;re finishing your OAuth login and preparing your dashboard.</p>
      </div>
    </div>
  );
};

export default OAuthCallback;