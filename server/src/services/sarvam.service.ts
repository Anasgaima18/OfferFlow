import axios from 'axios';
import FormData from 'form-data';
import WebSocket from 'ws';
import { AppError } from '../utils/appError';
import { Logger } from '../utils/logger';

/** Helper to extract an error message from an unknown caught value */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/** Helper to extract Axios response body from an unknown error */
function getAxiosErrorDetail(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return String(error.response?.data ?? error.message);
  }
  return getErrorMessage(error);
}

/** Shape of transcript/event data emitted from Sarvam STT */
export interface SarvamSTTData {
  transcript?: string;
  _event?: boolean;
  signal_type?: string;
  [key: string]: unknown;
}

export class SarvamService {
  private apiKey: string;
  private baseUrl = 'https://api.sarvam.ai';

  constructor() {
    this.apiKey = process.env.SARVAM_API_KEY || '';
    if (!this.apiKey) {
      Logger.warn('[SarvamService]: No API Key provided. Voice features will be mocked.');
    }
  }

  private getHeaders(isMultipart = false) {
    const headers: Record<string, string> = {
      'api-subscription-key': this.apiKey,
    };
    if (!isMultipart) {
      headers['Content-Type'] = 'application/json';
    }
    return headers;
  }

  /**
   * Text to Speech
   * Model: bulbul:v2
   */
  async generateSpeech(text: string, options: { speaker?: string; pace?: number; pitch?: number } = {}): Promise<Buffer> {
    if (!this.apiKey) throw new Error('Mock: Missing API Key');

    try {
      const response = await axios.post(
        `${this.baseUrl}/text-to-speech`,
        {
          inputs: [text],
          target_language_code: 'en-IN',
          speaker: options.speaker || 'meera',
          pitch: options.pitch || 0,
          pace: options.pace || 1.0,
          loudness: 1.5,
          speech_sample_rate: 16000,
          enable_preprocessing: true,
          model: 'bulbul:v2'
        },
        {
          headers: this.getHeaders(),
          responseType: 'arraybuffer',
          timeout: 15000
        }
      );
      return response.data;
    } catch (error: unknown) {
      Logger.error(`Sarvam TTS Error: ${getAxiosErrorDetail(error)}`);
      throw new AppError('Failed to generate speech with Sarvam AI', 500);
    }
  }

  /**
   * Chat Completion (AI Interviewer Logic)
   * Model: sarvam-m
   */
  async generateResponse(messages: { role: string; content: string }[]): Promise<string> {
    if (!this.apiKey) return "Mock Response: I think you made a good point there.";

    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/chat/completions`,
        {
          model: "sarvam-m",
          messages: messages,
          temperature: 0.7,
          max_tokens: 500
        },
        {
          headers: this.getHeaders(),
          timeout: 30000
        }
      );

      return response.data.choices[0].message.content;
    } catch (error: unknown) {
      Logger.error(`Sarvam Chat Error: ${getAxiosErrorDetail(error)}`);
      throw new AppError('Failed to generate AI response', 500);
    }
  }

  /**
   * Start Real-time Speech to Text Stream (WebSocket)
   * Connects to Sarvam AI and returns the WebSocket instance.
   * Documentation: https://docs.sarvam.ai/api-reference-docs/speech-to-text/transcribe/ws
   */
  startStreamingSTT(onMessage: (data: SarvamSTTData) => void, onError: (err: Error) => void): WebSocket {
    if (!this.apiKey) {
        throw new Error('Missing API Key for Sarvam Streaming');
    }

    const initialLanguage = 'en-IN'; // Can be parameterized
    const model = 'saarika:v2.5';
    const sampleRate = 16000;

    const wsUrl = `wss://api.sarvam.ai/speech-to-text/ws?language-code=${initialLanguage}&model=${model}&sample_rate=${sampleRate}&input_audio_codec=pcm_s16le&vad_signals=true`;

    const ws = new WebSocket(wsUrl, {
      headers: {
        'Api-Subscription-Key': this.apiKey
      }
    });

    ws.on('open', () => {
      Logger.info('[Sarvam] WebSocket Connected');
    });

    ws.on('message', (data: WebSocket.Data) => {
        try {
            const parsed = JSON.parse(data.toString());

            // Transcript data: { type: 'data', data: { transcript, metrics, ... } }
            if (parsed.type === 'data' && parsed.data) {
                onMessage(parsed.data);
            }
            // VAD events: { type: 'events', data: { signal_type: 'START_SPEECH'|'END_SPEECH', ... } }
            else if (parsed.type === 'events' && parsed.data) {
                onMessage({ _event: true, ...parsed.data });
            }
            // Server error: { type: 'error', data: { error, code } }
            else if (parsed.type === 'error' && parsed.data) {
                Logger.error('[Sarvam] Server error:', parsed.data);
                onError(new Error(parsed.data.error || 'Sarvam STT error'));
            }
        } catch (e) {
            Logger.error('[Sarvam] Failed to parse message:', e);
        }
    });

    ws.on('error', (error: Error) => {
      Logger.error('[Sarvam] WebSocket Error:', error);
      onError(error);
    });

    ws.on('close', (code: number, reason: Buffer) => {
        Logger.info(`[Sarvam] WebSocket Closed: ${code} - ${reason.toString()}`);
    });

    return ws;
  }

  /**
   * Send Audio Chunk to Sarvam WebSocket
   * Wraps the raw buffer into the required JSON format.
   */
  sendAudio(ws: WebSocket, audioBuffer: Buffer) {
      if (ws.readyState === WebSocket.OPEN) {
          const message = {
              audio: {
                  data: audioBuffer.toString('base64'),
                  sample_rate: 16000,
                  encoding: 'audio/wav'
              }
          };
          ws.send(JSON.stringify(message));
      }
  }
}

export const sarvamService = new SarvamService();
