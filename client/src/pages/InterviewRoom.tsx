import React, { useRef, useEffect, lazy, Suspense, RefObject } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Button from '../components/ui/Button';
import { Mic, MicOff, Video, VideoOff, Play, Code2, Loader2, Clock, PhoneOff } from 'lucide-react';
import { IInterview } from '../types';
import { useFadeIn, useScaleIn, useStaggerFadeIn } from '../hooks/useAnimations';
import { ConnectionStatus, useInterviewRoomController } from '../hooks/useInterviewRoomController';
import type { InterviewLanguage, InterviewRole } from '../lib/interviewSessionConfig';

// bundle-dynamic-imports: Lazy-load Monaco Editor (~2MB) so it only loads when InterviewRoom is visited
const LazyEditor = lazy(() => import('@monaco-editor/react'));

const typeLabel: Record<string, string> = {
    technical: 'Technical Interview',
    behavioral: 'Behavioral Interview',
    'system-design': 'System Design Interview',
};

// rendering-hoist-jsx: Hoist static config outside component to prevent re-creation per render
const EDITOR_OPTIONS = {
    minimap: { enabled: false },
    fontSize: 14,
    fontFamily: 'JetBrains Mono',
    scrollBeyondLastLine: false,
    automaticLayout: true,
    padding: { top: 16 },
} as const;

// rerender-memo: Pure function — hoist outside component
const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};

interface EndInterviewDialogProps {
    onCancel: () => void;
    onConfirm: () => void;
}

function EndInterviewDialog({ onCancel, onConfirm }: EndInterviewDialogProps) {
    const dialogRef = useRef<HTMLDivElement>(null);
    const cancelRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        cancelRef.current?.focus();
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onCancel();
            }
            if (e.key !== 'Tab') return;
            const el = dialogRef.current;
            if (!el) return;
            const focusables = el.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last?.focus();
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first?.focus();
                }
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onCancel]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            role="presentation"
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="end-interview-dialog-title"
                aria-describedby="end-interview-dialog-desc"
                className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
            >
                <h3 id="end-interview-dialog-title" className="text-xl font-bold mb-2">End Interview?</h3>
                <p id="end-interview-dialog-desc" className="text-gray-400 text-sm mb-6">
                    This will end your interview session and generate your feedback report.
                    You won&apos;t be able to resume this interview.
                </p>
                <div className="flex gap-3 justify-end">
                    <button
                        ref={cancelRef}
                        type="button"
                        onClick={onCancel}
                        className="px-5 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
                        aria-label="End interview and generate report"
                    >
                        End Interview
                    </button>
                </div>
            </div>
        </div>
    );
}

function LoadingInterviewRoom({ loadingCardRef }: { loadingCardRef: RefObject<HTMLDivElement | null> }) {
    return (
        <div className="h-screen bg-background text-white flex items-center justify-center px-4">
            <div ref={loadingCardRef} className="premium-panel rounded-4xl border border-white/10 bg-black/45 px-8 py-10 text-center shadow-[0_30px_90px_rgba(0,0,0,0.42)]">
                <Loader2 className="mx-auto mb-4 h-9 w-9 animate-spin text-primary" />
                <div className="font-pixel text-2xl tracking-[0.08em] text-white">LOADING ROOM</div>
                <p className="mt-3 text-sm font-mono text-zinc-400">Preparing your interview environment.</p>
            </div>
        </div>
    );
}

interface InterviewContextPanelProps {
    interview: IInterview | null;
    connectionStatus: ConnectionStatus;
    timerActive: boolean;
    elapsedSeconds: number;
    transcriptRef: RefObject<HTMLDivElement | null>;
    transcriptShellRef: RefObject<HTMLDivElement | null>;
    transcript: string;
    partialTranscript: string;
    aiThinking: boolean;
    micOn: boolean;
}

