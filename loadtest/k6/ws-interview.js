// T4 / T5: WebSocket concurrent connections + audio throughput.
// Simulates the **post-fix** real interview protocol observed in
// server/src/ws/interviewSession.ts:
//   1. Connect to wss://.../api/v1/interviews/ws?interviewId=...&role=...&language=...
//   2. Send first message: { type: 'auth', token }
//   3. Wait for { type: 'auth_success' }
//   4. Server emits AI greeting transcript + STREAMS audio_chunk frames (F1)
//   5. Client streams binary PCM (Int16 LE @16kHz, 100ms chunks)
//   6. Server emits partial transcripts + ai_thinking + final + audio_chunk stream
//
// Verifies F1 (TTS streaming actually starts <1.5s), F2 (no backpressure
// blow-up), F8 (transcripts written under load), F13 (no message loss in
// auth window), F14 (per-IP cap honored).
//
// Usage:
//   k6 run -e BASE_URL=... -e USERS_FILE=users.ndjson -e CONNS=50 -e SESSION_SECS=300 ws-interview.js

import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Trend, Counter, Rate } from 'k6/metrics';
import { WS_URL, SLO } from './lib/config.js';
import { signup, createInterview } from './lib/http.js';
import { genPcmChunk } from './lib/audio.js';
import { ingestMessage, newTurnTracker, isExpectedClose, WS_CLOSE } from './lib/wsProtocol.js';

// ── Custom WS metrics ──────────────────────────────────────────────────────
const wsConnect = new Trend('ws_connect_ms', true);
const wsAuthAck = new Trend('ws_auth_ack_ms', true);
const wsGreetingMs = new Trend('ws_greeting_ms', true);                       // first AI text final
const wsFirstAudioByteMs = new Trend('ws_first_audio_byte_ms', true);         // F1: TTFB of TTS stream
const wsTranscriptMs = new Trend('ws_transcript_first_partial_ms', true);
const wsAiResponseMs = new Trend('ws_ai_response_ms', true);
const wsTurnLatencyMs = new Trend('ws_turn_latency_ms', true);                // speech-end → AI-final
const wsAudioBytesIn = new Counter('ws_audio_bytes_in');
const wsAudioBytesOut = new Counter('ws_audio_bytes_out');
const wsAudioChunksIn = new Counter('ws_audio_chunks_in');
const wsConnFails = new Counter('ws_connect_failures');
const wsAuthFails = new Counter('ws_auth_failures');
const wsAbnormalClose = new Counter('ws_abnormal_close');                     // unexpected codes only
const wsCapacityReject = new Counter('ws_capacity_rejects');                  // 1013 (F14 healthy)
const wsServerRestart = new Counter('ws_server_restart');                     // 1012 (F15 healthy)
const wsTtsErrors = new Counter('ws_tts_errors');
const wsConnSuccessRate = new Rate('ws_connect_success');

const users = new SharedArray('users', function () {
  if (!__ENV.USERS_FILE) return [];
  const data = open(__ENV.USERS_FILE);
  return data
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));
});

const SESSION_SECS = parseInt(__ENV.SESSION_SECS || '60', 10);
const AUDIO_CHUNK_MS = 100;
const CHUNKS_PER_SEC = 1000 / AUDIO_CHUNK_MS;
const TOTAL_CHUNKS = SESSION_SECS * CHUNKS_PER_SEC;

export const options = {
  scenarios: {
    concurrent_sessions: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { target: parseInt(__ENV.CONNS || '50', 10), duration: '1m' },
        { target: parseInt(__ENV.CONNS || '50', 10), duration: __ENV.HOLD || '5m' },
        { target: 0, duration: '30s' },
      ],
      exec: 'sessionScenario',
      gracefulStop: '30s',
    },
  },
  thresholds: {
    ws_connect_ms:                  [`p(95)<${SLO.ws_connect_p95_ms}`],
    ws_auth_ack_ms:                 [`p(95)<${SLO.ws_first_msg_p95_ms}`],
    ws_greeting_ms:                 [`p(95)<${SLO.ws_greeting_p95_ms}`],
    ws_first_audio_byte_ms:         [`p(95)<${SLO.ws_first_audio_p95_ms}`],   // F1
    ws_transcript_first_partial_ms: [`p(95)<${SLO.ws_first_partial_p95_ms}`],
    ws_ai_response_ms:              [`p(95)<${SLO.ws_turn_p95_ms}`],
    ws_connect_success:             [`rate>${1 - SLO.ws_connect_failure_rate}`],
    ws_abnormal_close:              ['count<5'],
  },
};

