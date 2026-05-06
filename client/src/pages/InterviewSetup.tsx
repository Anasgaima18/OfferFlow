import { useEffect, useReducer, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Code, Mic, Monitor, Radar, Users } from 'lucide-react';
import { toast } from 'sonner';
import Button from '../components/ui/Button';
import BlurFade from '../components/ui/BlurFade';
import PageHero from '../components/ui/PageHero';
import PageLayout from '../components/ui/PageLayout';
import SurfaceCard from '../components/ui/SurfaceCard';
import HoverGlowButton from '../components/ui/HoverGlowButton';
import { interviews } from '../services/api';
import { InterviewType, IInterview } from '../types';
import { InterviewLanguage, InterviewRole, saveInterviewSessionConfig } from '../lib/interviewSessionConfig';

// Step definitions
const STEPS = [
  { id: 1, label: 'Audio' },
  { id: 2, label: 'Role' },
  { id: 3, label: 'Format' },
  { id: 4, label: 'Language' },
  { id: 5, label: 'Launch' },
];

// Role options
const roles: Array<{ id: InterviewRole; name: string; description: string; icon: ReactNode }> = [
  { id: 'software-engineer', name: 'Software Engineer', description: 'Algorithms, fundamentals, and implementation detail.', icon: <Code size={20} /> },
  { id: 'frontend-engineer', name: 'Frontend Engineer', description: 'React, UI systems, debugging, and product delivery.', icon: <Monitor size={20} /> },
];

// Interview type options
const interviewTypes: Array<{ id: InterviewType; name: string; description: string; time: string; icon: ReactNode }> = [
  { id: 'behavioral', name: 'Behavioral', description: 'STAR-driven storytelling and decision-making prompts.', time: '~10 min', icon: <Users size={20} /> },
  { id: 'technical', name: 'Technical', description: 'Coding, tradeoffs, and implementation pressure testing.', time: '~15 min', icon: <Code size={20} /> },
  { id: 'system-design', name: 'System Design', description: 'Architecture, scaling, and communication structure.', time: '~20 min', icon: <Radar size={20} /> },
];

// Language options
const languages: Array<{ id: InterviewLanguage; name: string }> = [
  { id: 'javascript', name: 'JavaScript' },
  { id: 'python', name: 'Python' },
  { id: 'java', name: 'Java' },
  { id: 'cpp', name: 'C++' },
];

interface SetupState {
  currentStep: number;
  micConnected: boolean;
  micLevel: number;
  selectedRole: InterviewRole;
  selectedType: InterviewType;
  selectedLanguage: InterviewLanguage;
  isCreating: boolean;
}

type SetupAction = {
  type: 'patch';
  value: Partial<SetupState>;
};

function setupReducer(state: SetupState, action: SetupAction): SetupState {
  if (action.type === 'patch') {
    return { ...state, ...action.value };
  }

  return state;
}

type CreateInterviewResponse =
  | {
      data?: { interview: IInterview };
      interview?: IInterview;
    }
  | IInterview;

function isStepComplete(
  step: number,
  state: Pick<SetupState, 'micConnected' | 'selectedRole' | 'selectedType' | 'selectedLanguage'>
) {
  if (step === 1) return state.micConnected;
  if (step === 2) return !!state.selectedRole;
  if (step === 3) return !!state.selectedType;
  if (step === 4) return !!state.selectedLanguage;
  return false;
}

function extractInterviewId(responseData: CreateInterviewResponse) {
  if ('id' in responseData && typeof (responseData as IInterview).id === 'string') {
    return (responseData as IInterview).id;
  }

  if ('interview' in responseData && (responseData as { interview: IInterview }).interview?.id) {
    return (responseData as { interview: IInterview }).interview.id;
  }

  if ('data' in responseData && (responseData as { data: { interview: IInterview } }).data?.interview?.id) {
    return (responseData as { data: { interview: IInterview } }).data.interview.id;
  }

  return undefined;
}

