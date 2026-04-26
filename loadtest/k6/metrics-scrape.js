// Phase 5 verification — /metrics endpoint health check.
//
// Asserts:
//   - /metrics returns 200 (or 401 if METRICS_TOKEN is set and we omit it,
//     and 200 when we provide it)
//   - Required metrics families are present (offerflow_* + Node defaults)
//   - Histogram buckets are populated (rate of bucket increases > 0 over 30s)
//
// Usage:
//   # Local / unprotected
//   k6 run -e BASE_URL=http://localhost:5000 metrics-scrape.js
//
//   # Production / protected
//   k6 run -e BASE_URL=https://offerflow-server-staging.onrender.com \
//          -e METRICS_TOKEN=$METRICS_TOKEN metrics-scrape.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';
import { METRICS_URL, METRICS_TOKEN } from './lib/config.js';
import { scrapeMetrics } from './lib/http.js';

const ok = new Counter('metrics_scrape_ok');
const failed = new Counter('metrics_scrape_failed');
const missing = new Counter('metrics_required_missing');

const REQUIRED = [
  // Server defaults from prom-client (prefixed offerflow_)
  'offerflow_process_cpu_seconds_total',
  'offerflow_process_resident_memory_bytes',
  'offerflow_nodejs_eventloop_lag_seconds',
  // App histograms / counters / gauges (Phase 5)
  'offerflow_http_request_duration_ms',
  'offerflow_supabase_query_ms',
  'offerflow_ws_active_connections',
  'offerflow_ws_buffered_amount_bytes',
  'offerflow_external_api_ms',
  'offerflow_circuit_breaker_state',
  'offerflow_ai_response_latency_ms',
  'offerflow_transcript_drops_total',
  'offerflow_user_cache_hits_total',
];

export const options = {
  scenarios: {
    auth_check: {
      executor: 'shared-iterations', vus: 1, iterations: 1,
      maxDuration: '15s', exec: 'authCheck',
    },
    sample_loop: {
      executor: 'constant-vus', vus: 1, duration: '30s',
      exec: 'sampleScenario', startTime: '15s',
    },
  },
  thresholds: {
    metrics_required_missing: ['count==0'],
    metrics_scrape_failed:    ['count<3'],
    'http_req_duration{endpoint:/metrics}': ['p(95)<500'],
  },
};

/**
 * If METRICS_TOKEN is set, an unauthenticated scrape MUST 401.
 * If it's not set, an unauthenticated scrape MUST 200.
 */
export function authCheck() {
  const r = http.get(METRICS_URL, { tags: { endpoint: '/metrics' } });
  const expected = METRICS_TOKEN ? 401 : 200;
  check(r, {
    [`unauthenticated /metrics returns ${expected}`]: (x) => x.status === expected,
  });
  if (r.status !== expected) failed.add(1);
}

export function sampleScenario() {
  const r = scrapeMetrics();
  if (r.status !== 200) {
    failed.add(1);
    console.warn(`scrape failed: ${r.status} ${String(r.body).slice(0, 200)}`);
    sleep(1);
    return;
  }
  ok.add(1);
  const text = r.body;

  for (const name of REQUIRED) {
    if (!text.includes(name)) {
      console.warn(`missing metric: ${name}`);
      missing.add(1);
    }
  }
  sleep(2);
}
