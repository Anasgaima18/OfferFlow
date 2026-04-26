# OfferFlow — Load + Performance Test Suite

k6-based test pack targeting the **specific failure modes** identified in the
SRE analysis (findings F1–F22) and verifying that the post-fix server (see
`server/src/ws/interviewSession.ts`, `server/src/utils/*`,
`server/migrations/2026-04-26_perf_and_security.sql`) actually behaves the way
we claim.

> **DO NOT** run the WebSocket scripts (`ws-*.js`) or `db-stress.js` against
> the Render free tier — you will OOM the 512 MB instance and consume your
> entire Supabase free-plan bandwidth in minutes. Use a paid staging
> environment (`plan: starter` minimum, `standard` recommended).

---

## 0. Prerequisites

```bash
# k6 0.49+ (sendBinary requires modern k6)
brew install k6                 # macOS
choco install k6                # Windows
# or: docker pull grafana/k6
```

Optional but recommended observability stack (Prometheus + Grafana,
auto-provisions both dashboards):

```bash
docker compose -f loadtest/docker-compose.observability.yml up -d
# Grafana http://localhost:3000   (admin/admin)
# Prometheus http://localhost:9090
```

If your server runs with `METRICS_TOKEN` set, write the token to
`loadtest/metrics.token` BEFORE starting the stack so Prometheus can scrape
the protected `/metrics` endpoint.

---

## 1. Set up the environment

```bash
# Required
export BASE_URL=https://offerflow-server-staging.onrender.com
export WS_URL=wss://offerflow-server-staging.onrender.com/api/v1/interviews/ws
export USERS_FILE=users.ndjson
# Optional
export METRICS_TOKEN=...
export PROM_OUT=http://localhost:9090/api/v1/write
```

PowerShell:

```powershell
$env:BASE_URL = 'https://offerflow-server-staging.onrender.com'
$env:WS_URL   = 'wss://offerflow-server-staging.onrender.com/api/v1/interviews/ws'
$env:USERS_FILE = 'users.ndjson'
```

### Pre-seed users (avoid the auth limiter mid-run)

The signup endpoint is hard-limited to **10 requests / 15 min / IP**
(`server/src/middleware/rateLimit.middleware.ts`). Mint your test users once,
*slowly*, and pass the JSON file to the load tests:

```bash
# Mint 200 test users — runs 5 VUs in parallel with sleep(2) between calls.
k6 run --env COUNT=200 --env SEED_VUS=5 k6/lib/seed.js > users.ndjson
```

To seed faster you must either:
- run `seed.js` from multiple distinct egress IPs, OR
- temporarily relax `authLimiter` in staging (`AUTH_LIMITER_MAX=1000`), OR
- bypass the limiter by directly inserting users into Supabase
  (`INSERT INTO users(...) ...` — fast but skips the bcrypt cost).

---

## 2. The test plan (run in this order)

| #     | Script                | Purpose                                      | Runtime  | Verifies findings        |
|-------|-----------------------|----------------------------------------------|----------|--------------------------|
| T0    | `metrics-scrape.js`   | `/metrics` exposition + auth                 | <1 min   | Phase 5                  |
| T1    | `rest-load.js`        | Baseline REST + lifecycle + dashboard        | 5–15 min | F4, F11, F19             |
| T8/T9 | `db-stress.js`        | Concurrent writes + leaderboard hammer       | 5–10 min | F11, F18, F19            |
| T3    | `auth-stress.js`      | bcrypt CPU pressure                          | 5 min    | F10                      |
| T4    | `ws-interview.js`     | Full WS session simulation (streaming TTS)   | 5–10 min | **F1**, F2, F8, F13      |
| T6b   | `ws-cap.js`           | F14 per-IP WS connection cap enforcement     | <1 min   | **F14**                  |
| T6    | `ws-spike.js`         | Sudden connection surge (0→PEAK)             | 2 min    | F5, F13, F14             |
| T10   | `code-exec.js`        | Code execution circuit breaker + limits      | 4 min    | **F12**                  |
| T12-14| `security.js`         | Rate-limit, JWT, RLS, WS abuse               | 10 min   | **F3**, F7               |
| T7    | `ws-soak.js`          | Long sessions × N — memory/FD leaks          | 30 min+  | F2, **F6**, F8, F15, F17 |
| T11   | `shutdown-drain.js`   | Operator-assisted SIGTERM drain              | ~3 min   | **F15**                  |

---

## 3. One-shot orchestration

