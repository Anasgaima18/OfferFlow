import { Link } from 'react-router-dom';
import { Check, Star, Sparkles } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';
import PageLayout from '../components/ui/PageLayout';
import PageHero from '../components/ui/PageHero';
import SurfaceCard from '../components/ui/SurfaceCard';
import BlurFade from '../components/ui/BlurFade';
import { buttonStyles } from '../lib/buttonStyles';

interface PricingCardProps {
  title: string;
  price: string;
  period?: string;
  interviews: string;
  features: string[];
  recommended?: boolean;
  ctaText: string;
  ctaLink: string;
}

const PricingCard = ({ title, price, period, interviews, features, recommended = false, ctaText, ctaLink }: PricingCardProps) => (
  <SurfaceCard className={`relative premium-panel p-8 flex flex-col h-full transition-all duration-300 hover:-translate-y-2 ${recommended ? 'border-primary/30 shadow-[0_20px_60px_rgba(255,184,0,0.14)]' : 'border-white/10'}`}>
    {recommended && (
      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
        <span className="badge-popular">MOST POPULAR</span>
      </div>
    )}
    
    {/* Status Indicator */}
    <div className="flex items-center gap-2 mb-4">
      <div className={`w-2 h-2 rounded-full ${recommended ? 'bg-primary' : 'bg-secondary'}`} />
      <span className="text-sm font-mono text-gray-400 uppercase">{title}</span>
    </div>

    {/* Price */}
    <div className="mb-6">
      <span className="font-pixel text-5xl text-white">{price}</span>
      {period && <span className="text-gray-500 font-mono ml-2">/{period}</span>}
    </div>

    {/* Interviews */}
    <p className="text-gray-300 font-mono mb-2">{interviews}</p>
    <p className="text-xs text-gray-500 mb-6">30-45 min per session</p>

    {/* Features */}
    <ul className="space-y-4 mb-8 flex-1">
      {features.map((feature) => (
        <li key={feature} className="flex items-start text-sm text-gray-300">
          <Check size={16} className="mr-3 mt-0.5 text-secondary shrink-0" />
          {feature}
        </li>
      ))}
    </ul>

    {/* CTA */}
    <Link
      to={ctaLink}
      className={buttonStyles({
        variant: recommended ? 'primary' : 'secondary',
        className: 'w-full',
      })}
    >
      {ctaText}
    </Link>
  </SurfaceCard>
);

const Pricing = () => {
  usePageMeta({
    title: 'Pricing — OfferFlow | AI Mock Interview Plans',
    description: 'Compare OfferFlow plans: Free, Starter ($20/mo), Pro ($50/mo), and Enterprise. AI-powered mock interviews with real-time feedback, code execution, and detailed scoring.',
  });

  return (
    <PageLayout contentClassName="max-w-7xl">
      <PageHero
        kicker="Pricing"
        title="CHOOSE THE REP COUNT"
        description="Start with a free round, then scale into a prep cadence that matches the intensity of your hiring cycle. Every plan is built around realistic repetitions, not vanity usage numbers."
        meta={[
          { label: 'Free interviews', value: '1' },
          { label: 'Top paid tier', value: '15' },
          { label: 'Enterprise setup', value: 'Custom' },
        ]}
        aside={
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-5">
              <Star size={14} className="text-primary" />
              <span className="text-sm font-mono text-gray-300">1 FREE INTERVIEW</span>
              <span className="text-sm text-gray-500">Try it before you buy</span>
            </div>
            <p className="text-zinc-300 font-mono leading-relaxed">The best value is in consistent reps. The Pro plan is tuned for candidates who want multiple full rounds per week and transcript-backed improvement tracking.</p>
          </div>
        }
      />

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
        <BlurFade delay={0.02}><PricingCard 
              title="Free" 
              price="$0"
              interviews="1 interview included"
              features={[
                "Try our AI interviewer",
                "Basic feedback",
                "No credit card required"
              ]}
              ctaText="Start Free"
              ctaLink="/interview-setup"
            /></BlurFade>
            <BlurFade delay={0.06}><PricingCard 
              title="Starter" 
              price="$20"
              period="mo"
              interviews="6 interviews included"
              features={[
                "Behavioral + Technical rounds",
                "Hire recommendation & detailed scoring",
                "Run code against all test cases"
              ]}
              ctaText="Get Started"
              ctaLink="/signup"
            /></BlurFade>
            <BlurFade delay={0.1}><PricingCard 
              title="Pro" 
              price="$50"
              period="mo"
              recommended={true}
              interviews="15 interviews included"
              features={[
                "Behavioral + Technical rounds",
                "Hire recommendation & detailed scoring",
                "Run code against all test cases",
                "Priority support",
                "Interview history & tracking"
              ]}
              ctaText="Get Started"
              ctaLink="/signup"
            /></BlurFade>
            <BlurFade delay={0.14}><PricingCard 
              title="Enterprise" 
              price="Custom"
              interviews="Unlimited interviews"
              features={[
                "Custom question sets",
                "Team management dashboard",
                "API Access",
                "Dedicated support"
              ]}
              ctaText="Contact Sales"
              ctaLink="/support"
            /></BlurFade>
          </div>

      <SurfaceCard className="p-6 border-white/10 bg-white/4 text-center">
        <div className="inline-flex items-center gap-2 text-primary font-mono text-sm uppercase tracking-[0.18em] mb-3">
          <Sparkles size={14} /> Included on every plan
        </div>
        <p className="text-gray-400 text-sm font-mono">All plans include access to the AI interviewer, scored practice rounds, and the same core UI experience.</p>
      </SurfaceCard>
    </PageLayout>
  );
};

export default Pricing;
