import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export default function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-white/8 bg-white/[0.02] px-8 py-16 text-center',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-zinc-400">
        {icon}
      </div>
      <h3 className="font-mono text-lg font-semibold text-white">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-zinc-400">{description}</p>}
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}