```bash
# Linux/macOS
./loadtest/run-all.sh                 # standard (skips T7 soak)
STAGE=full ./loadtest/run-all.sh      # adds T7 soak (extra 30 min)
STAGE=quick ./loadtest/run-all.sh     # skips T3/T6/T7
```

```powershell
# Windows
.\loadtest\run-all.ps1                # standard
$env:STAGE = 'full';  .\loadtest\run-all.ps1
$env:STAGE = 'quick'; .\loadtest\run-all.ps1
```

Per-test summaries land in `loadtest/results/<timestamp>/`. The orchestrator
exits non-zero if **any** test breaches its thresholds, but always continues
through the suite so you collect signal from every test in one go.

---

## 4. Individual commands

### REST baseline
```bash
k6 run -e BASE_URL=$BASE_URL -e USERS_FILE=$USERS_FILE \
  -e READ_RPS=20 -e WRITE_RPS=4 -e DURATION=5m \
  loadtest/k6/rest-load.js
```

### REST stress (find the knee)
```bash
k6 run -e BASE_URL=$BASE_URL -e USERS_FILE=$USERS_FILE \
  -e STRESS_START=0s -e DURATION=1s \
  loadtest/k6/rest-load.js
```

### WebSocket — sustained 50 sessions, 5 min hold
```bash
k6 run -e BASE_URL=$BASE_URL -e WS_URL=$WS_URL \
  -e USERS_FILE=$USERS_FILE \
  -e CONNS=50 -e SESSION_SECS=300 -e HOLD=5m \
  loadtest/k6/ws-interview.js
```

### WebSocket — F14 per-IP cap proof
```bash
# Default per-IP cap is 10. Try to open 15 from one egress.
k6 run -e BASE_URL=$BASE_URL -e WS_URL=$WS_URL \
  -e USERS_FILE=$USERS_FILE \
  -e PER_IP_LIMIT=10 -e ATTEMPT=15 \
  loadtest/k6/ws-cap.js
```

### WebSocket spike (0 → PEAK in 30s)
```bash
# Raise WS_PER_IP_LIMIT in the server env first if PEAK > 10.
k6 run -e BASE_URL=$BASE_URL -e WS_URL=$WS_URL \
  -e USERS_FILE=$USERS_FILE -e PEAK=500 \
  loadtest/k6/ws-spike.js
```

### Long-running soak (memory + FD leaks)
```bash
k6 run -e BASE_URL=$BASE_URL -e WS_URL=$WS_URL \
  -e USERS_FILE=$USERS_FILE -e VUS=50 -e SOAK_MIN=30 \
  -e METRICS_TOKEN=$METRICS_TOKEN \
  loadtest/k6/ws-soak.js
```

### F15 — graceful shutdown drain
```bash
# Connect 20 sessions; you have 120s to issue SIGTERM to the server.
k6 run -e BASE_URL=$BASE_URL -e WS_URL=$WS_URL \
  -e USERS_FILE=$USERS_FILE -e SESSIONS=20 -e SHUTDOWN_HOLD_SECS=120 \
  loadtest/k6/shutdown-drain.js
# In another terminal, while the script logs `issue SIGTERM now`:
ssh staging "pkill -TERM -f 'node.*dist/index.js'"
# Or: trigger a Render Restart from the dashboard.
```

### Stream metrics into Prometheus
```bash
k6 run --out experimental-prometheus-rw=http://localhost:9090/api/v1/write \
  loadtest/k6/ws-interview.js
```

---

## 5. Custom metrics emitted

### k6 → client-observed view
| Metric | Type | What it tells you |
|---|---|---|
| `rest_latency_ms` | trend | All REST p50/p95/p99 |
| `lat_leaderboard` | trend | Leaderboard hot path (F11/F19) |
| `lat_stats` | trend | get_user_rank RPC (F11) |
| `lat_get_transcript` | trend | Transcript pagination (F18) |
| `lat_me` | trend | protect() middleware (F4) |
| `lat_signup`, `lat_login` | trend | Bcrypt CPU pressure (F10) |
| `lat_code_exec`, `lat_code_exec_fastfail` | trend | F12 — breaker behaviour |
| `ws_connect_ms` | trend | TCP+upgrade duration (F5) |
| `ws_auth_ack_ms` | trend | First-message auth round-trip (F13) |
| `ws_greeting_ms` | trend | Time-to-first-AI-greeting (Sarvam call latency) |
| `ws_first_audio_byte_ms` | trend | **F1 — TTFB of streaming TTS** |
| `ws_transcript_first_partial_ms` | trend | Time-to-first STT partial after audio start |
| `ws_ai_response_ms`, `ws_turn_latency_ms` | trend | End-to-end turn latency |
| `ws_audio_bytes_in/out`, `ws_audio_chunks_in` | counter | TTS / STT volume; per-chunk rate verifies F1 streaming |
| `ws_abnormal_close` | counter | 1006/1011/4xxx — real bugs |
| `ws_capacity_rejects` | counter | 1013 (F14 healthy) |
| `ws_server_restart` | counter | 1012 (F15 healthy) |
| `ws_tts_errors` | counter | TTS upstream failed but transcript continued |
| `ws_connect_success` | rate | Connection acceptance under spike |
| `rate_limit_429` | counter | Did the limiter fire? (F7) |
| `xff_bypass_succeeded` | counter | Limiter bypass via X-Forwarded-For (F7) |
| `jwt_invalid_rejected` | rate | Should be 1.0 |
| `cross_user_blocked` | rate | Should be 1.0 (F3 defense-in-depth) |
| `code_exec_429`, `code_exec_503` | counter | F12 — limiter / breaker fired |
| `srv_*` | gauge | Server-side metrics polled from `/metrics` |

