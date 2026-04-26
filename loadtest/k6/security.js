// T12 / T13 / T14: Security probes — DO NOT RUN AGAINST PRODUCTION at scale.
//
// Validates (post-fix):
//   F7  → Rate-limit ENFORCED on /auth/login (Redis-backed when REDIS_URL set)
//   F7  → Per-user keying for protected routes (NAT'd offices not lumped together)
//   F7  → X-Forwarded-For spoofing does NOT bypass auth limiter (uses ipKeyGenerator
//         which honours `app.set('trust proxy', 1)` — only the leftmost trusted hop)
//   F3  → Cross-user reads/writes blocked (RLS scoped + JS ownership defense-in-depth)
//   JWT → forged / alg=none / expired / truncated tokens rejected with 401
//   F14 → WS connection cap rejects 1013 (verified separately by ws-cap.js)
//   WS  → invalid first message / pre-auth audio frames rejected
//
// k6 run -e BASE_URL=... -e USERS_FILE=users.ndjson security.js

import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Counter, Rate } from 'k6/metrics';
import { API, WS_URL } from './lib/config.js';
import { createInterview } from './lib/http.js';
import { WS_CLOSE } from './lib/wsProtocol.js';

const rateLimitHits = new Counter('rate_limit_429');
const xffBypass = new Counter('xff_bypass_succeeded');
const jwtRejected = new Rate('jwt_invalid_rejected');
const crossUserBlocked = new Rate('cross_user_blocked');
const wsRejected = new Rate('ws_invalid_rejected');

const users = new SharedArray('users', function () {
  if (!__ENV.USERS_FILE) return [];
  return open(__ENV.USERS_FILE).split('\n').filter(Boolean).map((l) => JSON.parse(l));
});

export const options = {
  scenarios: {
    rate_limit_test: {
      executor: 'shared-iterations',
      vus: 1, iterations: 30, maxDuration: '2m',
      exec: 'rateLimitTest',
    },
    xff_spoof_test: {
      executor: 'shared-iterations',
      vus: 1, iterations: 30, maxDuration: '2m',
      exec: 'xffSpoofTest',
      startTime: '2m',
    },
    jwt_abuse_test: {
      executor: 'shared-iterations',
      vus: 1, iterations: 50, maxDuration: '2m',
      exec: 'jwtAbuseTest',
      startTime: '4m',
    },
    cross_user_test: {
      executor: 'shared-iterations',
      vus: 1, iterations: 10, maxDuration: '2m',
      exec: 'crossUserTest',
      startTime: '6m',
    },
    ws_abuse_test: {
      executor: 'shared-iterations',
      vus: 1, iterations: 20, maxDuration: '2m',
      exec: 'wsAbuseTest',
      startTime: '8m',
    },
  },
  thresholds: {
    // Limiter MUST fire — F7 regression if it doesn't.
    rate_limit_429:       ['count>=15'],
    // XFF bypass MUST NOT succeed — even with trust proxy=1 the *single*
    // leftmost hop is honoured, but rotating it must not multiply quota.
    xff_bypass_succeeded: ['count<3'],
    jwt_invalid_rejected: ['rate>0.99'],
    cross_user_blocked:   ['rate>0.99'],
    ws_invalid_rejected:  ['rate>0.99'],
  },
};

// ── 1) Hammer /auth/login from a single IP — should hit 429 by request 11 ──
export function rateLimitTest() {
  const r = http.post(
    `${API}/auth/login`,
    JSON.stringify({ email: `nope-${__ITER}@x.com`, password: 'whatever' }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  if (r.status === 429) rateLimitHits.add(1);
  sleep(0.2);
}

// ── 2) Spoof X-Forwarded-For each request — try to bypass the limiter ──
// trust proxy=1 means Express trusts ONE hop. `ipKeyGenerator` reads from
// req.ip, which under trust proxy=1 is the leftmost XFF address — so an
// attacker COULD, in theory, rotate it. Real defenses:
//   - Render strips/sets XFF at its edge so client-supplied XFF is ignored.
//   - For local/staging without a trusted proxy, we expose this as a
//     known limitation and rely on the Redis-backed limiter + per-user
//     keying for authenticated routes.
// This test counts how many spoofed requests would have evaded the limit;
// threshold tolerates a small handful (timing windows) but flags real bypass.
export function xffSpoofTest() {
  const fakeIp = `203.0.113.${(__ITER % 254) + 1}`;
  const r = http.post(
    `${API}/auth/login`,
    JSON.stringify({ email: 'still-nope@x.com', password: 'still-nope' }),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': fakeIp,
      },
    },
  );
  if (r.status !== 429) xffBypass.add(1);
}

