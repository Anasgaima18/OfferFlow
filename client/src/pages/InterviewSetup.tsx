import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Button from '../components/ui/Button';
import { Mic, Code, Users, Briefcase, Check, ChevronRight, Monitor } from 'lucide-react';
import { interviews } from '../services/api';
import { InterviewType, IInterview } from '../types';

// Step definitions
const STEPS = [
  { id: 1, label: 'Microphone' },
  { id: 2, label: 'Role' },
  { id: 3, label: 'Type' },
  { id: 4, label: 'Language' },
  { id: 5, label: 'Start' },
];

// Role options
const roles = [
  { id: 'software-engineer', name: 'Software Engineer', description: 'Data structures & algorithms', icon: <Code size={20} /> },
  { id: 'frontend-engineer', name: 'Frontend Engineer', description: 'React & UI debugging', icon: <Monitor size={20} /> },
];

// Interview type options
const interviewTypes = [
  { id: 'full', name: 'Full Interview', description: 'Behavioral + Technical', time: '~25 min', icon: <Briefcase size={20} /> },
  { id: 'behavioral', name: 'Behavioral', description: 'STAR method questions', time: '~10 min', icon: <Users size={20} /> },
  { id: 'technical', name: 'Technical', description: 'Live coding challenge', time: '~15 min', icon: <Code size={20} /> },
  { id: 'system-design', name: 'System Design', description: 'Architecture & scalability', time: '~20 min', icon: <Monitor size={20} /> },
];

// Language options
const languages = ['JavaScript', 'Java', 'Python', 'C++', 'Go'];

