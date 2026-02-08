import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';
import { Logger } from '../utils/logger';

export const globalErrorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // Log the error
    Logger.error(`[${req.method}] ${req.url} - ${err.message}`, err);

    if (process.env.NODE_ENV === 'development') {
        return res.status(err.statusCode).json({
            success: false,
            status: err.status,
            error: err,
            message: err.message,
            stack: err.stack
        });
    }

    // Production: Don't leak stack traces
    if (err.isOperational) {
        return res.status(err.statusCode).json({
            success: false,
            status: err.status,
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