function InterviewContextPanel({
    interview,
    connectionStatus,
    timerActive,
    elapsedSeconds,
    transcriptRef,
    transcriptShellRef,
    transcript,
    partialTranscript,
    aiThinking,
    micOn,
}: InterviewContextPanelProps) {
    return (
        <div className="h-1/2 p-6 border-b border-zinc-800 flex flex-col min-h-75">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-gray-400 font-mono text-sm uppercase tracking-tighter">
                    {interview ? typeLabel[interview.type] || interview.type : 'INTERVIEW'}
                </h2>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5" title={`Status: ${connectionStatus}`}>
                        <div className={`w-2 h-2 rounded-full ${
                            connectionStatus === 'connected'
                                ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]'
                                : connectionStatus === 'connecting'
                                ? 'bg-yellow-400 animate-pulse'
                                : 'bg-zinc-600'
                        }`} />
                        <span className="text-[10px] font-mono text-gray-500">
                            {connectionStatus === 'connected' ? 'Live'
                                : connectionStatus === 'connecting' ? 'Connecting'
                                : 'Offline'}
                        </span>
                    </div>

                    {timerActive ? (
                        <div className="flex items-center gap-1.5 bg-zinc-800/80 px-2.5 py-1 rounded-full">
                            <Clock size={12} className="text-primary" />
                            <span className="font-mono text-xs text-gray-300">
                                {formatTime(elapsedSeconds)}
                            </span>
                        </div>
                    ) : null}
                </div>
            </div>

            <h3 className="text-xl font-bold mb-4">
                {interview ? typeLabel[interview.type] || 'Interview Session' : 'Loading...'}
            </h3>
            <p className="text-gray-300 leading-relaxed mb-6 overflow-y-auto max-h-30 lg:max-h-none lg:flex-1">
                {interview?.type === 'technical'
                    ? 'Solve the coding challenge presented by the AI interviewer. Explain your thought process as you code.'
                    : interview?.type === 'behavioral'
                    ? 'Answer the behavioral questions from the AI interviewer. Use the STAR method to structure your responses.'
                    : 'Walk through your system design approach with the AI interviewer. Discuss trade-offs and scalability.'}
            </p>

            <div ref={transcriptShellRef} className="room-card">
                <div
                    ref={transcriptRef}
                    className="bg-zinc-900/50 rounded-xl p-4 flex-1 overflow-y-auto font-mono text-xs text-gray-400 whitespace-pre-wrap border border-zinc-800/50 mb-4 min-h-20"
                >
                    {transcript || (
                        <span className="text-zinc-600 italic">Waiting for interview to start...</span>
                    )}
                    {partialTranscript ? (
                        <div className="text-zinc-500 italic mt-1">
                            You: {partialTranscript}...
                        </div>
                    ) : null}
                    {aiThinking ? (
                        <div className="flex items-center gap-2 mt-2 text-primary">
                            <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            <span className="text-xs">AI is thinking...</span>
                        </div>
                    ) : null}
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    aiThinking
                        ? 'bg-primary/80 animate-pulse shadow-[0_0_20px_rgba(var(--primary-rgb),0.6)]'
                        : 'bg-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]'
                }`}>
                    <span className="text-black font-bold text-[10px]">AI</span>
                </div>
                <div className="text-xs text-gray-500 font-medium">
                    {aiThinking
                        ? 'AI is formulating a response...'
                        : micOn
                        ? 'Interviewer listening...'
                        : connectionStatus === 'connected'
                        ? 'Mic muted — Click mic to speak'
                        : 'Click mic to start the interview'}
                </div>
            </div>
        </div>
    );
}

interface InterviewVideoPanelProps {
    videoRef: RefObject<HTMLVideoElement | null>;
    videoOn: boolean;
    micOn: boolean;
    onToggleMic: () => void;
    onToggleVideo: () => void;
    onEndInterview: () => void;
    controlsRef: RefObject<HTMLDivElement | null>;
}

function InterviewVideoPanel({
    videoRef,
    videoOn,
    micOn,
    onToggleMic,
    onToggleVideo,
    onEndInterview,
    controlsRef,
}: InterviewVideoPanelProps) {
    return (
        <div className="h-1/2 bg-black relative p-4 flex items-center justify-center overflow-hidden min-h-62.5 sm:min-h-62 lg:min-h-0">
            <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover rounded-xl shadow-2xl ${videoOn ? 'block' : 'hidden'}`}
            />
            {!videoOn && (
                <div className="w-full h-full bg-zinc-950 rounded-xl flex items-center justify-center border border-zinc-800">
                    <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800">
                        <span className="text-2xl text-gray-500 font-bold">You</span>
                    </div>
                </div>
            )}

            <div ref={controlsRef} className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-3 bg-zinc-900/80 backdrop-blur-xl p-2.5 rounded-full border border-zinc-700/50 shadow-2xl">
                <button
                    onClick={onToggleMic}
                    className={`room-control p-3.5 rounded-full ${micOn ? 'bg-primary text-black shadow-[0_0_20px_rgba(var(--primary-rgb),0.6)]' : 'bg-zinc-800 hover:bg-zinc-700'} transition-all duration-300 active:scale-95`}
                    title={micOn ? 'Mute microphone' : 'Unmute microphone'}
                    aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
                >
                    {micOn ? <Mic size={20} /> : <MicOff size={20} />}
                </button>
                <button
                    onClick={onToggleVideo}
                    className={`room-control p-3.5 rounded-full ${videoOn ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]'} transition-all duration-300 active:scale-95`}
                    title={videoOn ? 'Turn off camera' : 'Turn on camera'}
                    aria-label={videoOn ? 'Turn off camera' : 'Turn on camera'}
                >
                    {videoOn ? <Video size={20} /> : <VideoOff size={20} />}
                </button>
                <button
                    onClick={onEndInterview}
                    className="room-control p-3.5 rounded-full bg-red-600/80 hover:bg-red-500 text-white transition-all duration-300 active:scale-95"
                    title="End interview"
                    aria-label="End interview"
                >
                    <PhoneOff size={20} />
                </button>
            </div>
        </div>
    );
}

