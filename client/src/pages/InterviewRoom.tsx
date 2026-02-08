
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Button from '../components/ui/Button';
import { Mic, MicOff, Video, VideoOff, Play, Code2, Loader2, Clock, PhoneOff } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { toast } from 'sonner';
import { interviews } from '../services/api';
import { IInterview } from '../types';
import env from '../config/env';

interface WSMessage {
    type?: 'error' | 'ai_thinking' | 'ai_done' | 'pong' | 'stt_reconnecting' | 'auth_success';
    message?: string;
    transcript?: string;
    audio?: string;
    isFinal?: boolean;
    speaker?: string;
    attempt?: number;
}

interface CustomWindow extends Window {
    AudioContext: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
    _sharedAudioContext?: AudioContext;
}

interface AudioRecorderPolyfill {
    stop: () => void;
    state: string;
}

const typeLabel: Record<string, string> = {
    technical: 'Technical Interview',
    behavioral: 'Behavioral Interview',
    'system-design': 'System Design Interview',
};

// F7: Language-specific starter templates
const codeTemplates: Record<string, string> = {
    javascript: '// Write your solution here\nfunction solve() {\n  \n}\n',
    python: '# Write your solution here\ndef solve():\n    pass\n',
    java: '// Write your solution here\nclass Solution {\n    public int[] solve() {\n        return new int[]{};\n    }\n}\n',
    cpp: '// Write your solution here\n#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> solve() {\n        return {};\n    }\n};\n',
};

