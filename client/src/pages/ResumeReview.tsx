import { useState } from 'react';
import Button from '../components/ui/Button';
import BlurFade from '../components/ui/BlurFade';
import PageHero from '../components/ui/PageHero';
import PageLayout from '../components/ui/PageLayout';
import SurfaceCard from '../components/ui/SurfaceCard';
import { Upload, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { content } from '../services/api';

const ResumeReview = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<null | { score: number; feedback: string[]; summary: string; extractedTextLength: number }>(null);

  const handleUpload = async (file: File) => {
    setUploadedFile(file);
    setAnalyzing(true);
    try {
      const response = await content.reviewResume(file);
      setResults(response.data.data);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Resume review failed');
      setUploadedFile(null);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <PageLayout contentClassName="max-w-5xl">
      <PageHero
        kicker="Document Review"
        title="RESUME REVIEW"
        description="Upload your resume and get fast AI feedback on structure, signal strength, and clarity using hiring-focused criteria."
        meta={[
          { label: 'Accepted Files', value: 'PDF/DOCX' },
          { label: 'Max Size', value: '5MB' },
          { label: 'Turnaround', value: 'Seconds' },
        ]}
        aside={<div className="text-sm font-mono leading-relaxed text-zinc-300">A sharper resume improves both recruiter conversion and how accurately the interview engine personalizes your practice.</div>}
      />

      <div className="mx-auto max-w-3xl">

          {!uploadedFile ? (
            <BlurFade>
            <button
              type="button"
              onClick={() => document.getElementById('resume-upload-input')?.click()}
              className="w-full rounded-4xl border-2 border-dashed border-zinc-700 bg-black/20 p-12 text-center transition-colors hover:border-primary/50"
              aria-label="Upload resume — PDF or DOCX, max 5MB"
            >
              <input
                id="resume-upload-input"
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    void handleUpload(file);
                  }
                }}
              />
              <Upload className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">Drop your resume here</p>
              <p className="text-sm text-zinc-500">PDF, DOCX up to 5MB</p>
            </button>
            </BlurFade>
          ) : analyzing ? (
            <SurfaceCard className="premium-panel p-12 text-center">
              <Sparkles className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
              <p className="text-lg font-medium">Analyzing your resume...</p>
              <p className="text-sm text-zinc-500">This usually takes a few seconds</p>
            </SurfaceCard>
          ) : results && (
            <SurfaceCard className="premium-panel p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold">Resume Score</h3>
                  <p className="text-sm text-zinc-400">Based on FAANG hiring criteria</p>
                </div>
                <div className={`text-4xl font-bold ${results.score >= 80 ? 'text-green-400' : results.score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {results.score}%
                </div>
              </div>
              <p className="text-zinc-300 mb-6 leading-relaxed">{results.summary}</p>
              <div className="space-y-3">
                {results.feedback.map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm">
                    {item.startsWith('✅') ? <CheckCircle className="text-green-400 shrink-0" size={18} /> : 
                     item.startsWith('⚠️') ? <AlertCircle className="text-yellow-400 shrink-0" size={18} /> :
                     <AlertCircle className="text-red-400 shrink-0" size={18} />}
                    <span className="text-zinc-300">{item.substring(2)}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-zinc-500 mt-6">
                Parsed {results.extractedTextLength.toLocaleString()} characters from {uploadedFile.name}
              </p>
              <Button variant="primary" className="w-full mt-6" onClick={() => { setUploadedFile(null); setResults(null); }}>
                Upload Another Resume
              </Button>
            </SurfaceCard>
          )}
      </div>
    </PageLayout>
  );
};

export default ResumeReview;