interface InterviewEditorPanelProps {
    rightPanelRef: RefObject<HTMLDivElement | null>;
    language: string;
    onLanguageChange: (language: string) => void;
    onRunCode: () => void;
    code: string;
    onCodeChange: (code: string) => void;
    output: string;
}

function InterviewEditorPanel({
    rightPanelRef,
    language,
    onLanguageChange,
    onRunCode,
    code,
    onCodeChange,
    output,
}: InterviewEditorPanelProps) {
    return (
        <div ref={rightPanelRef} className="w-full lg:w-2/3 flex flex-col bg-[#0d0d0d] relative">
            <div className="h-12 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <Code2 size={16} className="text-primary" />
                    <span className="font-mono text-sm">
                        main.{language === 'javascript' ? 'js' : language === 'python' ? 'py' : language === 'java' ? 'java' : language === 'cpp' ? 'cpp' : 'txt'}
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <select
                        value={language}
                        onChange={(e) => onLanguageChange(e.target.value)}
                        className="bg-zinc-800 border border-zinc-700 text-sm rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all cursor-pointer hover:bg-zinc-700"
                        aria-label="Select programming language"
                    >
                        <option value="javascript">JavaScript</option>
                        <option value="python">Python</option>
                        <option value="java">Java</option>
                        <option value="cpp">C++</option>
                    </select>
                    <Button size="sm" className="flex items-center" onClick={onRunCode}>
                        <Play size={14} className="mr-2" />
                        Run Code
                    </Button>
                </div>
            </div>

            <div className="room-card flex-1 relative">
                <Suspense fallback={
                    <div className="flex items-center justify-center h-full text-zinc-500">
                        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading editor...
                    </div>
                }>
                    <LazyEditor
                        height="100%"
                        defaultLanguage="javascript"
                        language={language}
                        value={code}
                        onChange={(value) => onCodeChange(value || '')}
                        theme="vs-dark"
                        options={EDITOR_OPTIONS}
                    />
                </Suspense>
            </div>

            <div className="room-card h-48 bg-[#111] border-t border-zinc-800 flex flex-col">
                <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-900/50 text-xs font-mono text-gray-500 uppercase tracking-wider">
                    Console Output
                </div>
                <div className="flex-1 p-4 font-mono text-sm overflow-y-auto font-medium">
                    {output ? (
                        <pre className="text-emerald-400 whitespace-pre-wrap">{output}</pre>
                    ) : (
                        <span className="text-zinc-600 italic">Ready to execute...</span>
                    )}
                </div>
            </div>
        </div>
    );
}

