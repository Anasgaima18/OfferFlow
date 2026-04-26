// Shared helpers for the post-fix WS interview protocol.
// Server now emits:
//   - { type: 'auth_success' }
//   - { type: 'audio_chunk', audio: <b64>, isFinal: false }   ← per chunk (F1)
//   - { type: 'audio_chunk', audio: '', isFinal: true, chunks, bytes } ← end marker
//   - { type: 'tts_error', message }                          ← TTS upstream failure
//   - { type: 'server_shutdown', reason }                     ← F15 graceful drain
//   - { transcript, isFinal, speaker }                        ← STT / AI text turns
//   - { type: 'ai_thinking' | 'ai_done' }
//   - { type: 'pong' }
//   - { type: 'error', message }                              ← protocol errors
//
// Close codes worth distinguishing:
//   1000 / 1005 → normal close
//   1011        → server crash / unhandled error
//   1012        → service restart (F15 graceful drain)   ← EXPECTED on deploy
//   1013        → try again later (F14 capacity reject)  ← EXPECTED on overload
//   4001        → unauthorized (auth failure / timeout)
//   4003        → forbidden (cross-user)
//   4004        → not found (interviewId)

import { approxBase64Bytes } from './audio.js';

export const WS_CLOSE = {
  NORMAL: 1000,
  NO_STATUS: 1005,
  ABNORMAL: 1006,
  SERVER_ERROR: 1011,
  SERVICE_RESTART: 1012,
  TRY_AGAIN: 1013,
  UNAUTHORIZED: 4001,
  FORBIDDEN: 4003,
  NOT_FOUND: 4004,
};

/**
 * Returns true when a close code is "expected, healthy" — used to tell apart
 * a real bug from F14/F15 designed-in behaviour.
 */
export function isExpectedClose(code) {
  return code === WS_CLOSE.NORMAL ||
         code === WS_CLOSE.NO_STATUS ||
         code === WS_CLOSE.SERVICE_RESTART ||
         code === WS_CLOSE.TRY_AGAIN;
}

/**
 * Track the streaming-audio pipeline for a single AI turn.
 * Use as:
 *   const t = newTurnTracker(socketSendStartedAt);
 *   socket.on('message', raw => onMessage(t, raw, metrics));
 *
 * On `isFinal: true` the tracker resets, so the same instance can be reused
 * across an interview's turns.
 */
export function newTurnTracker(speakStartedAt = 0) {
  return {
    speakStartedAt,
    firstAudioChunkAt: 0,
    audioBytesIn: 0,
    audioChunks: 0,
    finalSeen: false,
    transcriptSeen: false,
    finalChunks: null,
    finalBytes: null,
  };
}

export function resetTurnTracker(t, speakStartedAt = 0) {
  t.speakStartedAt = speakStartedAt;
  t.firstAudioChunkAt = 0;
  t.audioBytesIn = 0;
  t.audioChunks = 0;
  t.finalSeen = false;
  t.transcriptSeen = false;
  t.finalChunks = null;
  t.finalBytes = null;
}

/**
 * Process an incoming WS text frame. Returns metadata you may want to
 * apply to k6 metrics from the caller.
 */
export function ingestMessage(tracker, raw, opts = {}) {
  let parsed;
  try { parsed = JSON.parse(raw); } catch { return { kind: 'binary' }; }

  // Streaming audio chunks (F1)
  if (parsed.type === 'audio_chunk') {
    if (parsed.isFinal) {
      tracker.finalSeen = true;
      tracker.finalChunks = parsed.chunks ?? tracker.audioChunks;
      tracker.finalBytes  = parsed.bytes  ?? tracker.audioBytesIn;
      return { kind: 'audio_final', chunks: tracker.finalChunks, bytes: tracker.finalBytes };
    }
    if (tracker.firstAudioChunkAt === 0) {
      tracker.firstAudioChunkAt = Date.now();
    }
    const bytes = approxBase64Bytes(parsed.audio);
    tracker.audioBytesIn += bytes;
    tracker.audioChunks += 1;
    return {
      kind: 'audio_chunk',
      bytes,
      ttfbMs: tracker.speakStartedAt > 0
        ? tracker.firstAudioChunkAt - tracker.speakStartedAt
        : null,
    };
  }

  if (parsed.type === 'tts_error') {
    return { kind: 'tts_error', message: parsed.message };
  }

  if (parsed.type === 'server_shutdown') {
    return { kind: 'server_shutdown', reason: parsed.reason };
  }

  if (parsed.type === 'auth_success') return { kind: 'auth_success' };
  if (parsed.type === 'pong') return { kind: 'pong' };
  if (parsed.type === 'ai_thinking') return { kind: 'ai_thinking' };
  if (parsed.type === 'ai_done') return { kind: 'ai_done' };
  if (parsed.type === 'error') return { kind: 'error', message: parsed.message };

  // Transcript frames (STT partial / final, AI final).
  if (parsed.transcript !== undefined) {
    if (parsed.speaker === 'ai' && parsed.isFinal) {
      return { kind: 'ai_transcript_final', text: parsed.transcript };
    }
    if (parsed.speaker === 'user') {
      return { kind: parsed.isFinal ? 'user_transcript_final' : 'user_transcript_partial', text: parsed.transcript };
    }
    return { kind: 'transcript', text: parsed.transcript, isFinal: !!parsed.isFinal, speaker: parsed.speaker };
  }

  // Legacy single-frame audio (kept for backwards-compat with old server builds)
  if (parsed.audio) {
    return { kind: 'legacy_audio', bytes: approxBase64Bytes(parsed.audio) };
  }

  return { kind: 'unknown', parsed };
}

export const __unused = approxBase64Bytes;