### Server `/metrics` → runtime view (Phase 5)
Prefix `offerflow_`. The Grafana **OfferFlow — Server Runtime** dashboard
visualises all of these:

| Metric | Type | Verifies |
|---|---|---|
| `offerflow_ws_active_connections` | gauge | F14 |
| `offerflow_ws_buffered_amount_bytes` | histogram | **F2 backpressure** |
| `offerflow_ws_send_drops_total{kind,reason}` | counter | F2 |
| `offerflow_ws_connections_by_ip{ip}` | gauge | F14 |
| `offerflow_supabase_query_ms{op,table}` | histogram | F11 |
| `offerflow_external_api_ms{service,op}` | histogram | F16 |
| `offerflow_circuit_breaker_state{name}` | gauge | **F12, F16** |
| `offerflow_ai_response_latency_ms` | histogram | F16 |
| `offerflow_stt_turn_latency_ms` | histogram | F9 |
| `offerflow_transcript_queue_depth` / `offerflow_transcript_drops_total` | gauge / counter | **F8** |
| `offerflow_user_cache_hits_total{result}` | counter | **F4** |

---

## 6. Phase 6 — failure analysis matrix

When a threshold breaches, k6 exits non-zero and prints the failed
threshold. Pair the symptom with the corresponding finding and apply the fix
in the table.

| Threshold breach | Finding | Root cause | Exact fix | Expected ∆ |
|---|---|---|---|---|
| `lat_me p95 > 100ms` | F4 | `protect()` does Supabase REST roundtrip per req | `userCache` LRU (already in `auth.middleware.ts`) — set `USER_CACHE_TTL_MS` ≥ 60_000 | p95 50–300ms → <10ms |
| `lat_leaderboard p95 > 250ms` | F11/F19 | View re-aggregates whole table | Refresh MV: `REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_summary;` (see `migrations/2026-04-26_perf_and_security.sql`) | seconds → <100ms |
| `lat_signup p95 > 800ms` | F10 | bcrypt cost 12 on 0.1–0.5 vCPU | Set `BCRYPT_COST=10` in env | 250–500ms → 70–100ms |
| `rate_limit_429 count == 0` | F7 | In-memory store reset on cold start / not shared | Set `REDIS_URL` to a managed Redis | limiter actually fires |
| `xff_bypass_succeeded > 5` | F7 | `keyGenerator` trusts client XFF beyond Render's hop | Set `app.set('trust proxy', 1)` *only* — and rely on Render to strip XFF; never run with > 1 trusted hop | XFF rotations no longer score |
| `cross_user_blocked < 1.0` | **F3** | Service role bypasses RLS without ownership check | Verify `interview.controller.ts` ownership clause + RLS migration applied | 100% block |
| `ws_abnormal_close > 5` (steady) | F2/F15 | Slow client → OOM, or no graceful drain | bufferedAmount throttling (see `safeSend.ts`) + `drainAllSessions` | abnormal closes → 0; only 1012 on deploy |
| `ws_first_audio_byte_ms p95 > 1500ms` | **F1** | TTS still buffered server-side | Confirm `interviewSession.speakText` emits `audio_chunk` per chunk | TTFB 3000ms → <1000ms |
| `ws_greeting_ms p95 > 4000ms` | F16 | No Sarvam circuit breaker / retry | `circuitBreaker.ts` wrap; reduce timeout to 8000ms; one retry | timeout cascade → fast-fail <100ms when open |
| `code_exec_429 > 0` while `code_exec_success > 0.6` | F12 healthy | per-user limiter fired ✓ | _no fix needed — this confirms the fix_ |
| `code_exec_503 spikes` and breaker open | F12 | Piston outage; breaker correctly fast-fails | _no fix_ — verify `aiResponseLatency p95 < 100ms` while breaker open | breaker shed load |
| `ws_cap_accepted > PER_IP_LIMIT` | **F14** regression | Cap not enforced | Verify `connectionLimiter.acquireSlot` + env `WS_PER_IP_LIMIT` | accepted exactly = cap |
| `srv_transcript_drops_total > 0` | F8 | Transcript queue overflow | Increase queue size in `transcriptQueue.ts` or scale Supabase plan | 0 drops |
| `srv_ws_buffered_amount_bytes p95 > 4 MB` | F2 | Slow client / unbounded send | `safeSend` already drops control frames over budget; investigate which session | p95 < 1 MB |
| `offerflow_circuit_breaker_state{name="*"} == 2 sustained` | F12/F16 | External API down | Surface `tts_error` to UX; auto-reset after window | breaker re-closes within 30s |

