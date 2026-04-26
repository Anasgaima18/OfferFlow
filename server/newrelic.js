'use strict';

const parseStatusCodes = (value) => {
    if (!value) {
        return [];
    }

    return value
        .split(',')
        .map((token) => Number(token.trim()))
        .filter((token) => Number.isInteger(token));
};

exports.config = {
    agent_enabled: process.env.NEW_RELIC_ENABLED === 'true',
    app_name: [process.env.NEW_RELIC_APP_NAME || 'OfferFlow-API'],
    license_key: process.env.NEW_RELIC_LICENSE_KEY,
    distributed_tracing: {
        enabled: process.env.NEW_RELIC_DISTRIBUTED_TRACING_ENABLED !== 'false',
    },
    logging: {
        level: process.env.NEW_RELIC_LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
        filepath: process.env.NEW_RELIC_LOG || 'stdout',
    },
    transaction_tracer: {
        enabled: process.env.NEW_RELIC_TRANSACTION_TRACER_ENABLED !== 'false',
    },
    error_collector: {
        enabled: process.env.NEW_RELIC_ERROR_COLLECTOR_ENABLED !== 'false',
        ignore_status_codes: parseStatusCodes(process.env.NEW_RELIC_ERROR_COLLECTOR_IGNORE_STATUS_CODES),
    },
    attributes: {
        enabled: process.env.NEW_RELIC_ATTRIBUTES_ENABLED !== 'false',
        exclude: ['request.headers.cookie', 'request.headers.authorization'],
    },
    application_logging: {
        enabled: process.env.NEW_RELIC_APPLICATION_LOGGING_ENABLED !== 'false',
        forwarding: {
            enabled: process.env.NEW_RELIC_APPLICATION_LOGGING_FORWARDING_ENABLED !== 'false',
        },
        metrics: {
            enabled: process.env.NEW_RELIC_APPLICATION_LOGGING_METRICS_ENABLED !== 'false',
        },
    },
    ai_monitoring: {
        enabled: process.env.NEW_RELIC_AI_MONITORING_ENABLED === 'true',
        record_content: {
            enabled: process.env.NEW_RELIC_AI_MONITORING_RECORD_CONTENT_ENABLED === 'true',
        },
    },
    allow_all_headers: true,
};
