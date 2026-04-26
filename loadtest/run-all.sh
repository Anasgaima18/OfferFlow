#!/usr/bin/env bash
# Phase 7 — execute the load-test suite in the recommended order against
# whichever environment is targeted by BASE_URL / WS_URL.
#
# Required env:
#   BASE_URL          (e.g. https://offerflow-server-staging.onrender.com)
#   WS_URL            (e.g. wss://offerflow-server-staging.onrender.com/api/v1/interviews/ws)
#   USERS_FILE        path to the ndjson produced by `lib/seed.js` (must have ≥2 rows)
#
# Optional env:
#   METRICS_TOKEN     bearer token for /metrics if the server enforces one
#   PROM_OUT          set to remote-write endpoint (e.g. http://localhost:9090/api/v1/write)
#                     to push k6 metrics live into Prometheus
#   STAGE             skip slow stages: STAGE=quick|standard|full (default standard)
#
# Failure mode: any test that breaches its thresholds exits non-zero. We
# stash all per-test summaries under loadtest/results/<timestamp>/.

set -euo pipefail

cd "$(dirname "$0")"

: "${BASE_URL:?BASE_URL required}"
: "${WS_URL:?WS_URL required}"
: "${USERS_FILE:?USERS_FILE required (run lib/seed.js first)}"
STAGE="${STAGE:-standard}"
METRICS_TOKEN="${METRICS_TOKEN:-}"
PROM_OUT="${PROM_OUT:-}"

stamp="$(date +%Y%m%d-%H%M%S)"
out="results/$stamp"
mkdir -p "$out"
echo "[run-all] writing summaries to $out"

k6_run() {
  local name="$1"; shift
  local script="k6/$1"; shift
  echo
  echo "──────────────────────────────────────────────────────────────────────"
  echo " ▶ $name  ($script)"
  echo "──────────────────────────────────────────────────────────────────────"
  local extra=()
  if [[ -n "$PROM_OUT" ]]; then
    extra+=(--out "experimental-prometheus-rw=$PROM_OUT")
  fi
  set +e
  k6 run \
    --summary-export "$out/${name}.json" \
    -e "BASE_URL=$BASE_URL" \
    -e "WS_URL=$WS_URL" \
    -e "USERS_FILE=$USERS_FILE" \
    -e "METRICS_TOKEN=$METRICS_TOKEN" \
    "${extra[@]}" \
    "$@" \
    "$script" \
    | tee "$out/${name}.log"
  local rc=${PIPESTATUS[0]}
  set -e
  echo "$rc" > "$out/${name}.rc"
  if [[ "$rc" -ne 0 ]]; then
    echo "[run-all] $name FAILED (rc=$rc) — continuing to gather signal"
  else
    echo "[run-all] $name OK"
  fi
}

# T0: smoke-test that the metrics endpoint exposes everything we depend on
k6_run T0_metrics metrics-scrape.js

# T1: REST baseline (5m read+write + stress ramp tail)
k6_run T1_rest_load rest-load.js -e DURATION=5m -e READ_RPS=20 -e WRITE_RPS=4

# T8/T9: DB stress (writes ramp + leaderboard hammer)
k6_run T8_db_stress db-stress.js

# T3: Auth (bcrypt pressure)
[[ "$STAGE" == "quick" ]] || k6_run T3_auth_stress auth-stress.js

# T4: Full WS interview sim (CONNS=20 — small footprint by default; raise for staging)
k6_run T4_ws_interview ws-interview.js -e CONNS="${CONNS:-20}" -e SESSION_SECS="${SESSION_SECS:-60}" -e HOLD="${HOLD:-2m}"

# T6b: F14 per-IP cap verification (fast)
k6_run T6b_ws_cap ws-cap.js -e PER_IP_LIMIT="${PER_IP_LIMIT:-10}" -e ATTEMPT="${ATTEMPT:-15}"

# T6: Spike — controlled overload
[[ "$STAGE" == "quick" ]] || k6_run T6_ws_spike ws-spike.js -e PEAK="${PEAK:-100}"

# T10: F12 code-execution breaker
k6_run T10_code_exec code-exec.js

# T12-14: Security (~10 min)
k6_run T12_security security.js

# T7: Long-running soak (run last; heavy)
if [[ "$STAGE" == "full" ]]; then
  k6_run T7_ws_soak ws-soak.js -e VUS="${VUS:-50}" -e SOAK_MIN="${SOAK_MIN:-30}"
fi

# Aggregate verdict
echo
echo "═══════════════════════ run summary ═══════════════════════"
fail=0
for rc_file in "$out"/*.rc; do
  test=$(basename "$rc_file" .rc)
  rc=$(cat "$rc_file")
  if [[ "$rc" -eq 0 ]]; then
    printf '  %-22s OK\n' "$test"
  else
    printf '  %-22s FAIL (rc=%s)\n' "$test" "$rc"
    fail=$((fail + 1))
  fi
done
echo "═══════════════════════════════════════════════════════════"
if [[ "$fail" -ne 0 ]]; then
  echo "[run-all] $fail tests failed — see $out/*.log"
  exit 1
fi
echo "[run-all] all tests passed"
