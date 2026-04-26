import http from 'k6/http';
import { check, fail } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { API, BASE_URL, METRICS_URL, METRICS_TOKEN } from './config.js';

export const restLatency = new Trend('rest_latency_ms', true);
export const restErrors = new Counter('rest_errors_total');

const DEFAULT_HEADERS = { 'Content-Type': 'application/json' };

export function authedHeaders(token) {
  return { ...DEFAULT_HEADERS, Authorization: `Bearer ${token}` };
}

export function postJson(path, body, params = {}) {
  const res = http.post(`${API}${path}`, JSON.stringify(body), {
    headers: { ...DEFAULT_HEADERS, ...(params.headers || {}) },
    tags: { endpoint: path, method: 'POST' },
    timeout: '60s',
  });
  restLatency.add(res.timings.duration);
  if (res.status >= 400) restErrors.add(1);
  return res;
}

export function getJson(path, token, params = {}) {
  const res = http.get(`${API}${path}`, {
    headers: authedHeaders(token),
    tags: { endpoint: path, method: 'GET' },
    timeout: '60s',
    ...params,
  });
  restLatency.add(res.timings.duration);
  if (res.status >= 400) restErrors.add(1);
  return res;
}

export function patchJson(path, body, token) {
  const res = http.patch(`${API}${path}`, JSON.stringify(body), {
    headers: authedHeaders(token),
    tags: { endpoint: path, method: 'PATCH' },
    timeout: '60s',
  });
  restLatency.add(res.timings.duration);
  if (res.status >= 400) restErrors.add(1);
  return res;
}

export function delJson(path, token) {
  const res = http.del(`${API}${path}`, null, {
    headers: authedHeaders(token),
    tags: { endpoint: path, method: 'DELETE' },
    timeout: '60s',
  });
  restLatency.add(res.timings.duration);
  if (res.status >= 400) restErrors.add(1);
  return res;
}

// Signup helper — generates a unique user.
// Returns { token, user } on success, throws on failure.
export function signup(emailPrefix) {
  const ts = Date.now();
  const rnd = Math.floor(Math.random() * 1e9);
  const email = `${emailPrefix}+${ts}-${rnd}-${__VU}@loadtest.local`;
  const username = `lt_${ts.toString(36)}_${rnd.toString(36)}`.slice(0, 30);
  const body = {
    email,
    username,
    name: `LoadTest VU${__VU}`,
    password: 'LoadTest123!',
  };
  const res = postJson('/auth/signup', body);
  if (
    !check(res, {
      'signup 201': (r) => r.status === 201,
      'signup returns token': (r) => !!r.json('data.token'),
    })
  ) {
    fail(`signup failed: ${res.status} ${res.body}`);
  }
  return { token: res.json('data.token'), user: res.json('data.user'), email };
}

// Login helper — for pre-seeded users.
export function login(email, password) {
  const res = postJson('/auth/login', { email, password });
  if (!check(res, { 'login 200': (r) => r.status === 200 })) {
    fail(`login failed: ${res.status} ${res.body}`);
  }
  return res.json('data.token');
}

export function createInterview(token, type = 'technical') {
  const res = postJson('/interviews', { type }, { headers: authedHeaders(token) });
  if (!check(res, { 'interview 201': (r) => r.status === 201 })) {
    fail(`createInterview failed: ${res.status} ${res.body}`);
  }
  return res.json('data.interview');
}

/**
 * Run code via the protected /interviews/execute endpoint.
 * Targets F12 (code-exec circuit breaker) — caller can measure latency,
 * detect 429 (rate limit) and 503 (breaker open) separately.
 */
export function runCode(token, language = 'javascript', code = 'console.log(1);') {
  const res = postJson(
    '/interviews/execute',
    { language, code },
    { headers: authedHeaders(token) },
  );
  return res;
}

/**
 * Phase 5 — scrape the server's /metrics endpoint.
 * Honors METRICS_TOKEN if set. Returns the raw exposition text.
 */
export function scrapeMetrics() {
  const headers = METRICS_TOKEN ? { Authorization: `Bearer ${METRICS_TOKEN}` } : {};
  const res = http.get(METRICS_URL, { headers, tags: { endpoint: '/metrics' } });
  return res;
}

/**
 * Quick parser for one Prometheus counter / gauge value.
 *   parseMetric(text, 'offerflow_ws_active_connections') -> number | null
 * For histograms use parseHistogramSum / parseHistogramCount.
 */
export function parseMetric(text, name, labelMatch = null) {
  if (!text) return null;
  const lines = text.split('\n');
  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;
    if (!line.startsWith(name)) continue;
    if (labelMatch && !line.includes(labelMatch)) continue;
    const parts = line.trim().split(/\s+/);
    const v = parseFloat(parts[parts.length - 1]);
    if (!Number.isNaN(v)) return v;
  }
  return null;
}

export function healthCheck() {
  const res = http.get(`${BASE_URL}/health`, { tags: { endpoint: '/health' } });
  return res;
}
