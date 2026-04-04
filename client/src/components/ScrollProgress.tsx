import { prefersReducedMotion } from '../hooks/useAnimations';

export default function ScrollProgress() {
  if (prefersReducedMotion()) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] h-0.5 origin-left bg-linear-to-r from-primary via-secondary to-primary opacity-90"
      style={{ transform: 'scaleX(var(--scroll-progress, 0))' }}
      aria-hidden
    />
  );
}
