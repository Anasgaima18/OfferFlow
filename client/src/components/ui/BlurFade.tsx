import type { PropsWithChildren } from 'react';
import { useRef } from 'react';
import { m } from 'framer-motion';
import { useRevealInView } from '../../hooks/useAnimations';
import { cn } from '../../lib/cn';

interface BlurFadeProps extends PropsWithChildren {
  className?: string;
  delay?: number;
  y?: number;
  /** Use Framer Motion for reveal instead of GSAP (still uses GSAP blur-in when false) */
  useMotion?: boolean;
}

export default function BlurFade({ children, className, delay = 0, y = 14, useMotion = false }: BlurFadeProps) {
  const ref = useRef<HTMLDivElement>(null);

  useRevealInView(ref, { delay, y, blur: 8, duration: 0.45 });

  if (useMotion) {
    return (
      <m.div
        initial={{ opacity: 0, y, filter: 'blur(8px)' }}
        whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.45, delay, ease: [0.25, 0.1, 0.25, 1] }}
        className={cn(className)}
      >
        {children}
      </m.div>
    );
  }

  return (
    <div ref={ref} className={cn(className)}>
      {children}
    </div>
  );
}