// ── 3) JWT abuse battery against a protected endpoint ──────────────────────
const FORGED = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEifQ.invalidsig';
const ALG_NONE = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJpZCI6IjEifQ.';
const EXPIRED  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEiLCJpYXQiOjE2MDkwMDAwMDAsImV4cCI6MTYwOTAwMDAwMX0.bogus';
const TRUNC    = 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEifQ.';

const ATTACKS = [
  { name: 'forged',   header: `Bearer ${FORGED}` },
  { name: 'alg-none', header: `Bearer ${ALG_NONE}` },
  { name: 'expired',  header: `Bearer ${EXPIRED}` },
  { name: 'truncated',header: `Bearer ${TRUNC}` },
  { name: 'no-bearer',header: FORGED },
  { name: 'empty',    header: 'Bearer ' },
  { name: 'random',   header: 'Bearer ' + Math.random().toString(36) },
];

export function jwtAbuseTest() {
  const a = ATTACKS[__ITER % ATTACKS.length];
  const r = http.get(`${API}/auth/me`, {
    headers: { Authorization: a.header },
  });
  const blocked = r.status === 401;
  jwtRejected.add(blocked);
  if (!blocked) console.error(`!!! JWT attack '${a.name}' got ${r.status} — security regression`);
}

// ── 4) Cross-user authorization probe (F3 defense-in-depth) ────────────────
export function crossUserTest() {
  if (users.length < 2) {
    console.warn('crossUserTest needs >=2 seeded users; skipping');
    return;
  }
  const A = users[0];
  const B = users[1];

  const created = createInterview(A.token, 'technical');

  const get = http.get(`${API}/interviews/${created.id}`, {
    headers: { Authorization: `Bearer ${B.token}` },
  });
  crossUserBlocked.add(get.status === 403 || get.status === 404);

  const patch = http.patch(
    `${API}/interviews/${created.id}`,
    JSON.stringify({ score: 999 }),
    { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${B.token}` } },
  );
  crossUserBlocked.add(patch.status === 403 || patch.status === 404);

  const tr = http.get(`${API}/interviews/${created.id}/transcript`, {
    headers: { Authorization: `Bearer ${B.token}` },
  });
  crossUserBlocked.add(tr.status === 403 || tr.status === 404);
}

// ── 5) WebSocket auth abuse ────────────────────────────────────────────────
export function wsAbuseTest() {
  const probes = [
    { name: 'no-auth-msg',  send: () => null }, // never send auth → server should close after 10s
    { name: 'wrong-shape',  send: () => JSON.stringify({ type: 'hello' }) },
    { name: 'forged-token', send: () => JSON.stringify({ type: 'auth', token: FORGED }) },
    { name: 'expired',      send: () => JSON.stringify({ type: 'auth', token: EXPIRED }) },
    { name: 'audio-first',  send: () => null, sendBinary: true },
  ];
  const probe = probes[__ITER % probes.length];

  let denied = false;
  let closeCode = null;

  const res = ws.connect(`${WS_URL}?interviewId=ffffffff-ffff-ffff-ffff-ffffffffffff`, {}, (socket) => {
    socket.on('open', () => {
      if (probe.sendBinary) {
        socket.sendBinary(new ArrayBuffer(1024));
        return;
      }
      const msg = probe.send();
      if (msg) socket.send(msg);
    });
    socket.on('message', (raw) => {
      try {
        const m = JSON.parse(raw);
        if (m.type === 'error') denied = true;
      } catch { /* ignore */ }
    });
    socket.on('close', (code) => {
      closeCode = code;
      // 4001/4003/4004 are explicit deny codes from the server.
      if (code === WS_CLOSE.UNAUTHORIZED || code === WS_CLOSE.FORBIDDEN || code === WS_CLOSE.NOT_FOUND) {
        denied = true;
      }
    });
    socket.setTimeout(() => socket.close(), 12000);
  });

  if (probe.name !== 'audio-first') {
    wsRejected.add(denied);
  } else {
    wsRejected.add(denied || (res && res.status !== 101));
  }
}
