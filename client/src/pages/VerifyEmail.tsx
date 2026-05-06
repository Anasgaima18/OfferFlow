import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { auth } from '../services/api';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        await auth.verifyEmail(token);
        setVerified(true);
        toast.success('Email verified successfully');
      } catch {
        toast.error('Verification link is invalid or expired');
      } finally {
        setIsLoading(false);
      }
    };
    void run();
  }, [token]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="premium-panel max-w-md w-full p-8 rounded-3xl border border-white/10 text-center">
        <h1 className="font-pixel text-3xl text-white mb-4">VERIFY EMAIL</h1>
        {isLoading ? <p className="text-zinc-400">Verifying your account...</p> : null}
        {!isLoading && !token ? <p className="text-zinc-400">Missing verification token.</p> : null}
        {!isLoading && token && !verified ? <p className="text-zinc-400">Could not verify this token.</p> : null}
        {!isLoading && verified ? <p className="text-zinc-400">Your account is ready. Continue to login.</p> : null}
        <Link to="/login" className="inline-block mt-6 text-secondary hover:underline">
          Go to Login
        </Link>
      </div>
    </div>
  );
};

export default VerifyEmail;
