import React from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import ProcessSection from '../components/ProcessSection';
import Footer from '../components/Footer';
import { Mic, Code2, BarChart3 } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';

const Landing: React.FC = () => {
  usePageMeta({
    title: 'OfferFlow — AI Mock Interviews | Ace Your Technical Interview',
    description: 'Practice technical and behavioral interviews with an AI interviewer. Real-time voice chat, code execution in 40+ languages, and instant feedback. Try your first interview free.',
    ogType: 'website',
  });

  return (
  <>
    <Navbar />
    <main>
    <Hero />
    <ProcessSection />
    <section id="features" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <h2 className="text-3xl font-bold mb-12 font-mono tracking-tighter uppercase">EVERYTHING YOU NEED</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800 rounded-2xl p-10 flex flex-col items-center justify-center hover:border-primary/50 transition-all duration-500 cursor-pointer group hover:-translate-y-2 shadow-2xl">
            <div className="w-20 h-20 rounded-3xl bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-[0_0_30px_rgba(var(--primary-rgb),0.2)]">
              <Mic className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-3 font-mono">Voice Chat</h3>
            <p className="text-gray-400 font-mono text-sm leading-relaxed">Speak naturally with our AI interviewer using low-latency streaming audio.</p>
          </div>
          
          <div className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800 rounded-2xl p-10 flex flex-col items-center justify-center hover:border-secondary/50 transition-all duration-500 cursor-pointer group hover:-translate-y-2 shadow-2xl">
            <div className="w-20 h-20 rounded-3xl bg-linear-to-br from-secondary/20 to-secondary/5 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-[0_0_30px_rgba(var(--secondary-rgb),0.2)]">
              <Code2 className="w-10 h-10 text-secondary" />
            </div>
            <h3 className="text-2xl font-bold mb-3 font-mono">Real Editor</h3>
            <p className="text-gray-400 font-mono text-sm leading-relaxed">Run code in 40+ languages via our high-performance Piston execution sandbox.</p>
          </div>

          <div className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800 rounded-2xl p-10 flex flex-col items-center justify-center hover:border-purple-500/50 transition-all duration-500 cursor-pointer group hover:-translate-y-2 shadow-2xl">
            <div className="w-20 h-20 rounded-3xl bg-linear-to-br from-purple-500/20 to-purple-500/5 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-[0_0_30px_rgba(168,85,247,0.2)]">
              <BarChart3 className="w-10 h-10 text-purple-400" />
            </div>
            <h3 className="text-2xl font-bold mb-3 font-mono">Deep Analytics</h3>
            <p className="text-gray-400 font-mono text-sm leading-relaxed">Get actionable feedback on your communication and logic, instantly analyzed.</p>
          </div>
        </div>
      </div>
    </section>
    <Footer />
  </>
  );
};

export default Landing;
