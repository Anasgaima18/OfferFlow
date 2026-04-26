import CircuitBreaker, { Options as CBOptions } from 'opossum';
import { Logger } from './logger';
import { circuitBreakerState, externalApiErrors } from '../observability/metrics';

/**
 * F16: Circuit breaker wrapper for external API calls.
 *
 * Prevents a slow/dead upstream from cascading: every Sarvam chat call won't
 * stack 30s timeouts when the API is degraded. After N failures within the
 * rolling window, the breaker "opens" and fast-fails for `resetTimeout` ms.
 */

export type AsyncFn<TArgs extends unknown[], TResult> = (...args: TArgs) => Promise<TResult>;

export function makeBreaker<TArgs extends unknown[], TResult>(
    name: string,
    fn: AsyncFn<TArgs, TResult>,
    overrides?: Partial<CBOptions>,
    fallback?: AsyncFn<TArgs, TResult>,
): CircuitBreaker<TArgs, TResult> {
    const breaker = new CircuitBreaker<TArgs, TResult>(fn, {
        timeout: 8_000,                  // hard upper bound per attempt
        errorThresholdPercentage: 30,    // open after 30% errors in window
        resetTimeout: 30_000,            // try again after 30s
        rollingCountTimeout: 60_000,
        rollingCountBuckets: 10,
        volumeThreshold: 5,              // need at least 5 calls before opening
        ...overrides,
    });

    if (fallback) breaker.fallback(fallback);

    const resetTimeoutMs = (overrides?.resetTimeout) ?? 30_000;
    breaker.on('open', () => {
        Logger.warn(`[breaker:${name}] OPEN — fast-failing for ${resetTimeoutMs}ms`);
        circuitBreakerState.set({ name }, 2);
    });
    breaker.on('halfOpen', () => {
        Logger.info(`[breaker:${name}] HALF-OPEN — probing`);
        circuitBreakerState.set({ name }, 1);
    });
    breaker.on('close', () => {
        Logger.info(`[breaker:${name}] CLOSED — recovered`);
        circuitBreakerState.set({ name }, 0);
    });
    breaker.on('reject', () => {
        externalApiErrors.inc({ service: name, op: 'breaker', kind: 'rejected' });
    });
    breaker.on('timeout', () => {
        externalApiErrors.inc({ service: name, op: 'breaker', kind: 'timeout' });
    });
    breaker.on('failure', () => {
        externalApiErrors.inc({ service: name, op: 'breaker', kind: 'failure' });
    });

    circuitBreakerState.set({ name }, 0);
    return breaker;
}
