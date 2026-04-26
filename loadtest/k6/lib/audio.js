// Generates synthetic 16kHz PCM Int16 audio chunks matching what
// client/public/pcm-processor.js posts.
// Server expects raw binary frames over WS — see interviewSession.handleAudioChunk.

const SAMPLE_RATE = 16000;

// AudioWorklet on the client posts ~128-sample chunks (2.66KHz tick).
// We simulate ~100ms chunks (1600 samples) for realism with batching.
const SAMPLES_PER_CHUNK = 1600;

// Generate a sine-wave-ish PCM Int16 buffer (deterministic + small)
export function genPcmChunk(seed) {
  const buf = new ArrayBuffer(SAMPLES_PER_CHUNK * 2);
  const view = new DataView(buf);
  for (let i = 0; i < SAMPLES_PER_CHUNK; i++) {
    // deterministic pseudo-noise so server VAD sees real-ish content
    const v = Math.floor(
      8000 * Math.sin((i + seed) * 0.05) + 4000 * Math.sin((i + seed) * 0.02),
    );
    view.setInt16(i * 2, v, true); // little-endian, matches Int16Array buffer
  }
  return buf;
}

// Returns total bytes/sec we'll push at 1 chunk per 100ms.
export const AUDIO_BYTES_PER_SEC = SAMPLES_PER_CHUNK * 2 * 10;

/**
 * Approximate decoded byte length of a base64 string.
 * The new server emits per-chunk `audio_chunk` frames where `audio` is the
 * base64 of one MP3 packet. We use this to:
 *   - size `ws_audio_bytes_in` accurately
 *   - cheaply assert the total at end-of-stream against the final marker.
 */
export function approxBase64Bytes(b64) {
  if (!b64) return 0;
  // base64: 4 chars → 3 bytes; minus padding.
  const len = b64.length;
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.floor((len * 3) / 4) - padding;
}

export { SAMPLES_PER_CHUNK, SAMPLE_RATE };
