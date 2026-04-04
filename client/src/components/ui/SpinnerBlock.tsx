import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

interface SpinnerBlockProps {
  message?: string;
  className?: string;
}

export default function SpinnerBlock({ message = 'Loading...', className }: SpinnerBlockProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/8 bg-white/[0.02] px-8 py-16',
        className
      )}
      role="status"
      aria-label={message}
    >
      <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
      <p className="text-sm font-mono text-zinc-400">{message}</p>
    </div>
  );
}
