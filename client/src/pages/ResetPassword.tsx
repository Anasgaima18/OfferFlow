import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { auth } from '../services/api';

const formSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
});

type FormData = z.infer<typeof formSchema>;

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const resetToken = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [isResetMode, setIsResetMode] = useState(Boolean(resetToken));
  const [busy, setBusy] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: FormData) => {
    setBusy(true);
    try {
      if (isResetMode) {
        await auth.resetPassword(resetToken, values.password || '');
        toast.success('Password reset successful. You can now login.');
      } else {
        const { data } = await auth.forgotPassword(values.email);
        if (data.data.resetToken) {
          toast.success('Reset token generated (dev mode). Redirecting...');
          window.location.href = `/reset-password?token=${encodeURIComponent(data.data.resetToken)}`;
          return;
        }
        toast.success('If your email exists, reset instructions were sent.');
      }
    } catch {
      toast.error('Unable to complete this action.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="premium-panel max-w-md w-full p-8 rounded-3xl border border-white/10">
        <h1 className="font-pixel text-3xl text-white mb-2">{isResetMode ? 'SET NEW PASSWORD' : 'RESET PASSWORD'}</h1>
        <p className="text-zinc-400 text-sm mb-6">
          {isResetMode ? 'Enter your new password below.' : 'Enter your account email to receive reset instructions.'}
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {!isResetMode ? (
            <div>
              <input className="w-full bg-white/5 border border-white/10 rounded-lg py-3 px-4 text-white" placeholder="you@example.com" {...register('email')} />
              {errors.email ? <p className="text-xs text-red-400 mt-1">{errors.email.message}</p> : null}
            </div>
          ) : (
            <div>
              <input className="w-full bg-white/5 border border-white/10 rounded-lg py-3 px-4 text-white" placeholder="New password" type="password" {...register('password')} />
              {errors.password ? <p className="text-xs text-red-400 mt-1">{errors.password.message}</p> : null}
            </div>
          )}
          <button disabled={busy} type="submit" className="w-full btn-gradient py-3 rounded-2xl disabled:opacity-60">
            {busy ? 'Please wait...' : isResetMode ? 'Update Password' : 'Send Reset Link'}
          </button>
        </form>
        {isResetMode ? (
          <button type="button" onClick={() => setIsResetMode(false)} className="text-xs text-zinc-400 mt-4 hover:text-zinc-200">
            Use email flow instead
          </button>
        ) : null}
        <div className="mt-6 text-xs text-zinc-500">
          <Link to="/login" className="hover:text-zinc-300">Back to login</Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
