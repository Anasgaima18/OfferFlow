import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Check, Star } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';

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
  <div className={`relative glass-card p-8 flex flex-col h-full transition-all duration-300 hover:-translate-y-2 ${recommended ? 'border-primary/30' : ''}`}>
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
      {features.map((feature, idx) => (
        <li key={idx} className="flex items-start text-sm text-gray-300">
          <Check size={16} className="mr-3 mt-0.5 text-secondary shrink-0" />
          {feature}
        </li>
      ))}
    </ul>

    {/* CTA */}
    <Link to={ctaLink}>
      <button className={`w-full py-3 rounded-lg font-mono text-sm transition-all ${
        recommended 
          ? 'btn-gradient' 
          : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
      }`}>
        {ctaText}
      </button>
    </Link>
  </div>
);

const Pricing = () => {
  usePageMeta({
    title: 'Pricing — OfferFlow | AI Mock Interview Plans',
    description: 'Compare OfferFlow plans: Free, Starter ($20/mo), Pro ($50/mo), and Enterprise. AI-powered mock interviews with real-time feedback, code execution, and detailed scoring.',
  });

  return (
    <div className="min-h-screen bg-background text-white font-sans">
      <Navbar />
      
      <main className="pt-32 pb-24 px-4 relative">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            {/* Free Trial Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8">
              <Star size={14} className="text-primary" />
              <span className="text-sm font-mono text-gray-300">1 FREE INTERVIEW</span>
              <span className="text-sm text-gray-500">Try it before you buy</span>
            </div>

            <h1 className="font-pixel text-5xl md:text-6xl tracking-wider text-white mb-6">
              CHOOSE YOUR PLAN
            </h1>
            <p className="text-gray-400 font-mono max-w-lg mx-auto">
              Select the plan that fits your interview prep needs
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-4 gap-6">
            <PricingCard 
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
            />
            
            <PricingCard 
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
            />
            
            <PricingCard 
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
            />
            
            <PricingCard 
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
            />
          </div>

          {/* Bottom Note */}
          <p className="text-center text-gray-500 text-sm font-mono mt-12">
            All plans include access to our AI interviewer powered by GPT-4
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Pricing;
