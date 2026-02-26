import axios from 'axios';
import WebSocket from 'ws';
import { AppError } from '../utils/appError';
import { Logger } from '../utils/logger';

/** Helper to extract error detail from an unknown caught value (Axios-aware) */
function getAxiosErrorDetail(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return String(error.response?.data ?? error.message);
  }
  return error instanceof Error ? error.message : String(error);
}

// Types for WebSocket TTS
interface VoiceSettings {
  stability?: number;
  similarity_boost?: number;
  style?: number;
  use_speaker_boost?: boolean;
  speed?: number;
}

interface TTSMessage {
  text: string;
  voice_settings?: VoiceSettings;
  try_trigger_generation?: boolean;
  flush?: boolean;
}

interface AudioChunk {
  audio: string; // base64 encoded
  isFinal?: boolean;
  normalizedAlignment?: {
    charStartTimesMs: number[];
    charDurationsMs: number[];
    chars: string[];
  };
}

export class ElevenLabsService {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';
  private wsUrl = 'wss://api.elevenlabs.io';
  private defaultVoiceId = 'EXAVITQu4vr4xnSDxMaL'; // Sarah - natural conversational voice

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || '';
    if (!this.apiKey) {
      Logger.warn('[ElevenLabsService]: No API Key provided. TTS will fail.');
    }
  }

  /**
   * Generate Speech from Text (HTTP - for simple cases)
   */
  async generateSpeech(text: string, voiceId: string = this.defaultVoiceId): Promise<Buffer> {
    if (!this.apiKey) throw new Error('Missing ElevenLabs API Key');

    try {
      const response = await axios.post(
        `${this.baseUrl}/text-to-speech/${voiceId}`,
        {
          text: text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0,
            use_speaker_boost: true
          }
        },
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg'
          },
          responseType: 'arraybuffer',
          timeout: 15000
        }
      );

      return response.data;
    } catch (error: unknown) {
      Logger.error(`ElevenLabs TTS Error: ${getAxiosErrorDetail(error)}`);
      throw new AppError('Failed to generate speech with ElevenLabs', 500);
    }
  }

  /**
   * Create WebSocket TTS Stream
   * Docs: https://elevenlabs.io/docs/api-reference/text-to-speech/v-1-text-to-speech-voice-id-stream-input
   *
   * Protocol:
   *   1. Connect to wss://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream-input?model_id=...&output_format=...
   *   2. Send BOS (beginning of stream): { text: " ", voice_settings: {...}, generation_config: {...}, xi-api-key: "..." }
   *   3. Send text: { text: "Hello ", try_trigger_generation: true, flush: true }  — note trailing space
   *   4. Send EOS: { text: "" }
   *   5. Receive: { audio: "base64...", isFinal: false|true }
   */
  createStreamingTTS(
    voiceId: string = this.defaultVoiceId,
    onAudioChunk: (chunk: Buffer) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ): {
    sendText: (text: string, flush?: boolean) => void;
    close: () => void;
  } {
    if (!this.apiKey) {
      throw new Error('Missing ElevenLabs API Key');
    }

    // Auth via query param for reliable WS auth (header also sent as fallback)
    const wsEndpoint = `${this.wsUrl}/v1/text-to-speech/${voiceId}/stream-input?model_id=eleven_turbo_v2_5&output_format=mp3_44100_128&inactivity_timeout=30`;

    const ws = new WebSocket(wsEndpoint, {
      headers: {
        'xi-api-key': this.apiKey
      }
    });

    let isOpen = false;
    let gotAudio = false;
    let completeCalled = false;
    let pendingQueue: { text: string; flush: boolean }[] = [];

    ws.on('open', () => {
      Logger.info('[ElevenLabs WS]: Connected');
      isOpen = true;

      // BOS (beginning of stream) — initialize with voice settings and API key
      const initMessage = {
        text: ' ',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0,
          use_speaker_boost: true,
          speed: 1.0
        },
        generation_config: {
          chunk_length_schedule: [50, 100, 150, 200]
        },
        'xi-api-key': this.apiKey
      };
      ws.send(JSON.stringify(initMessage));

      // Flush any queued messages that arrived while connecting
      while (pendingQueue.length > 0) {
        const queued = pendingQueue.shift()!;
        const msg: TTSMessage = {
          text: queued.text,
          try_trigger_generation: true,
          flush: queued.flush
        };
        ws.send(JSON.stringify(msg));
      }
    });

    ws.on('message', (data: WebSocket.Data) => {
      try {
        const message: AudioChunk = JSON.parse(data.toString());

        if (message.audio) {
          const audioBuffer = Buffer.from(message.audio, 'base64');
          if (audioBuffer.length > 0) {
            gotAudio = true;
            onAudioChunk(audioBuffer);
          }
        }

        if (message.isFinal) {
          Logger.info('[ElevenLabs WS]: Generation complete');
          if (!completeCalled) { completeCalled = true; onComplete(); }
        }
      } catch (error) {
        Logger.error('[ElevenLabs WS]: Failed to parse message', error);
      }
    });

    ws.on('error', (error) => {
      Logger.error('[ElevenLabs WS]: Error', error);
      onError(error);
    });

    ws.on('close', () => {
      Logger.info('[ElevenLabs WS]: Disconnected');
      const wasOpen = isOpen;
      isOpen = false;
      // If we got audio but never received isFinal (e.g. connection dropped), still deliver
      if (wasOpen && gotAudio && !completeCalled) {
        completeCalled = true;
        onComplete();
      }
    });

    return {
      sendText: (text: string, flush: boolean = false) => {
        // Per docs, text should end with a trailing space for proper chunking
        const normalizedText = text.endsWith(' ') ? text : text + ' ';

        if (!isOpen) {
          Logger.info('[ElevenLabs WS]: Connection not ready, queuing text');
          pendingQueue.push({ text: normalizedText, flush });
          return;
        }

        const message: TTSMessage = {
          text: normalizedText,
          try_trigger_generation: true,
          flush
        };
        ws.send(JSON.stringify(message));
      },
      close: () => {
        if (isOpen) {
          // EOS — send empty string to signal end of stream
          ws.send(JSON.stringify({ text: '' }));
          ws.close();
        }
      }
    };
  }
}

export const elevenLabsService = new ElevenLabsService();
