import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Mic, Code, Layout, BarChart2, Clock, Users } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';

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

const Features = () => {
  usePageMeta({
    title: 'Features — OfferFlow | AI Voice Chat, Code Editor & Analytics',
    description: 'Explore OfferFlow features: AI voice interviews, code editor with 40+ languages, whiteboard, detailed scoring, timed sessions, and FAANG-style questions.',
  });

  return (
    <div className="min-h-screen bg-background text-white font-sans">
      <Navbar />
      
      <main className="pt-32 pb-24 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="font-pixel text-4xl md:text-5xl tracking-wider text-white mb-6">
              EVERYTHING YOU NEED
            </h1>
            <p className="text-gray-400 font-mono max-w-2xl mx-auto">
              All the tools you need to ace your next technical interview, powered by AI.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <div 
                key={idx} 
                className="glass-card p-6 group hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-lg glass flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon size={24} className="text-secondary" />
                </div>
                <h3 className="font-mono text-lg font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Features;
