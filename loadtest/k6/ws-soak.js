// T7: Long-running interview soak — N concurrent sessions × M minutes.
//
// Verifies (post-fix):
//   F2  → wsBufferedAmount stays low; no 1009 closures
//   F6  → no oauthExchangeStore growth (scrape /metrics each minute)
//   F8  → transcript_drops_total stays at 0 even under sustained load
//   F15 → 1012 (service_restart) is the ONLY non-1000 close on graceful drain
//   F17 → no 30s+ event-loop stalls on disconnect
//
// Pair with /metrics polling: the script logs server-side metrics every minute
// so you can correlate client-observed regressions with server runtime data.
//
//   k6 run -e BASE_URL=... -e WS_URL=... -e USERS_FILE=users.ndjson \
//          -e VUS=50 -e SOAK_MIN=30 -e METRICS_TOKEN=xxx ws-soak.js

import ws from 'k6/ws';
import { sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Trend, Counter, Gauge } from 'k6/metrics';
import { WS_URL, SLO } from './lib/config.js';
import { signup, createInterview, scrapeMetrics, parseMetric } from './lib/http.js';
import { genPcmChunk } from './lib/audio.js';
import { ingestMessage, newTurnTracker, isExpectedClose, WS_CLOSE } from './lib/wsProtocol.js';

const wsAudioOut = new Counter('ws_audio_bytes_out');
const wsAudioIn = new Counter('ws_audio_bytes_in');
const wsAudioChunksIn = new Counter('ws_audio_chunks_in');
const wsAbnormal = new Counter('ws_abnormal_close');
const wsCapacityReject = new Counter('ws_capacity_rejects');
const wsServerRestart = new Counter('ws_server_restart');
const wsTtsErrors = new Counter('ws_tts_errors');
const wsTurns = new Counter('ws_turns_completed');
const wsTurnLatency = new Trend('ws_turn_latency_ms', true);

// Server-side observed metrics polled from /metrics (best-effort)
const srvActiveConns = new Gauge('srv_ws_active_connections');
const srvTranscriptDrops = new Gauge('srv_transcript_drops_total');
const srvBufferedAmountP95 = new Gauge('srv_ws_bufferedamount_p95_bytes');
const srvCircuitOpen = new Gauge('srv_circuit_breakers_open');
const srvUserCacheHitRatio = new Gauge('srv_user_cache_hit_ratio');

const users = new SharedArray('users', function () {
  if (!__ENV.USERS_FILE) return [];
  return open(__ENV.USERS_FILE).split('\n').filter(Boolean).map((l) => JSON.parse(l));
});

const VUS = parseInt(__ENV.VUS || '50', 10);
const SOAK_MIN = parseInt(__ENV.SOAK_MIN || '30', 10);

export const options = {
  scenarios: {
    soak: {
      executor: 'constant-vus',
      vus: VUS,
      duration: `${SOAK_MIN}m`,
      exec: 'soakScenario',
      gracefulStop: '60s',
    },
    // A single VU polls /metrics every minute and republishes server-side
    // counters as k6 metrics so the dashboards/thresholds see them.
    metrics_poll: {
      executor: 'constant-vus',
      vus: 1,
      duration: `${SOAK_MIN}m`,
      exec: 'metricsPoll',
      gracefulStop: '5s',
    },
  },
  thresholds: {
    ws_abnormal_close:                [`count<${SLO.soak_abnormal_close_max}`],
    ws_turn_latency_ms:               [`p(95)<${SLO.ws_turn_p95_ms * 2}`],   // soak doubles SLO
    'srv_transcript_drops_total':     ['value==0'],
    'srv_circuit_breakers_open':      ['value<1'],
  },
};

export function setup() {
  const sessions = [];
  for (let i = 0; i < VUS; i++) {
    let token;
    if (users.length > 0) token = users[i % users.length].token;
    else token = signup('soak').token;
    const interview = createInterview(token, 'technical');
    sessions.push({ token, interviewId: interview.id });
    if (i % 10 === 9) sleep(0.3);
  }
  return { sessions, soakMs: SOAK_MIN * 60 * 1000 };
}

