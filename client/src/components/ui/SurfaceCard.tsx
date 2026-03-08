import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

interface SurfaceCardProps extends HTMLAttributes<HTMLDivElement> {
  muted?: boolean;
}

export default function SurfaceCard({ className, muted = false, ...props }: SurfaceCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border backdrop-blur-xl',
        muted ? 'bg-zinc-900/30 border-zinc-800' : 'bg-zinc-900/50 border-zinc-800/90 shadow-[0_20px_80px_rgba(0,0,0,0.28)]',
        className,
      )}
      {...props}
    />
  );
}