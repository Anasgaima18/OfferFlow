import { BrowserAgent } from '@newrelic/browser-agent/loaders/browser-agent';
import { GenericEvents } from '@newrelic/browser-agent/features/generic_events';
import { JSErrors } from '@newrelic/browser-agent/features/jserrors';
import { Metrics } from '@newrelic/browser-agent/features/metrics';
import { SoftNav } from '@newrelic/browser-agent/features/soft_navigations';
import env from '../config/env';

type BrowserCustomAttributes = Record<string, string | number | boolean>;

type NewRelicBrowserApi = {
    addPageAction?: (name: string, attributes?: BrowserCustomAttributes) => void;
    noticeError?: (error: unknown, customAttributes?: BrowserCustomAttributes) => void;
    setCustomAttribute?: (key: string, value: string | number | boolean, persist?: boolean) => void;
    setUserId?: (userId: string | null) => void;
};

declare global {
    interface Window {
        newrelic?: NewRelicBrowserApi;
    }
}

let initialized = false;

const normalizeAttributes = (attributes?: Record<string, unknown>): BrowserCustomAttributes | undefined => {
    if (!attributes) {
        return undefined;
    }

    const normalized: BrowserCustomAttributes = {};

    for (const [key, value] of Object.entries(attributes)) {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            normalized[key] = value;
        }
    }

    return Object.keys(normalized).length > 0 ? normalized : undefined;
};

const hasRequiredBrowserKeys = (): boolean => {
    return [
        env.NEW_RELIC_ACCOUNT_ID,
        env.NEW_RELIC_TRUST_KEY || env.NEW_RELIC_ACCOUNT_ID,
        env.NEW_RELIC_AGENT_ID,
        env.NEW_RELIC_LICENSE_KEY,
        env.NEW_RELIC_APPLICATION_ID,
    ].every((token) => token.length > 0);
};

export const initNewRelicBrowser = (): void => {
    if (initialized || !env.NEW_RELIC_ENABLED) {
        return;
    }

    if (!hasRequiredBrowserKeys()) {
        console.warn('New Relic browser is enabled but required VITE_NEW_RELIC_* keys are missing.');
        return;
    }

    const options = {
        init: {
            distributed_tracing: {
                enabled: true,
                cors_use_tracecontext_headers: true,
                cors_use_newrelic_header: true,
                allowed_origins: env.NEW_RELIC_DISTRIBUTED_TRACING_ORIGINS,
            },
            privacy: {
                cookies_enabled: true,
            },
            ajax: {
                deny_list: ['bam-cell.nr-data.net'],
            },
        },
        info: {
            beacon: env.NEW_RELIC_BEACON,
            errorBeacon: env.NEW_RELIC_ERROR_BEACON,
            licenseKey: env.NEW_RELIC_LICENSE_KEY,
            applicationID: env.NEW_RELIC_APPLICATION_ID,
            sa: 1,
        },
        loader_config: {
            accountID: env.NEW_RELIC_ACCOUNT_ID,
            trustKey: env.NEW_RELIC_TRUST_KEY || env.NEW_RELIC_ACCOUNT_ID,
            agentID: env.NEW_RELIC_AGENT_ID,
            licenseKey: env.NEW_RELIC_LICENSE_KEY,
            applicationID: env.NEW_RELIC_APPLICATION_ID,
        },
        features: [Metrics, JSErrors, GenericEvents, SoftNav],
    };

    new BrowserAgent(options);
    initialized = true;
    trackPageAction('BrowserAgentInitialized', {
        mode: import.meta.env.MODE,
    });
};

export const trackPageAction = (name: string, attributes?: Record<string, unknown>): void => {
    const normalized = normalizeAttributes(attributes);
    window.newrelic?.addPageAction?.(name, normalized);
};

export const noticeBrowserError = (error: unknown, attributes?: Record<string, unknown>): void => {
    const normalized = normalizeAttributes(attributes);
    window.newrelic?.noticeError?.(error, normalized);
};

export const setBrowserUserId = (userId: string | null): void => {
    window.newrelic?.setUserId?.(userId);
};

export const setBrowserAttribute = (
    key: string,
    value: string | number | boolean,
    persist = false
): void => {
    window.newrelic?.setCustomAttribute?.(key, value, persist);
};
