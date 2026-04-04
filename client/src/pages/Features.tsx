import { Mic, Code, Layout, BarChart2, Clock, Users, Sparkles, Radar, Layers3 } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';
import PageLayout from '../components/ui/PageLayout';
import PageHero from '../components/ui/PageHero';
import BlurFade from '../components/ui/BlurFade';
import SurfaceCard from '../components/ui/SurfaceCard';

const features = [
  {
    icon: Mic,
    title: 'AI Voice Chat',
    description: 'Practice speaking your answers aloud with our AI interviewer that responds in real-time.'
  },
  {
    icon: Code,
    title: 'Code Editor',
    description: 'Write and run code in 15+ languages with our built-in IDE featuring syntax highlighting.'
  },
  {
    icon: Layout,
    title: 'Whiteboard',
    description: 'Sketch diagrams and explain system designs visually, just like in a real interview.'
  },
  {
    icon: BarChart2,
    title: 'Detailed Scoring',
    description: 'Get scored on communication, problem-solving, and code quality with actionable feedback.'
  },
  {
    icon: Clock,
    title: 'Timed Sessions',
    description: 'Practice under realistic time pressure with configurable interview durations.'
  },
  {
    icon: Users,
    title: 'FAANG Questions',
    description: 'Access a curated library of real interview questions from top tech companies.'
  },
];

const platformLayers = [
  { icon: Sparkles, title: 'Feedback Engine', text: 'Every round ends with a breakdown you can actually rehearse against.' },
  { icon: Radar, title: 'Signal Tracking', text: 'Measure communication, structure, and confidence as first-class interview signals.' },
  { icon: Layers3, title: 'Practice Stack', text: 'Voice, coding, transcripts, and daily reps all sit inside one coherent prep loop.' },
];

const Features = () => {
  usePageMeta({
    title: 'Features — OfferFlow | AI Voice Chat, Code Editor & Analytics',
    description: 'Explore OfferFlow features: AI voice interviews, code editor with 40+ languages, whiteboard, detailed scoring, timed sessions, and FAANG-style questions.',
  });

  return (
    <PageLayout contentClassName="max-w-7xl">
      <PageHero
        kicker="Feature Matrix"
        title="THE FULL INTERVIEW STACK"
        description="OfferFlow is designed like a serious prep system, not a toy demo. Every feature supports realistic repetitions, measurable improvement, and cleaner execution under pressure."
        meta={[
          { label: 'Interview modes', value: '3' },
          { label: 'Languages supported', value: '40+' },
          { label: 'Feedback dimensions', value: '9' },
        ]}
        aside={<p className="text-zinc-300 font-mono leading-relaxed">Train the full loop: hear the question, answer under pressure, code live, and review exactly where your explanation wins or drifts.</p>}
      />

      <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {features.map((feature, index) => (
          <BlurFade key={feature.title} delay={index * 0.04}>
            <SurfaceCard className="premium-panel p-7 h-full group hover:-translate-y-1 transition-all duration-300 border-white/10">
              <div className="w-14 h-14 rounded-2xl bg-white/6 border border-white/10 flex items-center justify-center mb-5 text-secondary group-hover:scale-110 transition-transform">
                <feature.icon size={24} />
              </div>
              <h3 className="font-mono text-lg font-semibold text-white mb-3">{feature.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
            </SurfaceCard>
          </BlurFade>
        ))}
      </section>

      <section className="grid lg:grid-cols-3 gap-6">
        {platformLayers.map((layer, index) => (
          <BlurFade key={layer.title} delay={0.1 + index * 0.05}>
            <SurfaceCard className="p-6 border-white/10 bg-white/4 h-full">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <layer.icon size={22} />
              </div>
              <h3 className="font-mono text-white text-lg mb-2">{layer.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{layer.text}</p>
            </SurfaceCard>
          </BlurFade>
        ))}
      </section>
    </PageLayout>
  );
};

export default Features;