const InterviewSetup = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [micConnected, setMicConnected] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [selectedRole, setSelectedRole] = useState('software-engineer');
  const [selectedType, setSelectedType] = useState('full');
  const [selectedLanguage, setSelectedLanguage] = useState('JavaScript');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  // Microphone connection
  const connectMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      setMicConnected(true);
      
      // Start level visualization
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setMicLevel(avg / 255 * 100);
        animationRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (err) {
      console.error('Microphone access denied:', err);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  // Check if step is complete
  const isStepComplete = (step: number) => {
    if (step === 1) return micConnected;
    if (step === 2) return !!selectedRole;
    if (step === 3) return !!selectedType;
    if (step === 4) return !!selectedLanguage;
    return false;
  };

  // Handle start interview
  const handleStart = async () => {
    try {
      let apiType: InterviewType = 'technical';
      if (selectedType === 'behavioral') apiType = 'behavioral';
      if (selectedType === 'full') apiType = 'behavioral'; // Full starts with behavioral round
      if (selectedType === 'system-design') apiType = 'system-design';

      const response = await interviews.create(apiType);
      // Handle various potential API response structures safely
      const responseData = response.data as unknown as {
          data?: { interview: IInterview };
          interview?: IInterview;
      } | IInterview;

      let interviewId: string | undefined;

      if ('id' in responseData && typeof (responseData as IInterview).id === 'string') {
          interviewId = (responseData as IInterview).id;
      } else if ('interview' in responseData && (responseData as { interview: IInterview }).interview?.id) {
          interviewId = (responseData as { interview: IInterview }).interview.id;
      } else if ('data' in responseData && (responseData as { data: { interview: IInterview } }).data?.interview?.id) {
          interviewId = (responseData as { data: { interview: IInterview } }).data.interview.id;
      }

      if (!interviewId) {
        navigate(`/interview/demo-${Date.now()}`);
        return;
      }

      navigate(`/interview/${interviewId}`, {
        state: { role: selectedRole, type: selectedType, language: selectedLanguage }
      });
    } catch (err) {
      console.error('Failed to create interview', err);
      navigate(`/interview/demo-${Date.now()}`);
    }
  };

  return (
    <div className="min-h-screen bg-background text-white font-sans">
      <Navbar />

      <main className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-4 mb-4">
              <h1 className="text-3xl font-bold font-mono">CONFIGURE YOUR SESSION</h1>
              <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-mono">
                ~1 session available
              </div>
            </div>
            <p className="text-zinc-400">AI interviewer modeled after Google, Meta & Amazon</p>
            <p className="text-sm text-zinc-500 mt-2">🔘 200+ interviews conducted | ⭐ 4.7 rating</p>
            <p className="text-xs text-yellow-400 mt-2">💡 Add your resume in profile for personalized questions</p>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-center gap-2 mb-10">
            {STEPS.map((step, idx) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-all ${
                    isStepComplete(step.id)
                      ? 'bg-emerald-500 border-emerald-500 text-black'
                      : currentStep === step.id
                      ? 'border-emerald-400 text-emerald-400'
                      : 'border-zinc-700 text-zinc-500'
                  }`}
                >
                  {isStepComplete(step.id) ? <Check size={16} /> : step.id}
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`w-8 h-0.5 mx-1 ${isStepComplete(step.id) ? 'bg-emerald-500' : 'bg-zinc-700'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step Content */}
          <div className="space-y-8">
            {/* Step 1: Microphone */}
            <div className={`p-6 rounded-xl border transition-all ${micConnected ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-zinc-800 bg-zinc-900/50'}`}>
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${micConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>
                  <Mic size={24} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-lg">
                      {micConnected ? 'Microphone Connected' : 'Connect Microphone'}
                    </h3>
                    {micConnected && <Check size={18} className="text-emerald-400" />}
                  </div>
                  <p className="text-sm text-zinc-400">
                    {micConnected ? 'Click to change device' : 'Required for voice interaction'}
                  </p>
                </div>
                {!micConnected && (
                  <Button onClick={connectMicrophone} variant="primary" size="sm">
                    Connect
                  </Button>
                )}
              </div>
              {micConnected && (
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-xs text-zinc-500">Level:</span>
                  <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-75"
                      style={{ width: `${micLevel}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Role */}
            <div>
              <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
                {selectedRole && <Check size={14} className="text-emerald-400" />}
                SELECT ROLE
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => { setSelectedRole(role.id); if (currentStep < 3) setCurrentStep(3); }}
                    className={`p-4 rounded-xl border text-left transition-all flex items-center gap-3 ${
                      selectedRole === role.id
                        ? 'bg-emerald-500/10 border-emerald-500/50'
                        : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${selectedRole === role.id ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>
                      {role.icon}
                    </div>
                    <div>
                      <div className="font-medium">{role.name}</div>
                      <div className="text-xs text-zinc-500">{role.description}</div>
                    </div>
                    {selectedRole === role.id && <Check size={18} className="ml-auto text-emerald-400" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Interview Type */}
            <div>
              <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
                {selectedType && <Check size={14} className="text-emerald-400" />}
                INTERVIEW TYPE
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                {interviewTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => { setSelectedType(type.id); if (currentStep < 4) setCurrentStep(4); }}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      selectedType === type.id
                        ? 'bg-emerald-500/10 border-emerald-500/50'
                        : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-1.5 rounded ${selectedType === type.id ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>
                        {type.icon}
                      </div>
                      <span className="font-medium">{type.name}</span>
                      {selectedType === type.id && <Check size={14} className="ml-auto text-emerald-400" />}
                    </div>
                    <div className="text-xs text-zinc-500">{type.description}</div>
                    <div className="text-xs text-emerald-400 mt-1">{type.time}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 4: Language */}
            <div>
              <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
                {selectedLanguage && <Check size={14} className="text-emerald-400" />}
                LANGUAGE
              </h3>
              <div className="flex flex-wrap gap-2">
                {languages.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => { setSelectedLanguage(lang); setCurrentStep(5); }}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                      selectedLanguage === lang
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                        : 'bg-zinc-900/50 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Practice Space Notice */}
            <div className="text-center p-4 bg-zinc-900/30 rounded-xl border border-zinc-800">
              <p className="text-sm text-zinc-400">
                This is <span className="text-emerald-400">your practice space</span>. Explore freely, no pressure.
              </p>
              <div className="flex items-center justify-center gap-4 mt-2 text-xs text-zinc-500">
                <span>🔒 Only you see results</span>
                <span>⏱️ Exit anytime</span>
                <span>🔄 Retry as much as you'd like</span>
              </div>
            </div>

            {/* Start Button */}
            <div className="text-center">
              <Button
                onClick={handleStart}
                variant="primary"
                size="lg"
                className="group px-8"
                disabled={!micConnected}
              >
                Start Interview
                <ChevronRight className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              {!micConnected && (
                <p className="text-xs text-zinc-500 mt-2">Connect your microphone to continue</p>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default InterviewSetup;
