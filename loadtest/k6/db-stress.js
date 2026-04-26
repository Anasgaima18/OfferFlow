// T8 + T9: DB-stress — concurrent writes + leaderboard read flood.
//
// Verifies (post-fix):
//   F11 + F19 → leaderboard p95 < 250ms (was 800-3000ms): materialized view
//   F11       → /interviews/stats p95 < 400ms: get_user_rank RPC against MV
//   F18       → /interviews/:id/transcript p95 < 250ms: composite index
//
// Pair with `psql \dt+ transcript_messages` to confirm row growth matches
// expectations (no F8 transcript drops).
//
// k6 run -e BASE_URL=... -e USERS_FILE=users.ndjson db-stress.js

import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Trend, Counter } from 'k6/metrics';
import { SLO } from './lib/config.js';
import {
  postJson,
  patchJson,
  getJson,
  signup,
  authedHeaders,
  createInterview,
} from './lib/http.js';

const tCreate = new Trend('lat_create_interview', true);
const tPatch = new Trend('lat_patch_interview', true);
const tLeaderboard = new Trend('lat_leaderboard', true);
const tStats = new Trend('lat_stats', true);
const tTranscript = new Trend('lat_get_transcript', true);
const writeOps = new Counter('write_ops_completed');
const readOps = new Counter('read_ops_completed');

const users = new SharedArray('users', function () {
  if (!__ENV.USERS_FILE) return [];
  return open(__ENV.USERS_FILE).split('\n').filter(Boolean).map((l) => JSON.parse(l));
});

export const options = {
  scenarios: {
    write_pressure: {
      executor: 'ramping-arrival-rate',
      startRate: 5,
      timeUnit: '1s',
      preAllocatedVUs: 20,
      maxVUs: 200,
      stages: [
        { target: 20,  duration: '1m' },
        { target: 50,  duration: '2m' },
        { target: 100, duration: '2m' },
        { target: 0,   duration: '30s' },
      ],
      exec: 'writeScenario',
    },
    read_pressure: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 20,
      maxVUs: 200,
      stages: [
        { target: 50,  duration: '1m' },
        { target: 100, duration: '2m' },
        { target: 200, duration: '2m' },
        { target: 0,   duration: '30s' },
      ],
      exec: 'readScenario',
      startTime: '30s',
    },
  },
  thresholds: {
    lat_create_interview: ['p(95)<800'],
    lat_patch_interview:  ['p(95)<800'],
    lat_leaderboard:      [`p(95)<${SLO.leaderboard_p95_ms}`],   // tightened
    lat_stats:            [`p(95)<${SLO.stats_p95_ms}`],         // tightened
    lat_get_transcript:   [`p(95)<${SLO.transcript_p95_ms}`],    // tightened
    http_req_failed:      ['rate<0.02'],
  },
};

function pickToken() {
  if (users.length > 0) return users[__VU % users.length].token;
  return signup('dbstress').token;
}

export function writeScenario() {
  const token = pickToken();

  const c = postJson('/interviews', { type: 'technical' }, { headers: authedHeaders(token) });
  tCreate.add(c.timings.duration);
  if (!check(c, { 'create 201': (r) => r.status === 201 })) return;
  const id = c.json('data.interview.id');

  const p = patchJson(
    `/interviews/${id}`,
    {
      score: Math.floor(Math.random() * 100),
      status: 'completed',
      feedback: 'k6 write-pressure scenario',
    },
    token,
  );
  tPatch.add(p.timings.duration);
  check(p, { 'patch 200': (r) => r.status === 200 });
  writeOps.add(1);
}

export function readScenario() {
  const token = pickToken();

  const lb = getJson('/interviews/leaderboard?limit=10', token);
  tLeaderboard.add(lb.timings.duration);

  const st = getJson('/interviews/stats', token);
  tStats.add(st.timings.duration);

  const list = getJson('/interviews', token);
  if (list.status === 200) {
    const items = list.json('data.interviews') || [];
    if (items.length > 0) {
      const id = items[Math.floor(Math.random() * items.length)].id;
      const t = getJson(`/interviews/${id}/transcript`, token);
      tTranscript.add(t.timings.duration);
    }
  }
  readOps.add(1);
  sleep(0.1);
}
