import { useEffect, useRef, useState } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { toast } from 'sonner';
import { interviews } from '../services/api';
import type { IInterview } from '../types';
import env from '../config/env';
import { getInterviewSessionConfig, type InterviewLanguage, type InterviewRole } from '../lib/interviewSessionConfig';
import { StreamingAudioPlayer } from '../lib/streamingAudioPlayer';

interface WSMessage {
    type?:
        | 'error'
        | 'ai_thinking'
        | 'ai_done'
        | 'pong'
        | 'stt_reconnecting'
        | 'auth_success'
        | 'audio_chunk'
        | 'tts_error'
        | 'server_shutdown';
    message?: string;
    reason?: string;
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

const codeTemplates: Record<string, string> = {
    javascript: '// Write your solution here\nfunction solve() {\n  \n}\n',
    python: '# Write your solution here\ndef solve():\n    pass\n',
    java: '// Write your solution here\nclass Solution {\n    public int[] solve() {\n        return new int[]{};\n    }\n}\n',
    cpp: '// Write your solution here\n#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> solve() {\n        return {};\n    }\n};\n',
};

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export function useInterviewRoomController(
    id: string | undefined,
    navigate: NavigateFunction,
    sessionConfig?: { role?: InterviewRole; language?: InterviewLanguage }
) {
    const [micOn, setMicOn] = useState(false);
    const [videoOn, setVideoOn] = useState(true);
    const [language, setLanguage] = useState('javascript');
    const [code, setCode] = useState(codeTemplates.javascript);
    const [output, setOutput] = useState('');
    const [interview, setInterview] = useState<IInterview | null>(null);
    const [loadingInterview, setLoadingInterview] = useState(true);
    const [transcript, setTranscript] = useState('');
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [timerActive, setTimerActive] = useState(false);
    const [aiThinking, setAiThinking] = useState(false);
    const [partialTranscript, setPartialTranscript] = useState('');
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
    const [showEndDialog, setShowEndDialog] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | AudioRecorderPolyfill | null>(null);
    const transcriptRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const muteReminderRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const activeAudioContextRef = useRef<AudioContext | null>(null);
    const streamingPlayerRef = useRef<StreamingAudioPlayer | null>(null);
    const codeAbortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (!id) return;

        const persistedConfig = getInterviewSessionConfig(id);
        const nextLanguage = sessionConfig?.language ?? persistedConfig?.language ?? 'javascript';
        setLanguage(nextLanguage);
        setCode(codeTemplates[nextLanguage] || codeTemplates.javascript);
    }, [id, sessionConfig?.language]);

    useEffect(() => {
        if (timerActive) {
            timerRef.current = setInterval(() => {
                setElapsedSeconds((seconds) => seconds + 1);
            }, 1000);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [timerActive]);

    useEffect(() => {
        if (transcriptRef.current) {
            transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
        }
    }, [transcript, partialTranscript, aiThinking]);

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

    useEffect(() => {
        if (!id) return;

        const fetchInterview = async () => {
            try {
                const res = await interviews.getOne(id);
                const interviewData: IInterview = res.data.data.interview;
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

    const stopMedia = () => {
        if (muteReminderRef.current) clearTimeout(muteReminderRef.current);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) videoRef.current.srcObject = null;
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current = null;
        }
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        if (activeAudioContextRef.current && activeAudioContextRef.current.state !== 'closed') {
            activeAudioContextRef.current.close().catch(() => undefined);
            activeAudioContextRef.current = null;
        }
        if (streamingPlayerRef.current) {
            streamingPlayerRef.current.destroy();
            streamingPlayerRef.current = null;
        }
        if (codeAbortRef.current) {
            codeAbortRef.current.abort();
            codeAbortRef.current = null;
        }
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            stream.getAudioTracks().forEach((track) => {
                track.enabled = false;
            });
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

    useEffect(() => {
        const initCamera = async () => {
            await startCamera();
        };
        initCamera();
        return () => stopMedia();
    }, []);

    const startAudioCapture = async () => {
        if (!streamRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const ws = wsRef.current;
        try {
            const win = window as unknown as CustomWindow;
            const AudioContextClass = win.AudioContext || win.webkitAudioContext;
            const audioCtx = new AudioContextClass({ sampleRate: 16000 });
            activeAudioContextRef.current = audioCtx;

            await audioCtx.audioWorklet.addModule('/pcm-processor.js');

            const source = audioCtx.createMediaStreamSource(streamRef.current);
            const workletNode = new AudioWorkletNode(audioCtx, 'pcm-processor');
            const silentGain = audioCtx.createGain();
            silentGain.gain.value = 0;

            workletNode.port.onmessage = (event) => {
                if (ws.readyState === WebSocket.OPEN && event.data) {
                    ws.send(event.data);
                }
            };

            source.connect(workletNode);
            workletNode.connect(silentGain);
            silentGain.connect(audioCtx.destination);

            mediaRecorderRef.current = {
                stop: () => {
                    workletNode.disconnect();
                    silentGain.disconnect();
                    source.disconnect();
                    if (activeAudioContextRef.current === audioCtx) {
                        activeAudioContextRef.current = null;
                    }
                    audioCtx.close();
                },
                state: 'recording',
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
                    state: 'recording',
                };
            } catch (fallbackErr) {
                console.error('Fallback MediaRecorder failed:', fallbackErr);
                toast.error('Audio capture failed. Please ensure microphone permissions are granted.');
            }
        }
    };

    const connectWebSocket = () => {
        const token = localStorage.getItem('token');
        if (!token) {
            toast.error('Authentication required. Please log in again.');
            return;
        }

        setConnectionStatus('connecting');
        const params = new URLSearchParams({
            interviewId: id || '',
        });

        if (sessionConfig?.role) {
            params.set('role', sessionConfig.role);
        }
        if (sessionConfig?.language) {
            params.set('language', sessionConfig.language);
        }

        const ws = new WebSocket(`${env.WS_URL}?${params.toString()}`);
        wsRef.current = ws;

        ws.onopen = () => {
            ws.send(JSON.stringify({ type: 'auth', token }));
        };

        ws.onmessage = async (event) => {
            try {
                const data = JSON.parse(event.data) as WSMessage;

                if (data.type === 'auth_success') {
                    setConnectionStatus('connected');
                    if (!timerActive) setTimerActive(true);
                    await startAudioCapture();
                    return;
                }

                if (data.type === 'ai_thinking') {
                    setAiThinking(true);
                    return;
                }
                if (data.type === 'ai_done') {
                    setAiThinking(false);
                    return;
                }

                if (data.type === 'error' && data.message) {
                    console.error('Server Error:', data.message);
                    toast.error(data.message);
                    return;
                }

                if (data.type === 'stt_reconnecting') {
                    toast.warning(`Voice recognition reconnecting (attempt ${data.attempt || '?'}/3)...`);
                    return;
                }

                if (data.type === 'tts_error') {
                    toast.warning(data.message || 'AI voice is unavailable; transcript continues.');
                    return;
                }

                if (data.type === 'server_shutdown') {
                    toast.info(data.message || 'Server is restarting; please reconnect.');
                    return;
                }

                if (data.type === 'pong') return;

                if (data.transcript) {
                    if (data.isFinal) {
                        const speaker = data.speaker === 'ai' ? 'AI' : 'You';
                        setTranscript((prev) => {
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

                /**
                 * F1 + F22: streaming TTS playback. The server now emits
                 * { type: 'audio_chunk', audio: <b64>, isFinal } per MP3
                 * chunk. We hand each chunk to the StreamingAudioPlayer,
                 * which appends it to a MediaSource SourceBuffer so the
                 * browser starts playback as soon as the first chunk lands
                 * and decoding happens off the main thread.
                 */
                if (data.type === 'audio_chunk') {
                    if (!streamingPlayerRef.current) {
                        streamingPlayerRef.current = new StreamingAudioPlayer({
                            onError: (err) => console.warn('[tts-player] error', err),
                        });
                    }
                    streamingPlayerRef.current.push(data.audio || '', !!data.isFinal);
                    if (data.isFinal) {
                        // After this stream finishes, drop the player so
                        // the next utterance starts a fresh MediaSource.
                        const finishedPlayer = streamingPlayerRef.current;
                        streamingPlayerRef.current = null;
                        setTimeout(() => finishedPlayer?.destroy(), 5_000);
                    }
                    return;
                }

                // Legacy single-frame audio (kept for backwards compatibility
                // with older server builds; new server uses audio_chunk).
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
            } catch (error) {
                console.error('WS Parse Error', error);
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

    const toggleMic = () => {
        const audioTracks = streamRef.current?.getAudioTracks() ?? [];

        if (micOn) {
            if (mediaRecorderRef.current) {
                mediaRecorderRef.current.stop();
                mediaRecorderRef.current = null;
            }
            audioTracks.forEach((track) => {
                track.enabled = false;
            });
            setMicOn(false);
            return;
        }

        audioTracks.forEach((track) => {
            track.enabled = true;
        });

        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            connectWebSocket();
        } else {
            startAudioCapture();
        }
        setMicOn(true);
    };

    const toggleVideo = () => {
        const videoTracks = streamRef.current?.getVideoTracks() ?? [];
        if (!videoTracks.length) {
            toast.error('Camera is unavailable on this device.');
            return;
        }

        const nextVideoOn = !videoOn;
        videoTracks.forEach((track) => {
            track.enabled = nextVideoOn;
        });
        setVideoOn(nextVideoOn);
    };

    const endInterview = () => {
        setShowEndDialog(false);
        setTimerActive(false);
        setMicOn(false);
        streamRef.current?.getAudioTracks().forEach((track) => {
            track.enabled = false;
        });

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

    const handleLanguageChange = (newLanguage: string) => {
        setLanguage(newLanguage);
        setCode(codeTemplates[newLanguage] || codeTemplates.javascript);
    };

    /**
     * F21: code execution with abort + timeout. We cancel any prior
     * in-flight run before starting a new one, set a hard 35s client
     * timeout, and surface AbortError distinctly so users see the
     * cancellation rather than a generic network failure.
     */
    const runCode = async () => {
        setOutput('Running...');
        const token = localStorage.getItem('token');
        if (!token) {
            toast.error('Authentication required. Please log in again.');
            setOutput('Error: Not authenticated');
            return;
        }

        if (codeAbortRef.current) {
            codeAbortRef.current.abort();
        }
        const controller = new AbortController();
        codeAbortRef.current = controller;
        const timeoutId = setTimeout(() => controller.abort(), 35_000);

        try {
            const response = await fetch(`${env.API_URL}/interviews/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ language, code }),
                signal: controller.signal,
            });

            const data = await response.json();
            if (data.success) {
                setOutput(data.data?.output ?? 'Execution completed with no output.');
                toast.success('Code executed successfully');
            } else {
                setOutput(`Error: ${data.message}`);
                toast.error(data.message || 'Execution failed');
            }
        } catch (err) {
            if ((err as Error)?.name === 'AbortError') {
                setOutput('Execution cancelled.');
                toast.warning('Code execution cancelled');
            } else {
                console.error('Execution Error:', err);
                setOutput('Failed to connect to execution server.');
                toast.error('Network error during execution');
            }
        } finally {
            clearTimeout(timeoutId);
            if (codeAbortRef.current === controller) {
                codeAbortRef.current = null;
            }
        }
    };

    useEffect(() => {
        const handleGesture = () => {
            const win = window as unknown as CustomWindow;
            if (win._sharedAudioContext && win._sharedAudioContext.state === 'suspended') {
                win._sharedAudioContext.resume();
            }
            streamingPlayerRef.current?.resume();
        };
        window.addEventListener('click', handleGesture);
        window.addEventListener('touchstart', handleGesture, { passive: true });
        return () => {
            window.removeEventListener('click', handleGesture);
            window.removeEventListener('touchstart', handleGesture);
        };
    }, []);

    return {
        micOn,
        videoOn,
        setVideoOn,
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
    };
}
