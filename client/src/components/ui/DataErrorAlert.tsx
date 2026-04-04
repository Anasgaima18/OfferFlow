import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/cn';

interface DataErrorAlertProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export default function DataErrorAlert({
  message = 'Something went wrong loading this data.',
  onRetry,
  className,
}: DataErrorAlertProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-4 rounded-2xl border border-red-500/20 bg-red-500/5 px-6 py-8 text-center',
        className
      )}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10">
        <AlertCircle className="h-7 w-7 text-red-400" aria-hidden />
      </div>
      <p className="text-sm font-medium text-white">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50"
          aria-label="Retry loading"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          Try again
        </button>
      )}
    </div>
  );
}
