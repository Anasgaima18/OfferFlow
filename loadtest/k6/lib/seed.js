// Run once before load tests to mint N users + write their tokens to a JSON file
// that other scripts can import via SharedArray.
// Usage: k6 run --env COUNT=500 lib/seed.js
//
// k6 cannot write files at runtime — instead we print a JSON line per user.
// Pipe to a file:
//   k6 run --env COUNT=500 lib/seed.js > users.ndjson
// Then point other scripts at users.ndjson via env USERS_FILE.

import { signup } from './http.js';
import { sleep } from 'k6';

export const options = {
  scenarios: {
    seed: {
      executor: 'shared-iterations',
      vus: parseInt(__ENV.SEED_VUS || '5', 10),
      iterations: parseInt(__ENV.COUNT || '50', 10),
      maxDuration: '20m',
    },
  },
  thresholds: { http_req_failed: ['rate<0.05'] },
};

export default function () {
  // Stay well under authLimiter (10/15min/IP). When load-testing,
  // run k6 from many IPs OR pre-seed with a small SEED_VUS.
  const u = signup('seed');
  // Print one JSON object per line — caller redirects stdout to file.
  console.log(JSON.stringify({ email: u.email, token: u.token, id: u.user.id }));
  sleep(2);
}