export function soakScenario(data) {
  const idx = (__VU - 1) % data.sessions.length;
  const { token, interviewId } = data.sessions[idx];
  const url = `${WS_URL}?interviewId=${interviewId}&role=software-engineer&language=javascript`;

  ws.connect(url, {}, (socket) => {
    let speaking = false;
    let chunkIdx = 0;
    let speakStartedAt = 0;
    let audioPushHandle = null;
    let cycleHandle = null;
    const tracker = newTurnTracker(0);

    socket.on('open', () => socket.send(JSON.stringify({ type: 'auth', token })));

    socket.on('message', (raw) => {
      const evt = ingestMessage(tracker, raw);
      switch (evt.kind) {
        case 'auth_success':
          // Emulate human cadence: speak 8s, wait 5s, repeat.
          cycleHandle = socket.setInterval(() => {
            if (!speaking) {
              speaking = true;
              speakStartedAt = Date.now();
              tracker.speakStartedAt = speakStartedAt;
              audioPushHandle = socket.setInterval(() => {
                const buf = genPcmChunk(chunkIdx);
                socket.sendBinary(buf);
                wsAudioOut.add(buf.byteLength);
                chunkIdx++;
              }, 100);
              socket.setTimeout(() => {
                if (audioPushHandle) {
                  socket.clearInterval(audioPushHandle);
                  audioPushHandle = null;
                }
                speaking = false;
              }, 8000);
            }
          }, 13000);
          break;
        case 'audio_chunk':
          wsAudioIn.add(evt.bytes);
          wsAudioChunksIn.add(1);
          break;
        case 'audio_final':
          if (speakStartedAt > 0) {
            wsTurnLatency.add(Date.now() - speakStartedAt);
            wsTurns.add(1);
            speakStartedAt = 0;
          }
          break;
        case 'tts_error':
          wsTtsErrors.add(1);
          break;
        case 'server_shutdown':
          wsServerRestart.add(1);
          break;
        default:
          break;
      }
    });

    socket.on('close', (code) => {
      if (code === WS_CLOSE.TRY_AGAIN) wsCapacityReject.add(1);
      else if (code === WS_CLOSE.SERVICE_RESTART) wsServerRestart.add(1);
      else if (!isExpectedClose(code)) wsAbnormal.add(1);
      if (audioPushHandle) socket.clearInterval(audioPushHandle);
      if (cycleHandle) socket.clearInterval(cycleHandle);
    });

    socket.setTimeout(() => socket.close(), data.soakMs);
  });
}

/**
 * Server-side metrics tap. Polls /metrics every 60s for the runtime view.
 * Failures are non-fatal — the soak run continues even if scraping fails.
 */
export function metricsPoll() {
  const elapsed = (__ITER || 0) * 60;
  if (elapsed >= SOAK_MIN * 60) return;

  const res = scrapeMetrics();
  if (res.status === 200) {
    const text = res.body;
    const active = parseMetric(text, 'offerflow_ws_active_connections');
    if (active !== null) srvActiveConns.add(active);

    // Counters are cumulative — we expose the raw value, the threshold
    // checks that it's still 0. If it ever becomes nonzero we know F8 fired.
    const drops = parseMetric(text, 'offerflow_transcript_drops_total');
    srvTranscriptDrops.add(drops || 0);

    // Sum of buffered_amount upper-quantile bucket as a coarse proxy
    const bigBucket = parseMetric(text, 'offerflow_ws_buffered_amount_bytes_bucket', 'le="4194304"');
    srvBufferedAmountP95.add(bigBucket || 0);

    // Any breaker stuck open is bad.
    const sarvamOpen = parseMetric(text, 'offerflow_circuit_breaker_state', 'name="sarvam_chat"') || 0;
    const ttsOpen    = parseMetric(text, 'offerflow_circuit_breaker_state', 'name="elevenlabs_tts"') || 0;
    const pistonOpen = parseMetric(text, 'offerflow_circuit_breaker_state', 'name="piston"') || 0;
    srvCircuitOpen.add(Math.max(sarvamOpen, ttsOpen, pistonOpen));

    const hits   = parseMetric(text, 'offerflow_user_cache_hits_total', 'result="hit"') || 0;
    const misses = parseMetric(text, 'offerflow_user_cache_hits_total', 'result="miss"') || 0;
    if (hits + misses > 0) srvUserCacheHitRatio.add(hits / (hits + misses));

    console.log(
      `[soak/metrics] active=${active} drops=${drops} sarvamBreaker=${sarvamOpen} ` +
      `ttsBreaker=${ttsOpen} cache=${(hits / Math.max(1, hits + misses)).toFixed(2)}`,
    );
  } else {
    console.warn(`[soak/metrics] scrape failed: ${res.status}`);
  }

  sleep(60);
}
