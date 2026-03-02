import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';

export const catchAsync = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch((err) => {
            Sentry.captureException(err);
            next(err);
        });
    };
};
