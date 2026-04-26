// Shared config for all k6 scripts.
// Override via env: BASE_URL, WS_URL, METRICS_URL, METRICS_TOKEN, K6_TIER (low|medium|high|spike|soak)

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const WS_URL =
  __ENV.WS_URL ||
  BASE_URL.replace(/^http/, 'ws') + '/api/v1/interviews/ws';

const API = `${BASE_URL}/api/v1`;
const METRICS_URL = __ENV.METRICS_URL || `${BASE_URL}/metrics`;
const METRICS_TOKEN = __ENV.METRICS_TOKEN || '';

const TIERS = {
  low:    { vus: 10,   duration: '2m'  },
  medium: { vus: 100,  duration: '5m'  },
  high:   { vus: 500,  duration: '10m' },
  spike:  { vus: 500,  duration: '1m'  },
  soak:   { vus: 50,   duration: '30m' },
};

const TIER = TIERS[__ENV.K6_TIER || 'low'];

/**
 * SLO thresholds — calibrated for the POST-FIX server (F1–F22 applied).
 * If a run breaches one of these, that's a real regression — open a bug.
 *
 * Numbers come from:
 *   - F4 user cache: protect() should be ~1ms instead of 50-300ms → /me p95 < 100ms
 *   - F11/F19 materialized view: leaderboard p95 < 250ms (was 800-3000ms)
 *   - F10 bcrypt cost 10: signup p95 ~70-100ms CPU on Starter → < 800ms wall
 *   - F1 streaming TTS: first-audio-byte should be < 1500ms (was 3000ms+)
 *   - F16 Sarvam breaker: greeting p95 < 4000ms when external API healthy
 *
 * Override any of these via env if testing against a slower environment, e.g.
 *   k6 run -e SLO_REST_P95=800 ...
 */
const SLO = {
  // ── REST ─────────────────────────────────────────────────
  rest_p95_ms:           Number(__ENV.SLO_REST_P95          || 300),
  rest_p99_ms:           Number(__ENV.SLO_REST_P99          || 1000),
  rest_error_rate:       Number(__ENV.SLO_REST_ERR          || 0.01),
  // ── DB-heavy reads ───────────────────────────────────────
  leaderboard_p95_ms:    Number(__ENV.SLO_LB_P95            || 250),
  stats_p95_ms:          Number(__ENV.SLO_STATS_P95         || 400),
  transcript_p95_ms:     Number(__ENV.SLO_TR_P95            || 250),
  // ── Auth (CPU-bound: bcrypt) ─────────────────────────────
  signup_p95_ms:         Number(__ENV.SLO_SIGNUP_P95        || 800),
  signup_p99_ms:         Number(__ENV.SLO_SIGNUP_P99        || 1500),
  login_p95_ms:          Number(__ENV.SLO_LOGIN_P95         || 600),
  // ── WebSocket lifecycle ──────────────────────────────────
  ws_connect_p95_ms:     Number(__ENV.SLO_WS_CONN_P95       || 1500),
  ws_first_msg_p95_ms:   Number(__ENV.SLO_WS_FIRST_P95      || 3000),
  ws_connect_failure_rate: Number(__ENV.SLO_WS_FAIL_RATE    || 0.01),
  // ── WebSocket interview turn ────────────────────────────
  ws_greeting_p95_ms:    Number(__ENV.SLO_WS_GREET_P95      || 4000),
  ws_first_audio_p95_ms: Number(__ENV.SLO_WS_AUDIO1_P95     || 1500), // F1: time-to-first-byte of TTS
  ws_turn_p95_ms:        Number(__ENV.SLO_WS_TURN_P95       || 8000),
  ws_first_partial_p95_ms: Number(__ENV.SLO_WS_PARTIAL_P95  || 2500),
  // ── Soak ─────────────────────────────────────────────────
  soak_mem_growth_pct:   Number(__ENV.SLO_SOAK_MEM_PCT      || 10),
  soak_abnormal_close_max: Number(__ENV.SLO_SOAK_AB_MAX     || 5),
};

// Auth limiter is 10 req / 15 min — back off when load testing auth.
const AUTH_RPS_CAP = 0.5;

// F14 defaults — should match server WS_PER_IP_LIMIT / WS_GLOBAL_LIMIT.
// k6 from a single egress IP will hit per-IP cap fast unless WS_PER_IP_LIMIT
// is raised in the staging env to match the test's expected concurrency.
const WS_PER_IP_LIMIT = Number(__ENV.WS_PER_IP_LIMIT || 10);
const WS_GLOBAL_LIMIT = Number(__ENV.WS_GLOBAL_LIMIT || 200);

export {
  BASE_URL, WS_URL, API, METRICS_URL, METRICS_TOKEN,
  TIER, SLO, AUTH_RPS_CAP, WS_PER_IP_LIMIT, WS_GLOBAL_LIMIT,
};
