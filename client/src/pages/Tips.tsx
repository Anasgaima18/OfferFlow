import { Lightbulb, BookOpen, Zap, Target } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';
import PageLayout from '../components/ui/PageLayout';
import PageHero from '../components/ui/PageHero';
import SurfaceCard from '../components/ui/SurfaceCard';
import BlurFade from '../components/ui/BlurFade';

const tips = [
  { category: 'Before Interview', items: ['Research the company culture', 'Review your resume', 'Prepare questions to ask', 'Test your equipment'] },
  { category: 'During Interview', items: ['Think aloud while coding', 'Ask clarifying questions', 'Manage your time wisely', 'Stay calm under pressure'] },
  { category: 'DSA Tips', items: ['Start with brute force', 'Optimize step by step', 'Consider edge cases', 'Test with examples'] },
  { category: 'Behavioral Tips', items: ['Use STAR method', 'Be specific with examples', 'Show leadership', 'Demonstrate growth'] },
];

const Tips = () => {
  usePageMeta({
    title: 'Interview Tips — OfferFlow | Ace Your Next Tech Interview',
    description: 'Expert tips for technical interviews: preparation strategies, DSA problem-solving approaches, behavioral interview STAR method, and time management techniques.',
  });

  return (
  <PageLayout contentClassName="max-w-6xl">
      <PageHero
        kicker="Tactical Guide"
        title="BETTER REPS. BETTER INTERVIEWS."
        description="These are not generic blog tips. They are practical reminders for better pacing, cleaner explanations, and stronger decision-making while the clock is running."
        meta={[
          { label: 'Prep zones', value: '4' },
          { label: 'Core heuristics', value: '16' },
          { label: 'Best used with', value: 'Mock rounds' },
        ]}
        aside={<p className="text-zinc-300 font-mono leading-relaxed">Read one section, then apply it immediately in a mock interview. The fastest improvements come from tight feedback loops, not passive reading.</p>}
      />
      <div className="grid md:grid-cols-2 gap-6">
          {tips.map((section, idx) => (
            <BlurFade key={section.category} delay={idx * 0.05}>
            <SurfaceCard className="premium-panel p-6 h-full border-white/10">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                {idx === 0 && <BookOpen size={18} className="text-primary" />}
                {idx === 1 && <Zap size={18} className="text-secondary" />}
                {idx === 2 && <Target size={18} className="text-purple-400" />}
                {idx === 3 && <Lightbulb size={18} className="text-pink-400" />}
                {section.category}
              </h2>
              <ul className="space-y-3">
                {section.items.map((tip, i) => (
                  <li key={tip} className="flex items-start gap-3 text-zinc-300">
                    <span className="w-6 h-6 bg-zinc-800 rounded-full flex items-center justify-center text-xs text-primary shrink-0">{i + 1}</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </SurfaceCard>
            </BlurFade>
          ))}
      </div>
  </PageLayout>
  );
};

export default Tips;
