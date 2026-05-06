import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import PageLayout from '../components/ui/PageLayout';
import SurfaceCard from '../components/ui/SurfaceCard';
import HoverGlowButton from '../components/ui/HoverGlowButton';
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
    <PageLayout contentClassName="max-w-3xl">
      <div className="flex min-h-[60vh] items-center justify-center py-10">
        <SurfaceCard className="premium-panel w-full max-w-xl rounded-3xl border border-white/10 p-8 text-center" interactive>
          <h1 className="mb-4 font-pixel text-3xl text-white">VERIFY EMAIL</h1>
          {isLoading ? <p className="text-zinc-400">Verifying your account...</p> : null}
          {!isLoading && !token ? <p className="text-zinc-400">Missing verification token.</p> : null}
          {!isLoading && token && !verified ? <p className="text-zinc-400">Could not verify this token.</p> : null}
          {!isLoading && verified ? <p className="text-zinc-300">Your account is ready. Continue to login.</p> : null}
          <div className="mx-auto mt-6 max-w-52">
            <Link to="/login">
              <HoverGlowButton>
                Go to Login
              </HoverGlowButton>
            </Link>
          </div>
        </SurfaceCard>
      </div>
    </PageLayout>
  );
};

export default VerifyEmail;
