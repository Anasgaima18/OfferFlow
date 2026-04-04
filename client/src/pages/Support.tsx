import { useState } from 'react';
import { ChevronDown, ChevronUp, Mail, ShieldCheck, TimerReset } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';
import PageLayout from '../components/ui/PageLayout';
import PageHero from '../components/ui/PageHero';
import SurfaceCard from '../components/ui/SurfaceCard';
import BlurFade from '../components/ui/BlurFade';
import { buttonStyles } from '../lib/buttonStyles';

const FAQItem = ({ question, answer }: { question: string, answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <SurfaceCard className="border-white/10 bg-white/4 overflow-hidden mb-4">
      <button 
        className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-white/4 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-semibold text-zinc-200">{question}</span>
        {isOpen ? <ChevronUp size={20} className="text-zinc-500" /> : <ChevronDown size={20} className="text-zinc-500" />}
      </button>
      {isOpen && (
        <div className="px-6 py-4 border-t border-white/8 text-zinc-400 text-sm leading-relaxed">
           {answer}
        </div>
      )}
    </SurfaceCard>
  );
}

const Support = () => {
  usePageMeta({
    title: 'Help & Support — OfferFlow | FAQ & Contact',
    description: 'Find answers to common questions about OfferFlow AI interviews, coding languages, data privacy, and subscription management. Contact support for additional help.',
  });

  return (
    <PageLayout contentClassName="max-w-5xl">
      <PageHero
        kicker="Support"
        title="HELP, WITHOUT THE MAZE"
        description="When prep breaks, momentum breaks. These answers cover the most common questions about voice rounds, coding sessions, privacy, and account management."
        meta={[
          { label: 'Response surface', value: 'FAQ + Email' },
          { label: 'Privacy posture', value: 'Encrypted' },
          { label: 'Billing model', value: 'Flexible' },
        ]}
        aside={<p className="text-zinc-300 font-mono leading-relaxed">OfferFlow support is tuned to unblock the prep loop fast, whether the issue is technical, billing-related, or workflow confusion.</p>}
      />

      <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6 items-start">
        <div>
            <FAQItem 
                question="How does the AI interviewer work?" 
                answer="Our AI uses advanced Large Language Models (LLMs) to simulate real-world interview scenarios. It speaks using realistic text-to-speech engines and listens to your responses in real-time, analyzing both your content and delivery."
            />
            <FAQItem 
                question="Can I code in any language?" 
                answer="The live interview editor currently supports JavaScript, Python, Java, and C++. Those are the languages available in the coding session today, so the setup flow and runtime stay aligned."
            />
            <FAQItem 
                question="Is my data private?" 
                answer="Absolutely. We do not share your transcripts or video recordings with third parties. Your data is used solely to generate your feedback reports and improve your personal experience. We use enterprise-grade encryption for all data."
            />
            <FAQItem 
                question="Can I cancel my subscription anytime?" 
                answer="Yes, you can cancel your Pro or Enterprise subscription at any time from your dashboard settings. You will continue to have access until the end of your current billing period."
            />
        </div>

        <div className="space-y-4">
          <BlurFade><SurfaceCard className="p-6 border-white/10 bg-white/4"><Mail className="text-primary mb-4" /><h2 className="text-xl font-bold mb-2">Still have questions?</h2><p className="text-zinc-400 mb-5">We’re here to help you keep the prep cycle moving.</p><a href="mailto:support@offerflow.ai" className={buttonStyles({ className: 'w-full' })}><span className="relative z-10 inline-flex items-center justify-center gap-2">Contact Support</span></a></SurfaceCard></BlurFade>
          <BlurFade delay={0.06}><SurfaceCard className="p-6 border-white/10 bg-white/4"><ShieldCheck className="text-secondary mb-4" /><h3 className="font-mono text-white text-lg mb-2">Privacy First</h3><p className="text-zinc-400 text-sm leading-relaxed">Interview data is used to power your feedback and product experience, not to train public models without control.</p></SurfaceCard></BlurFade>
          <BlurFade delay={0.12}><SurfaceCard className="p-6 border-white/10 bg-white/4"><TimerReset className="text-sky-400 mb-4" /><h3 className="font-mono text-white text-lg mb-2">Fast Recovery</h3><p className="text-zinc-400 text-sm leading-relaxed">Subscription changes and platform access issues should never block an active prep sprint for long.</p></SurfaceCard></BlurFade>
        </div>
      </div>
    </PageLayout>
  );
};

export default Support;
