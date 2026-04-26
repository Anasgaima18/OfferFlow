// T6: WS spike test — 0 → PEAK connection storm in 30s.
//
// Verifies (post-fix):
//   F5  → Render starter handles burst (or scales)
//   F13 → no auth-window message loss (auth completes <3s under load)
//   F14 → per-IP cap rejects with 1013 cleanly when PEAK > WS_PER_IP_LIMIT
//
// IMPORTANT: From a single egress IP k6 will hit the per-IP cap (default 10).
// To do an honest connection-spike test against the global cap you must
// either run from many IPs (k6 cloud / multiple runners) OR temporarily
// raise WS_PER_IP_LIMIT in staging:
//
//   On Render: set WS_PER_IP_LIMIT=PEAK in the env vars before testing.
//
// k6 run -e BASE_URL=... -e USERS_FILE=users.ndjson -e PEAK=500 ws-spike.js

import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Trend, Counter, Rate } from 'k6/metrics';
import { WS_URL, SLO, WS_PER_IP_LIMIT, WS_GLOBAL_LIMIT } from './lib/config.js';
import { signup, createInterview } from './lib/http.js';
import { ingestMessage, newTurnTracker, isExpectedClose, WS_CLOSE } from './lib/wsProtocol.js';

const wsConnect = new Trend('ws_connect_ms', true);
const wsAuth = new Trend('ws_auth_ms', true);
const wsCapacityReject = new Counter('ws_capacity_rejects');                  // 1013
const wsServerError = new Counter('ws_server_errors');                        // 1011 / 1006
const wsConnSuccess = new Rate('ws_connect_success');

const users = new SharedArray('users', function () {
  if (!__ENV.USERS_FILE) return [];
  return open(__ENV.USERS_FILE).split('\n').filter(Boolean).map((l) => JSON.parse(l));
});

const PEAK = parseInt(__ENV.PEAK || '500', 10);

// If PEAK is far above the per-IP cap and we're running from one IP, only
// the first WS_PER_IP_LIMIT connections will succeed — rest get 1013, which
// is HEALTHY behavior. We tune the success-rate threshold accordingly.
const expectedAcceptance = Math.min(PEAK, WS_PER_IP_LIMIT, WS_GLOBAL_LIMIT) / PEAK;
const successFloor = Math.max(0.5, expectedAcceptance * 0.9);

export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { target: PEAK, duration: '30s' },
        { target: PEAK, duration: '60s' },
        { target: 0,    duration: '30s' },
      ],
      exec: 'spikeScenario',
      gracefulStop: '15s',
    },
  },
  thresholds: {
    // F14: real failures (server crash, abnormal close) must stay near zero.
    // 1013 capacity rejects are acceptable and tracked separately.
    ws_server_errors: ['count<5'],
    ws_connect_success: [`rate>${successFloor}`],
    ws_connect_ms: [`p(95)<${SLO.ws_connect_p95_ms * 2}`],   // double SLO under spike
    ws_auth_ms: [`p(95)<${SLO.ws_first_msg_p95_ms * 2}`],
  },
};

export function setup() {
  const sessions = [];
  const need = Math.max(PEAK, 50);
  for (let i = 0; i < need; i++) {
    let token;
    if (users.length > 0) token = users[i % users.length].token;
    else token = signup('spike').token;
    const interview = createInterview(token, 'technical');
    sessions.push({ token, interviewId: interview.id });
    if (i % 20 === 19) sleep(0.2);
  }
  return { sessions };
}

export function spikeScenario(data) {
  const idx = (__VU - 1) % data.sessions.length;
  const { token, interviewId } = data.sessions[idx];
  const url = `${WS_URL}?interviewId=${interviewId}`;

  const t0 = Date.now();
  let tAuth = 0;
  const tracker = newTurnTracker(0);

  const res = ws.connect(url, {}, (socket) => {
    wsConnect.add(Date.now() - t0);
    socket.on('open', () => socket.send(JSON.stringify({ type: 'auth', token })));
    socket.on('message', (raw) => {
      const evt = ingestMessage(tracker, raw);
      if (evt.kind === 'auth_success' && tAuth === 0) {
        tAuth = Date.now();
        wsAuth.add(tAuth - t0);
      }
    });
    socket.on('close', (code) => {
      if (code === WS_CLOSE.TRY_AGAIN) wsCapacityReject.add(1);
      else if (!isExpectedClose(code)) wsServerError.add(1);
    });
    socket.setTimeout(() => socket.close(), 5000);
  });

  const ok = check(res, { 'spike 101': (r) => r && r.status === 101 });
  wsConnSuccess.add(ok);
}

export function teardown(_data) {
  console.log(
    `expected acceptance ratio (PEAK=${PEAK}, perIp=${WS_PER_IP_LIMIT}, global=${WS_GLOBAL_LIMIT}): ` +
    `${(expectedAcceptance * 100).toFixed(0)}%`,
  );
}
