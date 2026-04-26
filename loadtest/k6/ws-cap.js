// T6b: F14 — explicit per-IP WS connection cap test.
//
// Opens N concurrent connections from a single VU (one egress IP). The first
// WS_PER_IP_LIMIT must succeed; the rest must close with code 1013. Anything
// else is a regression.
//
// Default WS_PER_IP_LIMIT in the server is 10 (utils/connectionLimiter.ts).
//
// Usage:
//   k6 run -e BASE_URL=... -e USERS_FILE=users.ndjson \
//          -e PER_IP_LIMIT=10 -e ATTEMPT=15 ws-cap.js
//
// Expected (when ATTEMPT > PER_IP_LIMIT):
//   accepted == PER_IP_LIMIT
//   rejected == ATTEMPT - PER_IP_LIMIT
//   abnormal == 0

import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Counter } from 'k6/metrics';
import { WS_URL } from './lib/config.js';
import { signup, createInterview } from './lib/http.js';
import { WS_CLOSE } from './lib/wsProtocol.js';

const accepted = new Counter('ws_cap_accepted');
const rejected = new Counter('ws_cap_rejected');
const abnormal = new Counter('ws_cap_abnormal');

const users = new SharedArray('users', function () {
  if (!__ENV.USERS_FILE) return [];
  return open(__ENV.USERS_FILE).split('\n').filter(Boolean).map((l) => JSON.parse(l));
});

const PER_IP_LIMIT = parseInt(__ENV.PER_IP_LIMIT || '10', 10);
const ATTEMPT = parseInt(__ENV.ATTEMPT || String(PER_IP_LIMIT + 5), 10);

export const options = {
  scenarios: {
    cap_test: {
      executor: 'shared-iterations',
      vus: ATTEMPT,
      iterations: ATTEMPT,
      maxDuration: '1m',
    },
  },
  thresholds: {
    // Exact arithmetic — k6 fails the run if we got fewer accepts or more
    // rejects than expected, which means the cap is broken.
    ws_cap_accepted: [`count<=${PER_IP_LIMIT}`, `count>=${Math.max(1, PER_IP_LIMIT - 1)}`],
    ws_cap_rejected: [`count>=${ATTEMPT - PER_IP_LIMIT}`],
    ws_cap_abnormal: ['count==0'],
  },
};

export function setup() {
  // We only need one valid token + one interview; all VUs reuse it.
  let token;
  if (users.length > 0) token = users[0].token;
  else token = signup('cap').token;
  const interview = createInterview(token, 'technical');
  return { token, interviewId: interview.id };
}

export default function (data) {
  const url = `${WS_URL}?interviewId=${data.interviewId}`;
  let saw1013 = false;
  let sawAuth = false;
  let sawAbnormal = false;

  const res = ws.connect(url, {}, (socket) => {
    socket.on('open', () =>
      socket.send(JSON.stringify({ type: 'auth', token: data.token })),
    );
    socket.on('message', (raw) => {
      try {
        const m = JSON.parse(raw);
        if (m.type === 'auth_success') sawAuth = true;
      } catch { /* ignore */ }
    });
    socket.on('close', (code) => {
      if (code === WS_CLOSE.TRY_AGAIN) saw1013 = true;
      else if (code !== WS_CLOSE.NORMAL && code !== WS_CLOSE.NO_STATUS) sawAbnormal = true;
    });
    // Hold long enough that the cap is observable while *still* connected.
    socket.setTimeout(() => socket.close(), 8000);
  });

  if (!check(res, { 'WS connect attempted': (r) => !!r })) return;

  if (sawAuth)        accepted.add(1);
  else if (saw1013)   rejected.add(1);
  else if (sawAbnormal) abnormal.add(1);
  // sleep to keep the slot held for a moment so subsequent VUs see the cap
  sleep(0.5);
}
