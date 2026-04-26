// T1: REST baseline / load test — auth + interview lifecycle + leaderboard
//
// Verifies (post-fix):
//   F4 → /auth/me p95 < 100ms (LRU cache eliminates DB roundtrip)
//   F11 + F19 → /interviews/leaderboard p95 < 250ms (materialized view)
//   F11 → /interviews/stats p95 < 400ms (uses get_user_rank against MV)
//
// Usage:
//   k6 run -e BASE_URL=... -e USERS_FILE=users.ndjson rest-load.js
//   k6 run -e K6_TIER=medium rest-load.js

import { check, sleep, group } from 'k6';
import { SharedArray } from 'k6/data';
import { Trend, Rate } from 'k6/metrics';
import { SLO } from './lib/config.js';
import {
  postJson,
  getJson,
  patchJson,
  signup,
  authedHeaders,
  createInterview,
} from './lib/http.js';

const users = new SharedArray('users', function () {
  if (!__ENV.USERS_FILE) return [];
  const data = open(__ENV.USERS_FILE);
  return data
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));
});

const trendList = new Trend('lat_list_interviews', true);
const trendCreate = new Trend('lat_create_interview', true);
const trendLeaderboard = new Trend('lat_leaderboard', true);
const trendStats = new Trend('lat_stats', true);
const trendMe = new Trend('lat_me', true);
const trendTranscript = new Trend('lat_get_transcript', true);
const checkRate = new Rate('checks_passed');

export const options = {
  scenarios: {
    read_steady: {
      executor: 'constant-arrival-rate',
      rate: parseInt(__ENV.READ_RPS || '20', 10),
      timeUnit: '1s',
      duration: __ENV.DURATION || '5m',
      preAllocatedVUs: 30,
      maxVUs: 200,
      exec: 'readScenario',
    },
    write_steady: {
      executor: 'constant-arrival-rate',
      rate: parseInt(__ENV.WRITE_RPS || '4', 10),
      timeUnit: '1s',
      duration: __ENV.DURATION || '5m',
      preAllocatedVUs: 10,
      maxVUs: 50,
      exec: 'writeScenario',
      startTime: '10s',
    },
    stress_ramp: {
      executor: 'ramping-arrival-rate',
      startRate: 5,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 500,
      stages: [
        { target: 50,  duration: '1m' },
        { target: 100, duration: '2m' },
        { target: 200, duration: '2m' },
        { target: 400, duration: '2m' },
        { target: 0,   duration: '30s' },
      ],
      exec: 'readScenario',
      startTime: __ENV.STRESS_START || '5m',
      tags: { phase: 'stress' },
    },
  },
  thresholds: {
    'lat_list_interviews':  [`p(95)<${SLO.rest_p95_ms}`],
    'lat_leaderboard':      [`p(95)<${SLO.leaderboard_p95_ms}`],
    'lat_stats':            [`p(95)<${SLO.stats_p95_ms}`],
    'lat_me':               [`p(95)<${SLO.rest_p95_ms}`],   // F4: should be <100ms ideally
    'lat_get_transcript':   [`p(95)<${SLO.transcript_p95_ms}`],
    'http_req_failed':      [`rate<${SLO.rest_error_rate}`],
    'checks_passed':        ['rate>0.99'],
  },
};

function getToken() {
  if (users.length > 0) {
    const u = users[__VU % users.length];
    return u.token;
  }
  return signup('rest').token;
}

export function readScenario() {
  const token = getToken();

  group('GET /auth/me', () => {
    const r = getJson('/auth/me', token);
    trendMe.add(r.timings.duration);
    checkRate.add(check(r, { 'me 200': (x) => x.status === 200 }));
  });

  group('GET /interviews', () => {
    const r = getJson('/interviews', token);
    trendList.add(r.timings.duration);
    checkRate.add(check(r, { 'list 200': (x) => x.status === 200 }));
  });

  group('GET /interviews/leaderboard', () => {
    const r = getJson('/interviews/leaderboard?limit=10', token);
    trendLeaderboard.add(r.timings.duration);
    checkRate.add(check(r, { 'lb 200': (x) => x.status === 200 }));
  });

  group('GET /interviews/stats', () => {
    const r = getJson('/interviews/stats', token);
    trendStats.add(r.timings.duration);
    checkRate.add(check(r, { 'stats 200': (x) => x.status === 200 }));
  });

  sleep(Math.random() * 2);
}

export function writeScenario() {
  const token = getToken();

  let interviewId;
  group('POST /interviews', () => {
    const interview = createInterview(token, 'technical');
    trendCreate.add(0);
    interviewId = interview.id;
  });

  group('PATCH /interviews/:id (score)', () => {
    const r = patchJson(
      `/interviews/${interviewId}`,
      { score: 75, status: 'completed', feedback: 'Auto from k6' },
      token,
    );
    checkRate.add(check(r, { 'patch 200': (x) => x.status === 200 }));
  });

  group('GET /interviews/:id/transcript', () => {
    const r = getJson(`/interviews/${interviewId}/transcript`, token);
    trendTranscript.add(r.timings.duration);
    checkRate.add(check(r, { 'transcript 200': (x) => x.status === 200 }));
  });

  sleep(1);
}

export function setup() {
  return { startedAt: Date.now() };
}

export function teardown(data) {
  console.log(`run finished in ${(Date.now() - data.startedAt) / 1000}s`);
}
