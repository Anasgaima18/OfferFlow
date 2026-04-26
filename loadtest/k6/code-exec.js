// T10: F12 — code-execution endpoint hardening verification.
//
// /api/v1/interviews/execute proxies the public Piston endpoint. The fix:
//   - opossum circuit breaker around Piston (8s timeout, fast-fail on N
//     consecutive failures, 30s reset)
//   - per-user rate limiter (codeExecLimiter, 20 req / 15 min)
//   - source size cap
//   - request abort via AbortController on client disconnect
//
// This script:
//   1. runs valid code at moderate RPS — measures p95 latency under healthy upstream
//   2. ramps to a burst that exceeds the limiter — expects 429
//   3. runs an oversized payload — expects 413/400
//   4. (optional) runs while a synthetic Piston outage is induced — expects 503
//      with the breaker fast-failing in <100ms (no Express worker tied up for 8s)
//
// Usage:
//   k6 run -e BASE_URL=... -e USERS_FILE=users.ndjson code-exec.js

import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Trend, Counter, Rate } from 'k6/metrics';
import { signup, runCode } from './lib/http.js';

const tExec = new Trend('lat_code_exec', true);
const tFastFail = new Trend('lat_code_exec_fastfail', true);
const limit429 = new Counter('code_exec_429');
const limit503 = new Counter('code_exec_503');
const oversize413 = new Counter('code_exec_413');
const successRate = new Rate('code_exec_success');

const users = new SharedArray('users', function () {
  if (!__ENV.USERS_FILE) return [];
  return open(__ENV.USERS_FILE).split('\n').filter(Boolean).map((l) => JSON.parse(l));
});

const BIG_CODE = (() => {
  // 200 KB source — should trip MAX_SOURCE_BYTES on the server.
  let s = '';
  while (s.length < 200_000) s += 'console.log("' + 'x'.repeat(80) + '");\n';
  return s;
})();

export const options = {
  scenarios: {
    healthy: {
      executor: 'constant-arrival-rate',
      rate: 4, timeUnit: '1s', duration: '1m',
      preAllocatedVUs: 5, maxVUs: 30,
      exec: 'healthyScenario',
    },
    burst: {
      executor: 'shared-iterations',
      vus: 5, iterations: 30, maxDuration: '1m',
      exec: 'burstScenario',
      startTime: '1m10s',
    },
    oversize: {
      executor: 'shared-iterations',
      vus: 2, iterations: 4, maxDuration: '30s',
      exec: 'oversizeScenario',
      startTime: '2m20s',
    },
  },
  thresholds: {
    // Healthy path: most calls finish under 5s on Piston.
    lat_code_exec: ['p(95)<5000'],
    // Limiter must fire on burst.
    code_exec_429: ['count>=10'],
    // Oversized payloads must be rejected (any status >= 400 except 429).
    code_exec_success: ['rate>0.6'],   // most non-burst calls succeed
  },
};

function pickToken(prefix) {
  if (users.length > 0) return users[__VU % users.length].token;
  return signup(prefix).token;
}

const SAMPLE_CODE = `
const sum = (arr) => arr.reduce((a, b) => a + b, 0);
console.log(sum([1, 2, 3, 4, 5]));
`;

export function healthyScenario() {
  const token = pickToken('exec');
  const r = runCode(token, 'javascript', SAMPLE_CODE);
  tExec.add(r.timings.duration);
  if (r.status === 429) limit429.add(1);
  else if (r.status === 503) {
    limit503.add(1);
    tFastFail.add(r.timings.duration);
  } else successRate.add(r.status === 200);
}

export function burstScenario() {
  const token = pickToken('exec');
  const r = runCode(token, 'javascript', SAMPLE_CODE);
  if (r.status === 429) limit429.add(1);
  else if (r.status === 503) limit503.add(1);
  else successRate.add(r.status === 200);
}

export function oversizeScenario() {
  const token = pickToken('exec');
  const r = runCode(token, 'javascript', BIG_CODE);
  if (r.status === 413 || r.status === 400) oversize413.add(1);
  check(r, { 'oversized rejected': (x) => x.status >= 400 && x.status < 500 });
  sleep(1);
}
