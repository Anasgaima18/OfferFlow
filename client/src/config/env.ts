const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
    if (value === 'true') {
        return true;
    }

    if (value === 'false') {
        return false;
    }

    return fallback;
};

const parseCsv = (value: string | undefined): string[] => {
    if (!value) {
        return [];
    }

    return value
        .split(',')
        .map((token) => token.trim())
        .filter((token) => token.length > 0);
};

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const wsUrl =
    import.meta.env.VITE_WS_URL ||
    `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:5000/api/v1/interviews/ws`;

const defaultTracingOrigin = (() => {
    try {
        return new URL(apiUrl).origin;
    } catch {
        return 'http://localhost:5000';
    }
})();

const tracingOriginsFromEnv = parseCsv(import.meta.env.VITE_NEW_RELIC_DISTRIBUTED_TRACING_ORIGINS);

const env = {
    API_URL: apiUrl,
    WS_URL: wsUrl,
    NEW_RELIC_ENABLED: parseBoolean(import.meta.env.VITE_NEW_RELIC_ENABLED, false),
    NEW_RELIC_ACCOUNT_ID: import.meta.env.VITE_NEW_RELIC_ACCOUNT_ID || '',
    NEW_RELIC_TRUST_KEY: import.meta.env.VITE_NEW_RELIC_TRUST_KEY || '',
    NEW_RELIC_AGENT_ID: import.meta.env.VITE_NEW_RELIC_AGENT_ID || '',
    NEW_RELIC_LICENSE_KEY: import.meta.env.VITE_NEW_RELIC_LICENSE_KEY || '',
    NEW_RELIC_APPLICATION_ID: import.meta.env.VITE_NEW_RELIC_APPLICATION_ID || '',
    NEW_RELIC_BEACON: import.meta.env.VITE_NEW_RELIC_BEACON || 'bam.nr-data.net',
    NEW_RELIC_ERROR_BEACON: import.meta.env.VITE_NEW_RELIC_ERROR_BEACON || 'bam.nr-data.net',
    NEW_RELIC_DISTRIBUTED_TRACING_ORIGINS:
        tracingOriginsFromEnv.length > 0 ? tracingOriginsFromEnv : [defaultTracingOrigin],
} as const;

export default env;
