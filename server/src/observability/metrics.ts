import client from 'prom-client';

/**
 * Phase 5 — Server-side Prometheus metrics.
 *
 * Exposed at GET /metrics. Local dev: scrape with the Prometheus container
 * in loadtest/docker-compose.observability.yml. Production: scrape from your
 * Render service (or push via remote-write).
 */

export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry, prefix: 'offerflow_' });

// ── HTTP ───────────────────────────────────────────────────────────────────
export const httpDuration = new client.Histogram({
    name: 'offerflow_http_request_duration_ms',
    help: 'HTTP request duration in milliseconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 30000],
    registers: [registry],
});

// ── Supabase / DB ──────────────────────────────────────────────────────────
export const supabaseQueryDuration = new client.Histogram({
    name: 'offerflow_supabase_query_ms',
    help: 'Supabase PostgREST query round-trip time',
    labelNames: ['op', 'table'] as const,
    buckets: [25, 50, 100, 250, 500, 1000, 2500, 5000],
    registers: [registry],
});

export const supabaseQueryErrors = new client.Counter({
    name: 'offerflow_supabase_query_errors_total',
    help: 'Supabase PostgREST query errors',
    labelNames: ['op', 'table', 'code'] as const,
    registers: [registry],
});

// ── WebSocket ──────────────────────────────────────────────────────────────
export const wsActiveConnections = new client.Gauge({
    name: 'offerflow_ws_active_connections',
    help: 'Active interview WebSocket connections',
    registers: [registry],
});

export const wsSessionsTotal = new client.Counter({
    name: 'offerflow_ws_sessions_total',
    help: 'Total WS sessions started',
    labelNames: ['interview_type'] as const,
    registers: [registry],
});

export const wsBufferedAmount = new client.Histogram({
    name: 'offerflow_ws_buffered_amount_bytes',
    help: 'ws.bufferedAmount sampled per safeSend',
    buckets: [1024, 8192, 65536, 262144, 1048576, 4194304, 16777216],
    registers: [registry],
});

export const wsSendDrops = new client.Counter({
    name: 'offerflow_ws_send_drops_total',
    help: 'WS frames dropped by safeSend',
    labelNames: ['kind', 'reason'] as const,
    registers: [registry],
});

export const wsConnectionsByIp = new client.Gauge({
    name: 'offerflow_ws_connections_by_ip',
    help: 'Concurrent WS connections per remote IP (top-N)',
    labelNames: ['ip'] as const,
    registers: [registry],
});

// ── External AI APIs ───────────────────────────────────────────────────────
export const externalApiDuration = new client.Histogram({
    name: 'offerflow_external_api_ms',
    help: 'External AI API round-trip time',
    labelNames: ['service', 'op'] as const,
    buckets: [100, 250, 500, 1000, 2500, 5000, 10000, 30000, 60000],
    registers: [registry],
});

export const externalApiErrors = new client.Counter({
    name: 'offerflow_external_api_errors_total',
    help: 'External AI API failures',
    labelNames: ['service', 'op', 'kind'] as const,
    registers: [registry],
});

export const circuitBreakerState = new client.Gauge({
    name: 'offerflow_circuit_breaker_state',
    help: 'Circuit breaker state: 0=closed, 1=half-open, 2=open',
    labelNames: ['name'] as const,
    registers: [registry],
});

// ── Interview pipeline ─────────────────────────────────────────────────────
export const sttTurnLatency = new client.Histogram({
    name: 'offerflow_stt_turn_latency_ms',
    help: 'Time from first audio chunk to final transcript',
    buckets: [100, 250, 500, 1000, 2500, 5000, 10000, 30000],
    registers: [registry],
});

export const aiResponseLatency = new client.Histogram({
    name: 'offerflow_ai_response_latency_ms',
    help: 'finalize → AI text out',
    buckets: [500, 1000, 2500, 5000, 10000, 30000, 60000, 120000],
    registers: [registry],
});

export const transcriptQueueDepth = new client.Gauge({
    name: 'offerflow_transcript_queue_depth',
    help: 'Pending transcript writes per session (sampled)',
    registers: [registry],
});

export const transcriptDrops = new client.Counter({
    name: 'offerflow_transcript_drops_total',
    help: 'Transcript writes dropped due to queue overflow',
    labelNames: ['reason'] as const,
    registers: [registry],
});

export const userCacheHits = new client.Counter({
    name: 'offerflow_user_cache_hits_total',
    help: 'User lookup cache hits',
    labelNames: ['result'] as const,
    registers: [registry],
});