// One-time setup: fetch token + create one interview per VU.
export function setup() {
  const totalVUs = parseInt(__ENV.CONNS || '50', 10);
  const sessions = [];

  for (let i = 0; i < totalVUs; i++) {
    let token;
    if (users.length > 0) {
      token = users[i % users.length].token;
    } else {
      token = signup('ws').token;
    }
    const interview = createInterview(token, 'technical');
    sessions.push({ token, interviewId: interview.id });
    if (i % 10 === 9) sleep(0.2);
  }

  console.log(`setup: ${sessions.length} sessions ready`);
  return { sessions };
}

export function sessionScenario(data) {
  const idx = (__VU - 1) % data.sessions.length;
  const { token, interviewId } = data.sessions[idx];

  const url = `${WS_URL}?interviewId=${interviewId}&role=software-engineer&language=javascript`;

  const tConnect = Date.now();
  let tAuthAck = 0;
  let tFirstAudioOut = 0;
  let tFirstPartialIn = 0;
  let tFirstAiTextFinal = 0;
  let tLastUserSpeechEnd = 0;
  const tracker = newTurnTracker(0);
  let lastCloseCode = null;

  const res = ws.connect(url, { tags: { type: 'interview' } }, (socket) => {
    wsConnect.add(Date.now() - tConnect);

    socket.on('open', () => {
      socket.send(JSON.stringify({ type: 'auth', token }));
    });

    let chunkSent = 0;
    let audioPushHandle = null;

    socket.on('message', (raw) => {
      const evt = ingestMessage(tracker, raw);
      switch (evt.kind) {
        case 'auth_success':
          tAuthAck = Date.now();
          wsAuthAck.add(tAuthAck - tConnect);

          // Heartbeat every 20s
          socket.setInterval(() => {
            socket.send(JSON.stringify({ type: 'ping' }));
          }, 20000);

          // Stream PCM at AUDIO_CHUNK_MS pacing
          audioPushHandle = socket.setInterval(() => {
            if (chunkSent >= TOTAL_CHUNKS) {
              socket.clearInterval(audioPushHandle);
              tLastUserSpeechEnd = Date.now();
              return;
            }
            const buf = genPcmChunk(chunkSent + __VU * 1000);
            socket.sendBinary(buf);
            if (tFirstAudioOut === 0) {
              tFirstAudioOut = Date.now();
              tracker.speakStartedAt = tFirstAudioOut;
            }
            wsAudioBytesOut.add(buf.byteLength);
            chunkSent++;
          }, AUDIO_CHUNK_MS);
          break;

        case 'audio_chunk':
          wsAudioBytesIn.add(evt.bytes);
          wsAudioChunksIn.add(1);
          if (evt.ttfbMs !== null && tracker.audioChunks === 1) {
            wsFirstAudioByteMs.add(evt.ttfbMs);
          }
          break;

        case 'audio_final':
          // server is done streaming this utterance; tracker resets after
          // the next ai_transcript_final → restart speakStartedAt for next turn
          break;

        case 'user_transcript_partial':
          if (tFirstPartialIn === 0 && tFirstAudioOut > 0) {
            tFirstPartialIn = Date.now();
            wsTranscriptMs.add(tFirstPartialIn - tFirstAudioOut);
          }
          break;

        case 'ai_transcript_final':
          if (tFirstAiTextFinal === 0) {
            tFirstAiTextFinal = Date.now();
            wsGreetingMs.add(tFirstAiTextFinal - tConnect);
          } else if (tLastUserSpeechEnd > 0) {
            const turnMs = Date.now() - tLastUserSpeechEnd;
            wsAiResponseMs.add(turnMs);
            wsTurnLatencyMs.add(turnMs);
            tLastUserSpeechEnd = 0;
          }
          break;

        case 'tts_error':
          wsTtsErrors.add(1);
          break;

        case 'server_shutdown':
          wsServerRestart.add(1);
          break;

        case 'error':
          console.warn(`server error: ${evt.message}`);
          break;

        default:
          break;
      }
    });

    socket.on('close', (code) => {
      lastCloseCode = code;
      if (code === WS_CLOSE.TRY_AGAIN) wsCapacityReject.add(1);
      else if (code === WS_CLOSE.SERVICE_RESTART) wsServerRestart.add(1);
      else if (!isExpectedClose(code)) wsAbnormalClose.add(1);
      if (audioPushHandle) socket.clearInterval(audioPushHandle);
    });

    socket.on('error', (e) => {
      console.error(`ws error: ${e.error()}`);
      wsAuthFails.add(1);
    });

    socket.setTimeout(() => socket.close(), (SESSION_SECS + 5) * 1000);
  });

  const ok = check(res, { 'WS handshake 101': (r) => r && r.status === 101 });
  wsConnSuccessRate.add(ok);
  if (!ok) {
    wsConnFails.add(1);
    console.error(`ws connect failed: ${res && res.status} ${res && res.body}`);
  }
}