const InterviewRoom: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // Core state
    const [micOn, setMicOn] = useState(false);
    const [videoOn, setVideoOn] = useState(true);
    const [language, setLanguage] = useState('javascript');
    const [code, setCode] = useState(codeTemplates.javascript);
    const [output, setOutput] = useState('');
    const [interview, setInterview] = useState<IInterview | null>(null);
    const [loadingInterview, setLoadingInterview] = useState(true);
    const [transcript, setTranscript] = useState('');

    // F1: Timer state
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [timerActive, setTimerActive] = useState(false);

    // F3: AI thinking state
    const [aiThinking, setAiThinking] = useState(false);

    // F4: Partial transcript
    const [partialTranscript, setPartialTranscript] = useState('');

    // F5: Connection status
    const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

    // F2: End interview dialog
    const [showEndDialog, setShowEndDialog] = useState(false);

    // Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | AudioRecorderPolyfill | null>(null);
    const transcriptRef = useRef<HTMLDivElement>(null); // F6
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const muteReminderRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // F1: Timer effect
    useEffect(() => {
        if (timerActive) {
            timerRef.current = setInterval(() => {
                setElapsedSeconds(s => s + 1);
            }, 1000);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [timerActive]);

    const formatTime = (seconds: number): string => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // F6: Auto-scroll transcript
    useEffect(() => {
        if (transcriptRef.current) {
            transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
        }
    }, [transcript, partialTranscript, aiThinking]);

    // F8: Mute reminder
    useEffect(() => {
        if (muteReminderRef.current) clearTimeout(muteReminderRef.current);

        if (!micOn && timerActive) {
            muteReminderRef.current = setTimeout(() => {
                toast.info('Your microphone is muted. Click the mic button to start speaking.');
            }, 30000);
        }

        return () => {
            if (muteReminderRef.current) clearTimeout(muteReminderRef.current);
        };
    }, [micOn, timerActive]);

    // Fetch interview data
    useEffect(() => {
        if (!id) return;
        const fetchInterview = async () => {
            try {
                const res = await interviews.getOne(id);
                const data = res.data;
                const interviewData: IInterview =
                    data?.data?.interview ?? data?.interview ?? data;
                setInterview(interviewData);
            } catch {
                toast.error('Failed to load interview data');
                navigate('/dashboard');
            } finally {
                setLoadingInterview(false);
            }
        };
        fetchInterview();
    }, [id, navigate]);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            streamRef.current = stream;
            setVideoOn(true);
        } catch (err) {
            console.error('Error accessing media devices:', err);
            toast.error('Failed to access camera/microphone. Please check permissions.');
            setVideoOn(false);
        }
    };

    const stopMedia = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current = null;
        }
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
    };

    useEffect(() => {
        const initCamera = async () => {
            await startCamera();
        };
        initCamera();
        return () => stopMedia();
    }, []);

    // Start audio capture (separated from WS connection for mute/unmute)
    const startAudioCapture = async () => {
        if (!streamRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const ws = wsRef.current;
        try {
            const win = window as unknown as CustomWindow;
            const AudioContextClass = win.AudioContext || win.webkitAudioContext;
            const audioCtx = new AudioContextClass({ sampleRate: 16000 });

            await audioCtx.audioWorklet.addModule('/pcm-processor.js');

            const source = audioCtx.createMediaStreamSource(streamRef.current);
            const workletNode = new AudioWorkletNode(audioCtx, 'pcm-processor');

            workletNode.port.onmessage = (event) => {
                if (ws.readyState === WebSocket.OPEN && event.data) {
                    ws.send(event.data);
                }
            };

            source.connect(workletNode);
            workletNode.connect(audioCtx.destination);

            mediaRecorderRef.current = {
                stop: () => {
                    workletNode.disconnect();
                    source.disconnect();
                    audioCtx.close();
                },
                state: 'recording'
            };
        } catch (err) {
            console.error('AudioWorklet init failed, falling back to MediaRecorder:', err);

            try {
                const recorder = new MediaRecorder(streamRef.current);
                recorder.ondataavailable = async (event) => {
                    if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
                        const buffer = await event.data.arrayBuffer();
                        ws.send(buffer);
                    }
                };
                recorder.start(100);

                mediaRecorderRef.current = {
                    stop: () => recorder.stop(),
                    state: 'recording'
                };
            } catch (fallbackErr) {
                console.error('Fallback MediaRecorder failed:', fallbackErr);
                toast.error('Audio capture failed. Please ensure microphone permissions are granted.');
            }
        }
    };

    // Connect WebSocket (separate from audio capture)
    const connectWebSocket = () => {
        const wsUrl = env.WS_URL;

        const token = localStorage.getItem('token');
        if (!token) {
            toast.error('Authentication required. Please log in again.');
            return;
        }

        setConnectionStatus('connecting');
        const ws = new WebSocket(`${wsUrl}?interviewId=${encodeURIComponent(id || '')}`);
        wsRef.current = ws;

        ws.onopen = () => {
            // Send auth token as first message (not in URL to prevent logging/exposure)
            ws.send(JSON.stringify({ type: 'auth', token }));
        };

        ws.onmessage = async (event) => {
            try {
                const data = JSON.parse(event.data) as WSMessage;

                // Handle auth success — start session after server confirms auth
                if (data.type === 'auth_success') {
                    setConnectionStatus('connected');
                    if (!timerActive) setTimerActive(true);
                    await startAudioCapture();
                    return;
                }

                // F3: Handle AI thinking state
                if (data.type === 'ai_thinking') {
                    setAiThinking(true);
                    return;
                }
                if (data.type === 'ai_done') {
                    setAiThinking(false);
                    return;
                }

                // Handle errors
                if (data.type === 'error' && data.message) {
                    console.error('Server Error:', data.message);
                    toast.error(data.message);
                    return;
                }

                // Handle STT reconnection notices
                if (data.type === 'stt_reconnecting') {
                    toast.warning(`Voice recognition reconnecting (attempt ${data.attempt || '?'}/3)...`);
                    return;
                }

                if (data.type === 'pong') return;

                // F4: Handle transcription (final + partial)
                if (data.transcript) {
                    if (data.isFinal) {
                        const speaker = data.speaker === 'ai' ? 'AI' : 'You';
                        setTranscript(prev => {
                            const prefix = prev ? '\n' : '';
                            return `${prev}${prefix}${speaker}: ${data.transcript}`;
                        });
                        if (data.speaker === 'user') {
                            setPartialTranscript('');
                        }
                    } else if (data.speaker === 'user') {
                        setPartialTranscript(data.transcript || '');
                    }
                }

                // Handle audio playback
                if (data.audio) {
                    try {
                        const win = window as unknown as CustomWindow;
                        let audioCtx = win._sharedAudioContext;

                        if (!audioCtx || audioCtx.state === 'closed') {
                            const AudioContextClass = win.AudioContext || win.webkitAudioContext;
                            if (AudioContextClass) {
                                audioCtx = new AudioContextClass();
                                win._sharedAudioContext = audioCtx;
                            }
                        }

                        if (!audioCtx) return;

                        const audioData = atob(data.audio);
                        const arrayBuffer = new ArrayBuffer(audioData.length);
                        const view = new Uint8Array(arrayBuffer);
                        for (let i = 0; i < audioData.length; i++) {
                            view[i] = audioData.charCodeAt(i);
                        }

                        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
                        const source = audioCtx.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(audioCtx.destination);
                        source.start(0);
                    } catch (decodeErr) {
                        console.error('Error decoding audio', decodeErr);
                    }
                }
            } catch (e) {
                console.error('WS Parse Error', e);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket Error:', error);
            toast.error('Connection error. Is the backend running?');
        };

        ws.onclose = () => {
            setConnectionStatus('disconnected');
        };
    };

    // Toggle microphone (mute/unmute without disconnecting WS)
    const toggleMic = () => {
        if (micOn) {
            // Mute: stop audio capture, keep WS open
            if (mediaRecorderRef.current) {
                mediaRecorderRef.current.stop();
                mediaRecorderRef.current = null;
            }
            setMicOn(false);
        } else {
            // Unmute: reconnect WS if needed, then start audio
            if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                connectWebSocket();
            } else {
                startAudioCapture();
            }
            setMicOn(true);
        }
    };

    // F2: End interview with cleanup and redirect
    const endInterview = () => {
        setShowEndDialog(false);
        setTimerActive(false);
        setMicOn(false);

        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current = null;
        }
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        setConnectionStatus('disconnected');
        navigate(`/feedback/${id}`);
    };

    // F7: Handle language change with template swap
    const handleLanguageChange = (newLang: string) => {
        setLanguage(newLang);
        setCode(codeTemplates[newLang] || codeTemplates.javascript);
    };

    // Run code
    const runCode = async () => {
        setOutput('Running...');
        const token = localStorage.getItem('token');
        if (!token) {
            toast.error('Authentication required. Please log in again.');
            setOutput('Error: Not authenticated');
            return;
        }
        try {
            const response = await fetch(`${env.API_URL}/interviews/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ language, code })
            });

            const data = await response.json();
            if (data.success) {
                setOutput(data.output);
                toast.success('Code executed successfully');
            } else {
                setOutput(`Error: ${data.message}`);
                toast.error(data.message || 'Execution failed');
            }
        } catch (err) {
            console.error('Execution Error:', err);
            setOutput('Failed to connect to execution server.');
            toast.error('Network error during execution');
        }
    };

    // Resume suspended AudioContext on user gesture (Safari compatibility)
    useEffect(() => {
        const handleGesture = () => {
            const win = window as unknown as CustomWindow;
            if (win._sharedAudioContext && win._sharedAudioContext.state === 'suspended') {
                win._sharedAudioContext.resume();
            }
        };
        window.addEventListener('click', handleGesture);
        window.addEventListener('touchstart', handleGesture);
        return () => {
            window.removeEventListener('click', handleGesture);
            window.removeEventListener('touchstart', handleGesture);
        };
    }, []);

    if (loadingInterview) {
        return (
            <div className="h-screen bg-background text-white flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="h-screen bg-background text-white overflow-hidden flex flex-col">
            <Navbar />

            {/* F2: End Interview Confirmation Dialog */}
            {showEndDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
                        <h3 className="text-xl font-bold mb-2">End Interview?</h3>
                        <p className="text-gray-400 text-sm mb-6">
                            This will end your interview session and generate your feedback report.
                            You won't be able to resume this interview.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowEndDialog(false)}
                                className="px-5 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={endInterview}
                                className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-sm font-medium transition-colors"
                            >
                                End Interview
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col lg:flex-row pt-16 overflow-y-auto lg:overflow-hidden">
                {/* Left Panel: Media & Context */}
                <div className="w-full lg:w-1/3 border-b lg:border-b-0 lg:border-r border-zinc-800 flex flex-col min-h-[500px] lg:min-h-0">
                    {/* AI/Question Area */}
                    <div className="h-1/2 p-6 border-b border-zinc-800 flex flex-col min-h-[300px]">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-gray-400 font-mono text-sm uppercase tracking-tighter">
                                {interview ? typeLabel[interview.type] || interview.type : 'INTERVIEW'}
                            </h2>

                            {/* F1: Timer + F5: Connection Status */}
                            <div className="flex items-center gap-3">
                                {/* F5: Connection status indicator */}
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

                                {/* F1: Timer display */}
                                {timerActive && (
                                    <div className="flex items-center gap-1.5 bg-zinc-800/80 px-2.5 py-1 rounded-full">
                                        <Clock size={12} className="text-primary" />
                                        <span className="font-mono text-xs text-gray-300">
                                            {formatTime(elapsedSeconds)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <h3 className="text-xl font-bold mb-4">
                            {interview ? typeLabel[interview.type] || 'Interview Session' : 'Loading...'}
                        </h3>
                        <p className="text-gray-300 leading-relaxed mb-6 overflow-y-auto max-h-[120px] lg:max-h-none lg:flex-1">
                            {interview?.type === 'technical'
                                ? 'Solve the coding challenge presented by the AI interviewer. Explain your thought process as you code.'
                                : interview?.type === 'behavioral'
                                ? 'Answer the behavioral questions from the AI interviewer. Use the STAR method to structure your responses.'
                                : 'Walk through your system design approach with the AI interviewer. Discuss trade-offs and scalability.'}
                        </p>

                        {/* Transcript Area — F4: Partial transcripts, F6: Auto-scroll */}
                        <div
                            ref={transcriptRef}
                            className="bg-zinc-900/50 rounded-xl p-4 flex-1 overflow-y-auto font-mono text-xs text-gray-400 whitespace-pre-wrap border border-zinc-800/50 mb-4 min-h-[80px]"
                        >
                            {transcript || (
                                <span className="text-zinc-600 italic">Waiting for interview to start...</span>
                            )}
                            {/* F4: Live partial transcript */}
                            {partialTranscript && (
                                <div className="text-zinc-500 italic mt-1">
                                    You: {partialTranscript}...
                                </div>
                            )}
                            {/* F3: AI thinking indicator */}
                            {aiThinking && (
                                <div className="flex items-center gap-2 mt-2 text-primary">
                                    <div className="flex gap-1">
                                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                    <span className="text-xs">AI is thinking...</span>
                                </div>
                            )}
                        </div>

                        {/* AI Status */}
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

                    {/* User Video Area */}
                    <div className="h-1/2 bg-black relative p-4 flex items-center justify-center overflow-hidden min-h-[250px]">
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

                        {/* Controls bar */}
                        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-3 bg-zinc-900/80 backdrop-blur-xl p-2.5 rounded-full border border-zinc-700/50 shadow-2xl">
                            <button
                                onClick={toggleMic}
                                className={`p-3.5 rounded-full ${micOn ? 'bg-primary text-black shadow-[0_0_20px_rgba(var(--primary-rgb),0.6)]' : 'bg-zinc-800 hover:bg-zinc-700'} transition-all duration-300 active:scale-95`}
                                title={micOn ? 'Mute microphone' : 'Unmute microphone'}
                                aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
                            >
                                {micOn ? <Mic size={20} /> : <MicOff size={20} />}
                            </button>
                            <button
                                onClick={() => setVideoOn(!videoOn)}
                                className={`p-3.5 rounded-full ${videoOn ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]'} transition-all duration-300 active:scale-95`}
                                title={videoOn ? 'Turn off camera' : 'Turn on camera'}
                                aria-label={videoOn ? 'Turn off camera' : 'Turn on camera'}
                            >
                                {videoOn ? <Video size={20} /> : <VideoOff size={20} />}
                            </button>
                            {/* F2: End Interview button */}
                            <button
                                onClick={() => setShowEndDialog(true)}
                                className="p-3.5 rounded-full bg-red-600/80 hover:bg-red-500 text-white transition-all duration-300 active:scale-95"
                                title="End interview"
                                aria-label="End interview"
                            >
                                <PhoneOff size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Code Editor */}
                <div className="w-full lg:w-2/3 flex flex-col bg-[#0d0d0d] relative">
                    {/* Editor Header */}
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
                                onChange={(e) => handleLanguageChange(e.target.value)}
                                className="bg-zinc-800 border border-zinc-700 text-sm rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all cursor-pointer hover:bg-zinc-700"
                                aria-label="Select programming language"
                            >
                                <option value="javascript">JavaScript</option>
                                <option value="python">Python</option>
                                <option value="java">Java</option>
                                <option value="cpp">C++</option>
                            </select>
                            <Button size="sm" className="flex items-center" onClick={runCode}>
                                <Play size={14} className="mr-2" />
                                Run Code
                            </Button>
                        </div>
                    </div>

                    {/* Monaco Editor */}
                    <div className="flex-1 relative">
                        <Editor
                            height="100%"
                            defaultLanguage="javascript"
                            language={language}
                            value={code}
                            onChange={(value) => setCode(value || '')}
                            theme="vs-dark"
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                fontFamily: 'JetBrains Mono',
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                padding: { top: 16 }
                            }}
                        />
                    </div>

                    {/* Console/Output */}
                    <div className="h-48 bg-[#111] border-t border-zinc-800 flex flex-col">
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
            </div>
        </div>
    );
};

export default InterviewRoom;