---

## 7. Phase 7 — execution roadmap

### 7.1 Local (laptop)
- **Goal**: iterate on test logic; smoke-check fixes.
- **What to run**: T0, T1 with low rates (READ_RPS=5), T6b cap (small ATTEMPT).
- **Don't run**: T7, T6 above PEAK=50 (your laptop is the bottleneck, not the server).
- **Stack**: `docker compose -f loadtest/docker-compose.observability.yml up -d`
  + bring up the server with `npm run dev`.

### 7.2 Staging on Render `starter` plan
- **Goal**: mirror prod constraints.
- **Pre-flight**:
  - Apply `migrations/2026-04-26_perf_and_security.sql`.
  - `WS_PER_IP_LIMIT=200` *during the spike test only* — restore to 10 after.
  - `BCRYPT_COST=10` (or whatever production uses).
  - `REDIS_URL` pointing to the staging Redis instance.
  - `METRICS_TOKEN` set; mirror it to `loadtest/metrics.token`.
- **What to run**: full `STAGE=standard` orchestrator, and `STAGE=full` overnight.
- **Watch**: Render service metrics (CPU, RSS, disk, bandwidth) alongside the
  Grafana **OfferFlow — Server Runtime** dashboard.

### 7.3 Production
- Only run **`security.js` JWT probes** (low rate) and `metrics-scrape.js`.
- **Never** T4 / T6 / T7 — you will impact paying users.
- Routinely: a thin synthetic monitor doing `T0 + T1 read scenario at 0.1 RPS`
  is fine and recommended.

### 7.4 Render scaling limits (verified 2026)

| Plan | RAM | vCPU | Bandwidth/mo | Notes |
|---|---|---|---|---|
| Free | 512 MB | 0.1 | 100 GB | **Sleeps after 15 min** — WS dies. |
| Starter ($7) | 512 MB | 0.5 | 100 GB | No sleep. Single instance. |
| Standard ($25) | 2 GB | 1.0 | 100 GB | **Min for prod with WS.** |
| Pro ($85) | 4 GB | 2.0 | 100 GB | Required for >100 concurrent WS. |

### 7.5 Supabase scaling limits (free tier)

| Limit | Value | Implication |
|---|---|---|
| Database | 500 MB | Long transcripts fill this fast. ~1k interviews × 50 msgs × 200 chars ≈ 10 MB. |
| Bandwidth | 5 GB/mo | Each WS turn = ~2-5 KB DB traffic; ~1 M turns/mo cap. |
| Active users | 50,000 | Plenty. |
| PgBouncer pool | 60 conns | But you use PostgREST, not direct PG. |
| PostgREST RPS | undocumented (~100-300) | Hit this around 200 concurrent users. |

### 7.6 What "passing" looks like (steady-state)

For a healthy `STAGE=standard` run on Render Standard ($25):

| Metric | Target |
|---|---|
| `lat_me p95` | < 60 ms (cache hits >95%) |
| `lat_leaderboard p95` | < 200 ms (MV hits) |
| `lat_signup p95` | < 700 ms |
| `ws_connect_ms p95` | < 800 ms |
| `ws_first_audio_byte_ms p95` | < 1200 ms |
| `ws_turn_latency_ms p95` | < 6 s |
| `ws_abnormal_close` | 0 |
| `ws_capacity_rejects` | only if you intentionally exceeded the cap |
| `srv_transcript_drops_total` | 0 |
| `srv_circuit_breakers_open` | 0 (all closed) |
| `cross_user_blocked rate` | 1.0 |
| `jwt_invalid_rejected rate` | 1.0 |
