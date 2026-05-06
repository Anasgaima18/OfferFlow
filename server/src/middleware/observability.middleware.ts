import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import apm from '../observability/apm';

const toPathWithoutQuery = (url: string): string => url.split('?')[0] ?? url;

const toAttributeValue = (value: unknown): string | number | boolean => {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }

    if (value === null || value === undefined) {
        return '';
    }

    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
};

export const enrichNewRelicRequest = (req: Request, res: Response, next: NextFunction): void => {
    const startedAtNs = process.hrtime.bigint();
    const headerRequestId = req.headers['x-request-id'];
    const requestId =
        typeof headerRequestId === 'string' && headerRequestId.trim().length > 0
            ? headerRequestId
            : crypto.randomUUID();

    res.setHeader('x-request-id', requestId);

    apm.addCustomAttributes({
        requestId,
        requestPath: toPathWithoutQuery(req.originalUrl),
        requestMethod: req.method,
        userAgent: toAttributeValue(req.get('user-agent') ?? 'unknown'),
    });

    res.on('finish', () => {
        const durationNs = process.hrtime.bigint() - startedAtNs;
        const durationMs = Number(durationNs) / 1_000_000;

        apm.recordCustomEvent('ApiRequest', {
            requestId,
            method: req.method,
            path: toPathWithoutQuery(req.originalUrl),
            statusCode: res.statusCode,
            durationMs: Number(durationMs.toFixed(2)),
            userId: req.user?.id ?? 'anonymous',
        });
    });

    next();
};