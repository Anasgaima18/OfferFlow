import { useState, useRef, useCallback } from 'react';

export const useAudioRecorder = () => {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder.current = new MediaRecorder(stream);
            audioChunks.current = [];

            mediaRecorder.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.current.push(event.data);
                }
            };

            mediaRecorder.current.onstop = () => {
                const blob = new Blob(audioChunks.current, { type: 'audio/webm' });
                setAudioBlob(blob);
            };

            mediaRecorder.current.start();
            setIsRecording(true);
        } catch (error) {
            console.error('Error accessing microphone:', error);
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (mediaRecorder.current && isRecording) {
            mediaRecorder.current.stop();
            setIsRecording(false);
            mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
        }
    }, [isRecording]);

    return {
        isRecording,
        startRecording,
        stopRecording,
        audioBlob // Safe to return state
    };
};
