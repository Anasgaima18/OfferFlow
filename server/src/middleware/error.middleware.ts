import { Request, Response, NextFunction } from 'express';
import apm from '../observability/apm';
import { AppError } from '../utils/appError';
import { Logger } from '../utils/logger';
import { config } from '../config/env';

export const globalErrorHandler = (
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
) => {
    const isAppError = err instanceof AppError;
    const statusCode = isAppError ? err.statusCode : 500;
    const status = isAppError ? err.status : 'error';

    // Log the error
    Logger.error(`[${req.method}] ${req.url} - ${err.message}`, err);

    apm.recordCustomEvent('ApiError', {
        method: req.method,
        path: req.originalUrl,
        statusCode,
        isOperational: isAppError ? err.isOperational : false,
        userId: req.user?.id ?? 'anonymous',
    });

    if (statusCode >= 500 || !isAppError) {
        apm.noticeError(err, {
            method: req.method,
            path: req.originalUrl,
            statusCode,
            userId: req.user?.id ?? 'anonymous',
        });
    }

    if (config.NODE_ENV === 'development') {
        return res.status(statusCode).json({
            success: false,
            status,
            error: err,
            message: err.message,
            stack: err.stack
        });
    }

    // Production: Don't leak stack traces
    if (isAppError && err.isOperational) {
        return res.status(statusCode).json({
            success: false,
            status,
            message: err.message
        });
    }

    // Programming or other unknown error: don't leak details
    return res.status(500).json({
        success: false,
        status: 'error',
        message: 'Something went very wrong!'
    });
};
