// T11: F15 — graceful shutdown drain verification.
//
// Procedure:
//   1. Open N WS interview sessions and let each speak for ~10s.
//   2. While they're connected, an OPERATOR signals SIGTERM to the server
//      (e.g. `kill -TERM $(pgrep -f 'node.*dist/index')` or `render.com`
//      "Restart" button on the staging service).
//   3. The server should:
//      a. emit `{ type: 'server_shutdown', reason: ... }` on each socket
//      b. close each socket with code 1012 within SHUTDOWN_TIMEOUT_MS
//      c. mark each interview's status='completed' before exiting
//   4. The script asserts:
//      - shutdown_msg_seen == sessions
//      - close_code_1012 == sessions
//      - close_code_1006 == 0
//
// This test is operator-assisted: signal the server when the script logs
// `[shutdown-drain] sessions established — issue SIGTERM now`.
// You have SHUTDOWN_HOLD_SECS to do so.
//
// k6 run -e BASE_URL=... -e WS_URL=... -e USERS_FILE=users.ndjson -e SESSIONS=20 shutdown-drain.js

import ws from 'k6/ws';
import { sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Counter } from 'k6/metrics';
import { WS_URL } from './lib/config.js';
import { signup, createInterview } from './lib/http.js';
import { ingestMessage, newTurnTracker, WS_CLOSE } from './lib/wsProtocol.js';

const shutdownMsgSeen = new Counter('shutdown_msg_seen');
const close1012 = new Counter('shutdown_close_1012');
const close1006 = new Counter('shutdown_close_1006');
const closeOther = new Counter('shutdown_close_other');

const users = new SharedArray('users', function () {
  if (!__ENV.USERS_FILE) return [];
  return open(__ENV.USERS_FILE).split('\n').filter(Boolean).map((l) => JSON.parse(l));
});

const SESSIONS = parseInt(__ENV.SESSIONS || '20', 10);
const HOLD = parseInt(__ENV.SHUTDOWN_HOLD_SECS || '120', 10);

export const options = {
  scenarios: {
    drain: {
      executor: 'per-vu-iterations',
      vus: SESSIONS, iterations: 1, maxDuration: `${HOLD + 60}s`,
    },
  },
  thresholds: {
    shutdown_msg_seen: [`count>=${SESSIONS}`],
    shutdown_close_1012: [`count>=${SESSIONS}`],
    shutdown_close_1006: ['count==0'],
  },
};

export function setup() {
  const sessions = [];
  for (let i = 0; i < SESSIONS; i++) {
    let token;
    if (users.length > 0) token = users[i % users.length].token;
    else token = signup('drain').token;
    const interview = createInterview(token, 'technical');
    sessions.push({ token, interviewId: interview.id });
    if (i % 5 === 4) sleep(0.2);
  }
  console.log(`[shutdown-drain] ${sessions.length} sessions ready — connecting...`);
  return { sessions };
}

export default function (data) {
  const idx = (__VU - 1) % data.sessions.length;
  const { token, interviewId } = data.sessions[idx];
  const url = `${WS_URL}?interviewId=${interviewId}`;
  const tracker = newTurnTracker(0);

  const r = ws.connect(url, {}, (socket) => {
    socket.on('open', () => socket.send(JSON.stringify({ type: 'auth', token })));

    socket.on('message', (raw) => {
      const evt = ingestMessage(tracker, raw);
      if (evt.kind === 'auth_success') {
        if (__VU === 1) {
          console.log('[shutdown-drain] sessions established — issue SIGTERM now (you have ~' + HOLD + 's)');
        }
      }
      if (evt.kind === 'server_shutdown') {
        shutdownMsgSeen.add(1);
      }
    });

    socket.on('close', (code) => {
      if (code === WS_CLOSE.SERVICE_RESTART) close1012.add(1);
      else if (code === WS_CLOSE.ABNORMAL || code === undefined) close1006.add(1);
      else if (code !== WS_CLOSE.NORMAL && code !== WS_CLOSE.NO_STATUS) closeOther.add(1);
    });

    // Hold until either server-driven close or operator-induced timeout.
    socket.setTimeout(() => socket.close(), HOLD * 1000);
  });

  if (!r) closeOther.add(1);
}
