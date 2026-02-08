import { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Button from '../components/ui/Button';
import { FileText, Upload, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';

const ResumeReview = () => {
  const [uploaded, setUploaded] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<null | { score: number; feedback: string[] }>(null);

  const handleUpload = () => {
    setUploaded(true);
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      setResults({
        score: 78,
        feedback: [
          '✅ Strong action verbs used throughout',
          '✅ Quantifiable achievements present',
          '⚠️ Consider adding more technical skills',
          '⚠️ Summary could be more impactful',
          '❌ Missing links to projects/portfolio',
        ]
      });
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background text-white font-sans">
      <Navbar />
      <main className="pt-32 pb-24 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold mb-4 flex items-center gap-3"><FileText className="text-primary" /> Resume Review</h1>
          <p className="text-zinc-400 mb-8">Get AI-powered feedback on your resume in seconds</p>

          {!uploaded ? (
            <div 
              onClick={handleUpload}
              className="border-2 border-dashed border-zinc-700 rounded-2xl p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              <Upload className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">Drop your resume here</p>
              <p className="text-sm text-zinc-500">PDF, DOCX up to 5MB</p>
            </div>
          ) : analyzing ? (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-12 text-center">
              <Sparkles className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
              <p className="text-lg font-medium">Analyzing your resume...</p>
              <p className="text-sm text-zinc-500">This usually takes a few seconds</p>
            </div>
          ) : results && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold">Resume Score</h3>
                  <p className="text-sm text-zinc-400">Based on FAANG hiring criteria</p>
                </div>
                <div className={`text-4xl font-bold ${results.score >= 80 ? 'text-green-400' : results.score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {results.score}%
                </div>
              </div>
              <div className="space-y-3">
                {results.feedback.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-sm">
                    {item.startsWith('✅') ? <CheckCircle className="text-green-400 shrink-0" size={18} /> : 
                     item.startsWith('⚠️') ? <AlertCircle className="text-yellow-400 shrink-0" size={18} /> :
                     <AlertCircle className="text-red-400 shrink-0" size={18} />}
                    <span className="text-zinc-300">{item.substring(2)}</span>
                  </div>
                ))}
              </div>
              <Button variant="primary" className="w-full mt-6" onClick={() => { setUploaded(false); setResults(null); }}>
                Upload Another Resume
              </Button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ResumeReview;
