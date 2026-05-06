import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { m, useInView } from 'framer-motion';
import { ArrowRight, ShieldCheck, Sparkles, Star, Users, Zap } from 'lucide-react';
import BlurFade from './ui/BlurFade';
import HoverGlowButton from './ui/HoverGlowButton';
import SurfaceCard from './ui/SurfaceCard';

/* ─── Animated counter (counts from 0 → target on scroll-in) ─── */
const AnimatedCounter: React.FC<{ target: number; suffix?: string; duration?: number }> = ({
  target,
  suffix = '',
  duration = 1.8,
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / (duration * 60);
    const tick = () => {
      start += step;
      if (start >= target) {
        setValue(target);
        return;
      }
      setValue(Math.floor(start));
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, target, duration]);

  return (
    <span ref={ref}>
      {value.toLocaleString()}
      {suffix}
    </span>
  );
};

/* ─── Typewriter lines for terminal ─── */
const terminalLines = [
  { id: 'prompt', type: 'prompt', text: '~' },
  { id: 'command', type: 'cmd', text: ' offerflow start --role "Frontend Engineer" --level senior' },
  { id: 'bank', type: 'output', text: '▸ Loading question bank… 247 scenarios ready' },
  { id: 'calibration', type: 'output', text: '▸ AI interviewer calibrated to L5 expectations' },
  { id: 'session', type: 'success', text: '✓ Session active — voice + code editor enabled' },
  { id: 'follow-up', type: 'accent', text: '▸ "Walk me through how you\'d architect a real-time dashboard…"' },
];

