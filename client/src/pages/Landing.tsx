import React, { useRef } from 'react';
import { m } from 'framer-motion';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import ProcessSection from '../components/ProcessSection';
import Footer from '../components/Footer';
import { Mic, Code2, BarChart3, Radar, Gauge, Layers3 } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';
import { useStaggerFadeIn, useFadeIn, useAnimeStagger, prefersReducedMotion } from '../hooks/useAnimations';
import BlurFade from '../components/ui/BlurFade';
import SurfaceCard from '../components/ui/SurfaceCard';
import TiltCard from '../components/ui/TiltCard';

const featureCards = [
  {
    icon: Mic,
    title: 'Voice Pressure Rehearsal',
    body: 'Train your pacing and clarity in a live conversational loop instead of reading static prompts off a page.',
    accent: 'from-primary/20 to-primary/5',
    glow: 'shadow-[0_0_30px_rgba(var(--primary-rgb),0.16)]',
    border: 'hover:border-primary/40',
    iconClass: 'text-primary',
  },
  {
    icon: Code2,
    title: 'Real Editor, Real Consequences',
    body: 'Move from ideation to implementation fast with runtime execution, whiteboard-style reasoning, and technical follow-ups.',
    accent: 'from-secondary/20 to-secondary/5',
    glow: 'shadow-[0_0_30px_rgba(var(--secondary-rgb),0.16)]',
    border: 'hover:border-secondary/40',
    iconClass: 'text-secondary',
  },
  {
    icon: BarChart3,
    title: 'Feedback That Shows the Miss',
    body: 'Don\'t just get a score. See where you rambled, where you hesitated, and where your explanation lost force.',
    accent: 'from-sky-400/20 to-sky-400/5',
    glow: 'shadow-[0_0_30px_rgba(56,189,248,0.18)]',
    border: 'hover:border-sky-400/40',
    iconClass: 'text-sky-400',
  },
];

const operatingSystemCards = [
  {
    icon: Radar,
    label: 'Signal Mapping',
    text: 'Track how your answers perform across clarity, technical depth, confidence, and structure.',
  },
  {
    icon: Gauge,
    label: 'Adaptive Intensity',
    text: 'Shift between realistic warm-up rounds and aggressive screen-style questioning without changing tools.',
  },
  {
    icon: Layers3,
    label: 'Replay Layer',
    text: 'Review transcripts, compare attempts, and use the feedback loop as a deliberate practice system.',
  },
];

const Landing: React.FC = () => {
  usePageMeta({
    title: 'OfferFlow — AI Mock Interviews | Ace Your Technical Interview',
    description: 'Practice technical and behavioral interviews with an AI interviewer. Real-time voice chat, code execution in 40+ languages, and instant feedback. Try your first interview free.',
    ogType: 'website',
  });

  const featuresRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const featuresSectionRef = useRef<HTMLElement>(null);
  const osCardsRef = useRef<HTMLDivElement>(null);

  useFadeIn(titleRef, 0.2);
  useStaggerFadeIn(featuresRef, '.feature-card', 0.4);
  useAnimeStagger(osCardsRef, '.os-card', { delay: 200, stagger: 100, y: 20 });

  useGSAP(() => {
    if (prefersReducedMotion() || !featuresSectionRef.current) return;
    const section = featuresSectionRef.current;
    gsap.to(section.querySelector('.features-parallax-bg'), {
      y: -120,
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1.5,
      },
    });
  }, []);

  return (
  <>
    <Navbar />
    <main id="main-content" tabIndex={-1}>
      <Hero />
      <section ref={featuresSectionRef} id="features" className="py-24 relative overflow-hidden">
        <div className="features-parallax-bg absolute inset-0 pointer-events-none opacity-[0.07]" aria-hidden>
          <div className="absolute top-1/4 left-0 w-[600px] h-[600px] rounded-full bg-primary blur-[120px]" />
          <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] rounded-full bg-secondary blur-[100px]" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid xl:grid-cols-[0.88fr_1.12fr] gap-10 items-start mb-14">
            <div>
              <div className="section-kicker mb-5">Everything You Need</div>
              <h2 ref={titleRef} className="text-4xl md:text-6xl font-bold mb-6 font-mono tracking-tight text-white">
                One prep surface for the full interview stack.
              </h2>
              <p className="text-zinc-400 font-mono text-sm md:text-base leading-relaxed max-w-xl">
                The landing experience now behaves like the product itself: layered, responsive, and built around signal.
                Every component below exists to rehearse the real thing, not decorate it.
              </p>
            </div>

            <BlurFade delay={0.08}>
              <SurfaceCard className="p-6 md:p-8 border-white/10 bg-black/35">
                <div ref={osCardsRef} className="grid sm:grid-cols-3 gap-4">
                  {operatingSystemCards.map((item) => (
                    <div key={item.label} className="os-card rounded-2xl border border-white/8 bg-white/4 p-5">
                      <div className="w-12 h-12 rounded-2xl bg-white/6 border border-white/8 flex items-center justify-center mb-4 text-secondary">
                        <item.icon className="w-5 h-5" />
                      </div>
                      <h3 className="font-mono text-white text-lg mb-2">{item.label}</h3>
                      <p className="text-zinc-400 text-sm leading-relaxed">{item.text}</p>
                    </div>
                  ))}
                </div>
              </SurfaceCard>
            </BlurFade>
          </div>

          <div ref={featuresRef} className="grid md:grid-cols-3 gap-8">
            {featureCards.map((card) => (
              <TiltCard key={card.title} maxRotate={5} scale={1.02}>
                <m.div
                  className={`feature-card ${card.border} bg-zinc-900/40 backdrop-blur-sm border border-zinc-800 rounded-3xl p-10 flex flex-col justify-between transition-all duration-500 group hover:shadow-[0_30px_80px_rgba(0,0,0,0.4)] min-h-[20rem] hover:border-white/20 ${card.glow}`}
                  whileHover={{ y: -4 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                >
                  <m.div
                    className={`w-20 h-20 rounded-3xl bg-linear-to-br ${card.accent} flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300`}
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                  >
                    <card.icon className={`w-10 h-10 ${card.iconClass}`} />
                  </m.div>
                  <div>
                    <h3 className="text-2xl font-bold mb-4 font-mono text-white">{card.title}</h3>
                    <p className="text-gray-400 font-mono text-sm leading-relaxed">{card.body}</p>
                  </div>
                </m.div>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>
      <ProcessSection />
    </main>
    <Footer />
  </>
  );
};

export default Landing;
