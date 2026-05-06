import { useEffect, useRef, type ReactNode } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { prefersReducedMotion } from '../hooks/useAnimations';

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    document.documentElement.style.setProperty('--scroll-progress', '0');

    if (prefersReducedMotion()) {
      return () => {
        document.documentElement.style.setProperty('--scroll-progress', '0');
      };
    }

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - 2 ** (-10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      touchMultiplier: 2,
    });

    lenisRef.current = lenis;

    const onRaf = (time: number) => {
      // GSAP ticker time is in seconds; Lenis expects milliseconds.
      lenis.raf(time * 1000);
      const limit = lenis.limit - window.innerHeight;
      const progress = limit > 0 ? lenis.scroll / limit : 0;
      document.documentElement.style.setProperty('--scroll-progress', String(Math.max(0, Math.min(progress, 1))));
    };

    gsap.ticker.lagSmoothing(0);
    gsap.ticker.add(onRaf);

    return () => {
      gsap.ticker.remove(onRaf);
      lenis.destroy();
      lenisRef.current = null;
      document.documentElement.style.setProperty('--scroll-progress', '0');
    };
  }, []);

  return <>{children}</>;
}
