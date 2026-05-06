import type { ReactNode } from 'react';
import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import SurfaceCard from './SurfaceCard';
import { prefersReducedMotion } from '../../hooks/useAnimations';

interface MetaItem {
  label: string;
  value: string;
}

interface PageHeroProps {
  kicker: string;
  title: string;
  description: string;
  meta?: MetaItem[];
  actions?: ReactNode;
  aside?: ReactNode;
}

export default function PageHero({ kicker, title, description, meta = [], actions, aside }: PageHeroProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const kickerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const asideRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (prefersReducedMotion() || !sectionRef.current) return;
    const kicker = kickerRef.current;
    const title = titleRef.current;
    const desc = descRef.current;
    const actions = actionsRef.current;
    const aside = asideRef.current;
    const els = [kicker, title, desc, actions, aside].filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    gsap.set(els, { opacity: 0, y: 24 });
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    if (kicker) tl.to(kicker, { opacity: 1, y: 0, duration: 0.5 }, 0);
    if (title) tl.to(title, { opacity: 1, y: 0, duration: 0.55 }, 0.08);
    if (desc) tl.to(desc, { opacity: 1, y: 0, duration: 0.5 }, 0.16);
    if (actions) tl.to(actions, { opacity: 1, y: 0, duration: 0.45 }, 0.24);
    if (aside) tl.to(aside, { opacity: 1, y: 0, duration: 0.6 }, 0.12);
  }, { scope: sectionRef });

  return (
    <section ref={sectionRef} className="mb-14">
      <div className="grid xl:grid-cols-[0.9fr_1.1fr] gap-8 items-start">
        <div>
          <div ref={kickerRef} className="section-kicker mb-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">{kicker}</div>
          <h1 ref={titleRef} className="font-pixel text-5xl md:text-6xl tracking-[0.05em] text-white mb-5">{title}</h1>
          <p ref={descRef} className="text-zinc-400 font-mono leading-relaxed max-w-2xl text-sm md:text-base">{description}</p>
          {actions ? <div ref={actionsRef} className="mt-8 flex flex-wrap gap-3">{actions}</div> : <div ref={actionsRef} className="sr-only" aria-hidden />}
        </div>
        <div ref={asideRef}>
          <SurfaceCard className="premium-panel p-6 md:p-8 border-white/10" interactive>
            {aside}
            {meta.length > 0 ? (
              <div className="grid sm:grid-cols-3 gap-4 mt-6">
                {meta.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/8 bg-white/4 px-4 py-4">
                    <div className="text-2xl font-mono text-white">{item.value}</div>
                    <div className="text-xs uppercase tracking-[0.18em] text-zinc-500 mt-1">{item.label}</div>
                  </div>
                ))}
              </div>
            ) : null}
          </SurfaceCard>
        </div>
      </div>
    </section>
  );
}