import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Lightbulb, BookOpen, Zap, Target } from 'lucide-react';

const tips = [
  { category: 'Before Interview', items: ['Research the company culture', 'Review your resume', 'Prepare questions to ask', 'Test your equipment'] },
  { category: 'During Interview', items: ['Think aloud while coding', 'Ask clarifying questions', 'Manage your time wisely', 'Stay calm under pressure'] },
  { category: 'DSA Tips', items: ['Start with brute force', 'Optimize step by step', 'Consider edge cases', 'Test with examples'] },
  { category: 'Behavioral Tips', items: ['Use STAR method', 'Be specific with examples', 'Show leadership', 'Demonstrate growth'] },
];

const Tips = () => (
  <div className="min-h-screen bg-background text-white font-sans">
    <Navbar />
    <main className="pt-32 pb-24 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 flex items-center gap-3"><Lightbulb className="text-primary" /> Interview Tips</h1>
        <div className="grid md:grid-cols-2 gap-6">
          {tips.map((section, idx) => (
            <div key={idx} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                {idx === 0 && <BookOpen size={18} className="text-primary" />}
                {idx === 1 && <Zap size={18} className="text-secondary" />}
                {idx === 2 && <Target size={18} className="text-purple-400" />}
                {idx === 3 && <Lightbulb size={18} className="text-pink-400" />}
                {section.category}
              </h3>
              <ul className="space-y-3">
                {section.items.map((tip, i) => (
                  <li key={i} className="flex items-start gap-3 text-zinc-300">
                    <span className="w-6 h-6 bg-zinc-800 rounded-full flex items-center justify-center text-xs text-primary shrink-0">{i + 1}</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </main>
    <Footer />
  </div>
);

export default Tips;
