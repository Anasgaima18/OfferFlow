// T3: Auth bcrypt stress (post-fix verification of F10).
//
// After fix:
//   - bcrypt cost is env-tunable (BCRYPT_COST, default 10) → ~70-100ms CPU
//     on Render starter (1 vCPU / 0.5 vCPU).
//   - signup p95 should land < 800ms wall clock.
//
// Auth limiter is 10/15min/IP, so this MUST be run with WS_PER_IP_LIMIT-style
// relaxation OR from many distinct IPs OR against a build with the limiter
// relaxed (recommended for the test). Set TRUSTED_IPS env to whitelist.
//
// Run: k6 run -e BASE_URL=... auth-stress.js

import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import { SLO } from './lib/config.js';
import { signup, postJson } from './lib/http.js';

const trendSignup = new Trend('lat_signup', true);
const trendLogin = new Trend('lat_login', true);

export const options = {
  scenarios: {
    signup_storm: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { target: 5,  duration: '1m' },
        { target: 10, duration: '2m' },
        { target: 20, duration: '2m' },
        { target: 0,  duration: '30s' },
      ],
      exec: 'signupScenario',
    },
    login_storm: {
      executor: 'constant-vus',
      vus: 10,
      duration: '5m',
      exec: 'loginScenario',
      startTime: '5m',
    },
  },
  thresholds: {
    lat_signup: [`p(95)<${SLO.signup_p95_ms}`, `p(99)<${SLO.signup_p99_ms}`],
    lat_login:  [`p(95)<${SLO.login_p95_ms}`],
    http_req_failed: ['rate<0.10'],
  },
};

const SHARED = {
  email: `auth-stress-base-${Date.now()}@loadtest.local`,
  password: 'AuthStress123!',
};

export function setup() {
  const r = postJson('/auth/signup', {
    email: SHARED.email,
    name: 'AuthStress',
    username: `as_${Date.now().toString(36)}`,
    password: SHARED.password,
  });
  return { ok: r.status === 201, email: SHARED.email, password: SHARED.password };
}

export function signupScenario() {
  const start = Date.now();
  try {
    signup('authstress');
  } catch (_e) {
    // 429 expected — record latency anyway
  }
  trendSignup.add(Date.now() - start);
  sleep(1);
}

export function loginScenario(data) {
  const r = postJson('/auth/login', {
    email: data.email,
    password: data.password,
  });
  trendLogin.add(r.timings.duration);
  check(r, { 'login ok or 429': (x) => x.status === 200 || x.status === 429 });
  sleep(0.5);
}
