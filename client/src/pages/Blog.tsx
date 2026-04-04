import { BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageMeta';
import PageLayout from '../components/ui/PageLayout';
import PageHero from '../components/ui/PageHero';
import EmptyState from '../components/ui/EmptyState';
import BlurFade from '../components/ui/BlurFade';
import { buttonStyles } from '../lib/buttonStyles';

const Blog = () => {
  usePageMeta({
    title: 'Blog — OfferFlow | Interview Prep Articles & Guides',
    description: 'Read expert articles on acing behavioral interviews, system design primers, LeetCode patterns, and more from the OfferFlow team.',
  });

  return (
    <PageLayout contentClassName="max-w-6xl">
      <PageHero
        kicker="Journal"
        title="INTERVIEW INTELLIGENCE"
        description="Longer-form playbooks, system design primers, and coaching breakdowns that help candidates convert practice reps into cleaner decisions on the day that matters."
        meta={[
          { label: 'Core tracks', value: '3' },
          { label: 'Avg read length', value: '12 min' },
          { label: 'New drops', value: 'Rolling' },
        ]}
        aside={<p className="text-zinc-300 font-mono leading-relaxed">The written layer complements the product: use articles for framing, then take those ideas back into mock rounds.</p>}
      />
      <BlurFade>
        <EmptyState
          icon={<BookOpen className="h-10 w-10 text-primary" />}
          title="Articles coming soon"
          description="We're preparing playbooks on behavioral interviews, system design, and LeetCode patterns. In the meantime, run a mock session or explore the question bank."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/interview-setup" className={buttonStyles({ variant: 'primary', size: 'md' })}>
                Start a mock
              </Link>
              <Link to="/questions" className={buttonStyles({ variant: 'secondary', size: 'md' })}>
                Question bank
              </Link>
            </div>
          }
        />
      </BlurFade>
    </PageLayout>
  );
};

export default Blog;
