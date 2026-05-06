import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

interface SurfaceCardProps extends HTMLAttributes<HTMLDivElement> {
  muted?: boolean;
  interactive?: boolean;
}

export default function SurfaceCard({
  className,
  muted = false,
  interactive = false,
  children,
  ...props
}: SurfaceCardProps) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-3xl border backdrop-blur-xl transition-all duration-300',
        muted
          ? 'bg-zinc-900/30 border-zinc-800'
          : 'bg-zinc-900/55 border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.3)]',
        interactive ? 'hover:-translate-y-0.5 hover:border-white/20 hover:shadow-[0_30px_100px_rgba(0,0,0,0.42)]' : '',
        className,
      )}
      {...props}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(circle at 20% 0%, rgba(255,184,0,0.09), transparent 45%), radial-gradient(circle at 100% 20%, rgba(20,184,166,0.08), transparent 48%)',
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}