const InterviewRoom: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const loadingCardRef = useRef<HTMLDivElement>(null);
    const leftPanelRef = useRef<HTMLDivElement>(null);
    const rightPanelRef = useRef<HTMLDivElement>(null);
    const transcriptShellRef = useRef<HTMLDivElement>(null);
    const controlsRef = useRef<HTMLDivElement>(null);

    const sessionConfig = (location.state ?? {}) as {
        role?: InterviewRole;
        language?: InterviewLanguage;
    };

    const {
        micOn,
        videoOn,
        toggleVideo,
        language,
        code,
        setCode,
        output,
        interview,
        loadingInterview,
        transcript,
        elapsedSeconds,
        timerActive,
        aiThinking,
        partialTranscript,
        connectionStatus,
        showEndDialog,
        setShowEndDialog,
        videoRef,
        transcriptRef,
        toggleMic,
        endInterview,
        handleLanguageChange,
        runCode,
    } = useInterviewRoomController(id, navigate, sessionConfig);

    useScaleIn(loadingCardRef, 0.08);
    useFadeIn(leftPanelRef, 0.06, 0.8, 20);
    useFadeIn(rightPanelRef, 0.14, 0.85, 22);
    useFadeIn(transcriptShellRef, 0.18, 0.75, 18);
    useStaggerFadeIn(controlsRef, '.room-control', 0.22, 0.08, 14);

    if (loadingInterview) {
        return <LoadingInterviewRoom loadingCardRef={loadingCardRef} />;
    }

    return (
        <div className="h-screen bg-background text-white overflow-hidden flex flex-col">
            <Navbar />

            {showEndDialog ? <EndInterviewDialog onCancel={() => setShowEndDialog(false)} onConfirm={endInterview} /> : null}

            <div className="flex-1 flex flex-col lg:flex-row pt-16 overflow-y-auto lg:overflow-hidden">
                <div ref={leftPanelRef} className="w-full lg:w-1/3 border-b lg:border-b-0 lg:border-r border-zinc-800 flex flex-col min-h-125 lg:min-h-0">
                    <InterviewContextPanel
                        interview={interview}
                        connectionStatus={connectionStatus}
                        timerActive={timerActive}
                        elapsedSeconds={elapsedSeconds}
                        transcriptRef={transcriptRef}
                        transcriptShellRef={transcriptShellRef}
                        transcript={transcript}
                        partialTranscript={partialTranscript}
                        aiThinking={aiThinking}
                        micOn={micOn}
                    />
                    <InterviewVideoPanel
                        videoRef={videoRef}
                        videoOn={videoOn}
                        micOn={micOn}
                        onToggleMic={toggleMic}
                        onToggleVideo={toggleVideo}
                        onEndInterview={() => setShowEndDialog(true)}
                        controlsRef={controlsRef}
                    />
                </div>
                <InterviewEditorPanel
                    rightPanelRef={rightPanelRef}
                    language={language}
                    onLanguageChange={handleLanguageChange}
                    onRunCode={runCode}
                    code={code}
                    onCodeChange={setCode}
                    output={output}
                />
            </div>
        </div>
    );
};

export default InterviewRoom;