const InterviewSetup = () => {
  const navigate = useNavigate();
  const [setupState, dispatch] = useReducer(setupReducer, {
    currentStep: 1,
    micConnected: false,
    micLevel: 0,
    selectedRole: 'software-engineer',
    selectedType: 'technical',
    selectedLanguage: 'javascript',
    isCreating: false,
  });
  const { currentStep, micConnected, micLevel, selectedRole, selectedType, selectedLanguage, isCreating } = setupState;
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastMeterUpdateAtRef = useRef(0);
  const lastMeterLevelRef = useRef(0);

  // Microphone connection
  const connectMicrophone = async () => {
    try {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) await audioContextRef.current.close();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      streamRef.current = stream;
      
      dispatch({ type: 'patch', value: { micConnected: true, currentStep: 2 } });
      
      // Start level visualization
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const nextLevel = (avg / 255) * 100;
        const now = performance.now();

        // Avoid dispatching state updates on every animation frame.
        // This keeps setup animations and page scrolling smooth.
        if (now - lastMeterUpdateAtRef.current >= 100 && Math.abs(nextLevel - lastMeterLevelRef.current) >= 1.5) {
          lastMeterUpdateAtRef.current = now;
          lastMeterLevelRef.current = nextLevel;
          dispatch({ type: 'patch', value: { micLevel: nextLevel } });
        }
        animationRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (err) {
      console.error('Microphone access denied:', err);
      toast.error('Microphone access is required before you can launch an interview.');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Handle start interview
  const handleStart = async () => {
    dispatch({ type: 'patch', value: { isCreating: true } });
    try {
      const response = await interviews.create(selectedType);
      const responseData = response.data as unknown as CreateInterviewResponse;
      const interviewId = extractInterviewId(responseData);

      if (!interviewId) {
        throw new Error('Interview was created without an ID');
      }

      saveInterviewSessionConfig(interviewId, {
        role: selectedRole,
        language: selectedLanguage,
      });

      navigate(`/interview/${interviewId}`, {
        state: { role: selectedRole, type: selectedType, language: selectedLanguage }
      });
    } catch (err) {
      console.error('Failed to create interview', err);
      toast.error('We could not create your interview session. Please try again.');
    } finally {
      dispatch({ type: 'patch', value: { isCreating: false } });
    }
  };

  return (
    <PageLayout contentClassName="max-w-7xl">
      <PageHero
        kicker="Session Builder"
        title="INTERVIEW SETUP"
        description="Configure your environment, choose the role and interview mode, then launch a session that feels deliberate instead of generic."
        meta={[
          { label: 'Audio', value: micConnected ? 'Live' : 'Pending' },
          { label: 'Role', value: roles.find((role) => role.id === selectedRole)?.name.split(' ')[0] ?? '--' },
          { label: 'Language', value: languages.find((lang) => lang.id === selectedLanguage)?.name ?? '--' },
        ]}
        aside={
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-primary">
              <Mic size={14} />
              Environment Check
            </div>
            <p className="text-sm font-mono leading-relaxed text-zinc-300">Use a quiet room and a stable microphone. The more natural the setup, the more useful the feedback becomes.</p>
            <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5">
              <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-zinc-500">
                <span>Mic Input</span>
                <span className="text-white">{Math.round(micLevel)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/8">
                <div className="h-full rounded-full bg-linear-to-r from-emerald-300 via-primary to-orange-400 transition-all duration-75" style={{ width: `${Math.max(micConnected ? micLevel : 8, 8)}%` }} />
              </div>
            </div>
          </div>
        }
      />

      <section className="mb-8 flex flex-wrap items-center justify-center gap-3">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center gap-3">
            <div className={`flex h-11 w-11 items-center justify-center rounded-full border text-sm font-mono transition-colors ${
              isStepComplete(step.id, { micConnected, selectedRole, selectedType, selectedLanguage })
                ? 'border-emerald-300/40 bg-emerald-300/15 text-emerald-200'
                : currentStep === step.id
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-white/10 bg-white/3 text-zinc-500'
            }`}>
              {isStepComplete(step.id, { micConnected, selectedRole, selectedType, selectedLanguage }) ? <Check size={16} /> : step.id}
            </div>
            <span className="text-xs uppercase tracking-[0.18em] text-zinc-500">{step.label}</span>
            {index < STEPS.length - 1 ? <div className="h-px w-8 bg-white/10" /> : null}
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <BlurFade>
            <SurfaceCard className={`premium-panel p-6 ${micConnected ? 'border-emerald-300/30' : ''}`}>
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${micConnected ? 'border-emerald-300/25 bg-emerald-300/10 text-emerald-200' : 'border-white/10 bg-white/5 text-zinc-400'}`}>
                  <Mic size={22} />
                </div>
                <div className="flex-1">
                  <h2 className="font-pixel text-2xl tracking-[0.08em] text-white">MICROPHONE</h2>
                  <p className="mt-2 text-sm font-mono text-zinc-400">{micConnected ? 'Audio input is live. You can reconnect if you want to change devices.' : 'Voice input is required for a realistic interview simulation.'}</p>
                </div>
                <Button onClick={connectMicrophone} variant={micConnected ? 'secondary' : 'primary'}>
                  {micConnected ? 'Reconnect' : 'Connect'}
                </Button>
              </div>
            </SurfaceCard>
          </BlurFade>

          <BlurFade delay={0.05}>
            <SurfaceCard className="premium-panel p-6">
              <h2 className="mb-5 font-pixel text-2xl tracking-[0.08em] text-white">SELECT ROLE</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => {
                      dispatch({ type: 'patch', value: { selectedRole: role.id, currentStep: 3 } });
                    }}
                    className={`rounded-3xl border p-5 text-left transition-colors ${selectedRole === role.id ? 'border-primary/30 bg-primary/10' : 'border-white/10 bg-white/3 hover:bg-white/5'}`}
                  >
                    <div className="mb-4 flex items-center gap-3">
                      <div className={`rounded-2xl border p-3 ${selectedRole === role.id ? 'border-primary/20 bg-primary/15 text-primary' : 'border-white/10 bg-white/5 text-zinc-400'}`}>{role.icon}</div>
                      <div className="font-mono text-sm text-white">{role.name}</div>
                      {selectedRole === role.id ? <Check size={16} className="ml-auto text-primary" /> : null}
                    </div>
                    <p className="text-sm font-mono leading-relaxed text-zinc-400">{role.description}</p>
                  </button>
                ))}
              </div>
            </SurfaceCard>
          </BlurFade>

          <BlurFade delay={0.1}>
            <SurfaceCard className="premium-panel p-6">
              <h2 className="mb-5 font-pixel text-2xl tracking-[0.08em] text-white">INTERVIEW FORMAT</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {interviewTypes.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => {
                      dispatch({ type: 'patch', value: { selectedType: type.id, currentStep: 4 } });
                    }}
                    className={`rounded-3xl border p-5 text-left transition-colors ${selectedType === type.id ? 'border-secondary/30 bg-secondary/10' : 'border-white/10 bg-white/3 hover:bg-white/5'}`}
                  >
                    <div className="mb-4 flex items-center gap-3">
                      <div className={`rounded-2xl border p-3 ${selectedType === type.id ? 'border-secondary/20 bg-secondary/15 text-secondary' : 'border-white/10 bg-white/5 text-zinc-400'}`}>{type.icon}</div>
                      <div>
                        <div className="font-mono text-sm text-white">{type.name}</div>
                        <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">{type.time}</div>
                      </div>
                      {selectedType === type.id ? <Check size={16} className="ml-auto text-secondary" /> : null}
                    </div>
                    <p className="text-sm font-mono leading-relaxed text-zinc-400">{type.description}</p>
                  </button>
                ))}
              </div>
            </SurfaceCard>
          </BlurFade>

          <BlurFade delay={0.15}>
            <SurfaceCard className="premium-panel p-6">
              <h2 className="mb-5 font-pixel text-2xl tracking-[0.08em] text-white">LANGUAGE</h2>
              <div className="flex flex-wrap gap-3">
                {languages.map((lang) => (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => {
                      dispatch({ type: 'patch', value: { selectedLanguage: lang.id, currentStep: 5 } });
                    }}
                    className={`rounded-full border px-4 py-2 text-sm font-mono transition-colors ${selectedLanguage === lang.id ? 'border-white/20 bg-white/10 text-white' : 'border-white/10 bg-white/3 text-zinc-400 hover:bg-white/5'}`}
                  >
                    {lang.name}
                  </button>
                ))}
              </div>
            </SurfaceCard>
          </BlurFade>
        </div>

        <div className="space-y-6">
          <BlurFade delay={0.08}>
            <SurfaceCard className="premium-panel p-6">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/3 px-4 py-2 text-xs uppercase tracking-[0.2em] text-zinc-400">
                Practice Space
              </div>
              <h3 className="font-pixel text-2xl tracking-[0.08em] text-white">SESSION SUMMARY</h3>
              <div className="mt-6 space-y-4 text-sm font-mono text-zinc-300">
                <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                  <span className="text-zinc-500">Role</span>
                  <span>{roles.find((role) => role.id === selectedRole)?.name}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                  <span className="text-zinc-500">Format</span>
                  <span>{interviewTypes.find((type) => type.id === selectedType)?.name}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                  <span className="text-zinc-500">Language</span>
                  <span>{languages.find((lang) => lang.id === selectedLanguage)?.name}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                  <span className="text-zinc-500">Mic Status</span>
                  <span>{micConnected ? 'Connected' : 'Pending'}</span>
                </div>
              </div>
            </SurfaceCard>
          </BlurFade>

          <BlurFade delay={0.12}>
            <SurfaceCard className="premium-panel p-6">
              <h3 className="font-pixel text-2xl tracking-[0.08em] text-white">LAUNCH</h3>
              <p className="mt-3 text-sm font-mono leading-relaxed text-zinc-400">You can exit anytime, retry as often as needed, and review every completed session after the run.</p>
              <div className="mt-6">
                <HoverGlowButton onClick={handleStart} disabled={!micConnected || isCreating}>
                  {isCreating ? 'Creating Session...' : 'Start Interview'}
                  <ChevronRight size={18} />
                </HoverGlowButton>
                {!micConnected ? <p className="mt-3 text-center text-xs font-mono uppercase tracking-[0.18em] text-zinc-500">Connect your microphone to continue.</p> : null}
              </div>
            </SurfaceCard>
          </BlurFade>
        </div>
      </section>
    </PageLayout>
  );
};

export default InterviewSetup;
