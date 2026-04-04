import type { PropsWithChildren } from 'react';
import { useRef } from 'react';
import { useTilt } from '../../hooks/useAnimations';
import { cn } from '../../lib/cn';

interface TiltCardProps extends PropsWithChildren {
  className?: string;
  maxRotate?: number;
  scale?: number;
}

export default function TiltCard({ children, className, maxRotate = 6, scale = 1.02 }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  useTilt(ref, { maxRotate, scale });

  return (
    <div ref={ref} className={cn('will-change-transform', className)}>
      {children}
    </div>
  );
}
