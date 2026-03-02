import { Response } from 'express';
import * as Sentry from '@sentry/node';
import { Logger } from '../utils/logger';

export abstract class BaseController {
    /**
     * Standardized success response handler
     */
    protected handleSuccess(res: Response, data: any, message?: string, statusCode: number = 200): void {
        res.status(statusCode).json({
            success: true,
            message,
            data
        });
    }

    /**
     * Standardized error response handler capturing exception via Sentry
     */
    protected handleError(error: any, res: Response, methodName: string, statusCode: number = 500): void {
        Sentry.captureException(error);
        Logger.error(`[${this.constructor.name}.${methodName}] Error: ${error.message || String(error)}`);
        
        res.status(statusCode).json({
            success: false,
            message: error.message || 'Internal Server Error'
        });
    }
}
