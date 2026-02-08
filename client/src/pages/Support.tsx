import { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { ChevronDown, ChevronUp } from 'lucide-react';

const FAQItem = ({ question, answer }: { question: string, answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-zinc-800 rounded-lg bg-zinc-900/30 overflow-hidden mb-4">
      <button 
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-zinc-900/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-semibold text-zinc-200">{question}</span>
        {isOpen ? <ChevronUp size={20} className="text-zinc-500" /> : <ChevronDown size={20} className="text-zinc-500" />}
      </button>
      {isOpen && (
        <div className="px-6 py-4 border-t border-zinc-800/50 text-zinc-400 text-sm leading-relaxed">
           {answer}
        </div>
      )}
    </div>
  );
}

const Support = () => {
  return (
    <div className="min-h-screen bg-background text-white font-sans">
      <Navbar />
      
      <main className="pt-32 pb-24 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Help & Support</h1>
            <p className="text-zinc-400">Common questions about OfferFlow and our AI interviews.</p>
          </div>

          <div className="mb-12">
            <FAQItem 
                question="How does the AI interviewer work?" 
                answer="Our AI uses advanced Large Language Models (LLMs) to simulate real-world interview scenarios. It speaks using realistic text-to-speech engines and listens to your responses in real-time, analyzing both your content and delivery."
            />
            <FAQItem 
                question="Can I code in any language?" 
                answer="Yes! Our code editor supports over 40 programming languages including Python, JavaScript, Java, C++, TypeScript, Go, and Rust. The AI is capable of understanding and debugging code in all these languages."
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

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 text-center">
             <h3 className="text-xl font-bold mb-2">Still have questions?</h3>
             <p className="text-zinc-400 mb-6">We're here to help you ace your interview.</p>
             <a href="mailto:support@offerflow.ai" className="inline-block bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                Contact Support
             </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Support;