const Hero: React.FC = () => {
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    if (visibleLines >= terminalLines.length) return;
    const timer = setTimeout(() => setVisibleLines((v) => v + 1), 650);
    return () => clearTimeout(timer);
  }, [visibleLines]);

  return (
    <section className="hero-shell relative flex items-center">
      {/* Backdrop FX */}
      <div className="hero-backdrop" aria-hidden>
        <div className="hero-orb hero-orb-left" />
        <div className="hero-orb hero-orb-right" />
        <div className="hero-grid" />
        <div className="hero-noise" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 py-24 md:py-32">
        {/* ─── Top row: kicker + social proof ─── */}
        <BlurFade delay={0.04}>
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="section-kicker">
              <Sparkles className="w-3.5 h-3.5 text-secondary" />
              AI-Powered Interview Prep
            </div>
            <div className="social-proof-bar">
              <div className="social-proof-divider hidden sm:block" />
              <div className="social-proof-stat">
                <Users className="w-3.5 h-3.5 text-secondary" />
                <span className="stat-value">12,400+</span> engineers practicing
              </div>
              <div className="social-proof-divider hidden sm:block" />
              <div className="social-proof-stat">
                <Star className="w-3.5 h-3.5 text-primary" />
                <span className="stat-value">4.9</span> avg. rating
              </div>
            </div>
          </div>
        </BlurFade>

        {/* ─── Hero grid: copy + terminal ─── */}
        <div className="grid items-center gap-12 lg:grid-cols-[1.06fr_0.94fr] lg:gap-14">
          {/* Left: copy */}
          <div>
            <BlurFade delay={0.08}>
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold font-mono tracking-tight leading-[1.08] mb-6">
                <span className="hero-text-gradient">Stop guessing.</span>
                <br />
                Start rehearsing.
              </h1>
            </BlurFade>

            <BlurFade delay={0.14}>
              <p className="text-zinc-400 text-base md:text-lg font-mono leading-relaxed max-w-xl mb-8">
                OfferFlow drops you into a realistic mock interview — voice + live code editor — and shows you exactly where your answers lose signal. Built for engineers who treat prep like practice, not prayer.
              </p>
            </BlurFade>

            <BlurFade delay={0.2}>
              <div className="mb-10 flex flex-col gap-3 sm:flex-row">
                <Link to="/signup" className="block sm:w-[260px]">
                  <HoverGlowButton className="w-full">
                    Start Free Interview <ArrowRight className="w-4 h-4" />
                  </HoverGlowButton>
                </Link>
                <Link
                  to="/features"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/4 px-6 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-zinc-200 transition-colors hover:border-white/30 hover:bg-white/8"
                >
                  See How It Works
                </Link>
              </div>
            </BlurFade>

            {/* Trust strip */}
            <BlurFade delay={0.28}>
              <p className="mb-3 text-[11px] font-mono uppercase tracking-[0.16em] text-zinc-500">
                Engineers from these companies trust OfferFlow
              </p>
              <div className="trust-strip">
                {['Google', 'Meta', 'Amazon', 'Stripe', 'Shopify'].map((name) => (
                  <span key={name} className="trust-logo">{name}</span>
                ))}
              </div>
            </BlurFade>
          </div>

          {/* Right: interactive terminal preview */}
          <BlurFade delay={0.16}>
            <m.div
              className="space-y-4"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7, ease: 'easeOut' }}
            >
              <div className="hero-terminal-enhanced">
                <div className="hero-terminal-dots">
                  <span className="bg-red-500/70" />
                  <span className="bg-yellow-500/70" />
                  <span className="bg-green-500/70" />
                  <span className="ml-auto text-[10px] font-mono text-zinc-600 tracking-wider uppercase">
                    offerflow session
                  </span>
                </div>
                <div className="hero-terminal-body">
                  {terminalLines.slice(0, visibleLines).map((line) => (
                    <m.div
                      key={line.id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.35 }}
                    >
                      <span className={`term-${line.type}`}>{line.text}</span>
                    </m.div>
                  ))}
                  {visibleLines < terminalLines.length && (
                    <span className="typewriter-cursor text-secondary">▋</span>
                  )}
                </div>
              </div>

              <SurfaceCard interactive className="premium-panel p-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/15 text-emerald-300">
                      <ShieldCheck size={14} />
                    </div>
                    <div className="text-sm font-mono text-zinc-400">Session realism</div>
                    <div className="mt-1 font-pixel text-3xl text-white tracking-[0.05em]">92%</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <Zap size={14} />
                    </div>
                    <div className="text-sm font-mono text-zinc-400">Avg response latency</div>
                    <div className="mt-1 font-pixel text-3xl text-white tracking-[0.05em]">1.8s</div>
                  </div>
                </div>
              </SurfaceCard>
            </m.div>
          </BlurFade>
        </div>

        {/* ─── Stats Row ─── */}
        <BlurFade delay={0.34}>
          <div className="stats-row mt-20">
            {[
              { value: 50000, suffix: '+', label: 'Mock Interviews Run' },
              { value: 87, suffix: '%', label: 'Offer Rate After Prep' },
              { value: 40, suffix: '+', label: 'Languages Supported' },
            ].map((s) => (
              <div key={s.label} className="stat-card">
                <div className="stat-number">
                  <AnimatedCounter target={s.value} suffix={s.suffix} />
                </div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </BlurFade>

        {/* ─── Testimonial mini-strip ─── */}
        <BlurFade delay={0.4}>
          <div className="grid md:grid-cols-2 gap-6 mt-14">
            {[
              {
                initials: 'SK',
                name: 'Sarah K.',
                role: 'SWE @ Google',
                quote: 'OfferFlow\'s voice mode exposed habits I didn\'t know I had. Two weeks of practice → L5 offer.',
              },
              {
                initials: 'JM',
                name: 'James M.',
                role: 'Frontend Lead @ Stripe',
                quote: 'The code editor + real-time follow-ups made this feel like an actual on-site. Nothing else comes close.',
              },
            ].map((t) => (
              <m.div
                key={t.initials}
                className="testimonial-card"
                whileHover={{ y: -3, borderColor: 'rgba(255,255,255,0.12)' }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="testimonial-avatar">{t.initials}</div>
                  <div>
                    <div className="font-mono text-sm text-white">{t.name}</div>
                    <div className="text-xs text-zinc-500 font-mono">{t.role}</div>
                  </div>
                    <div className="ml-auto flex gap-0.5">
                      {['1', '2', '3', '4', '5'].map((star) => (
                        <Star key={`${t.initials}-${star}`} className="w-3 h-3 text-primary fill-primary" />
                      ))}
                    </div>
                </div>
                <p className="text-zinc-400 text-sm leading-relaxed font-mono">"{t.quote}"</p>
              </m.div>
            ))}
          </div>
        </BlurFade>
      </div>
    </section>
  );
};

export default Hero;
