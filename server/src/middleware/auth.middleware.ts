import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import newrelic from 'newrelic';
import { AppError } from '../utils/appError';
import { catchAsync } from '../utils/catchAsync';
import { AuthService } from '../services/auth.service';
import { config } from '../config/env';

export const protect = (authService: AuthService) => catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // 1) Get token and check if it's there
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        newrelic.recordCustomEvent('AuthFailure', {
            reason: 'missing-token',
            path: req.originalUrl,
            method: req.method,
        });
        return next(new AppError('You are not logged in! Please log in to get access.', 401));
    }

    // 2) Verify token — catch invalid/expired tokens explicitly
    let decoded: { id: string };
    try {
        decoded = jwt.verify(token, config.JWT_SECRET) as { id: string };
    } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
            newrelic.recordCustomEvent('AuthFailure', {
                reason: 'token-expired',
                path: req.originalUrl,
                method: req.method,
            });
            return next(new AppError('Your token has expired. Please log in again.', 401));
        }
        newrelic.recordCustomEvent('AuthFailure', {
            reason: 'invalid-token',
            path: req.originalUrl,
            method: req.method,
        });
        return next(new AppError('Invalid token. Please log in again.', 401));
    }

    // 3) Check if user still exists
    const currentUser = await authService.getUserById(decoded.id);
    if (!currentUser) {
        newrelic.recordCustomEvent('AuthFailure', {
            reason: 'user-not-found',
            path: req.originalUrl,
            method: req.method,
            userId: decoded.id,
        });
        return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    // GRANT ACCESS TO PROTECTED ROUTE
    req.user = currentUser;
    newrelic.setUserID(currentUser.id);
    newrelic.addCustomAttributes({
        userId: currentUser.id,
        authProvider: currentUser.auth_provider ?? 'local',
    });
    newrelic.recordCustomEvent('AuthSuccess', {
        userId: currentUser.id,
        path: req.originalUrl,
        method: req.method,
    });
    next();
});
