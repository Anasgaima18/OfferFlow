import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import apm from '../observability/apm';
import { AppError } from '../utils/appError';
import { catchAsync } from '../utils/catchAsync';
import { AuthService } from '../services/auth.service';
import { config } from '../config/env';
import { getCachedUser, setCachedUser } from '../utils/userCache';

/**
 * F4: Cache user lookup so we don't hit Supabase on every authenticated
 * request. Cache TTL is 60s (configurable via USER_CACHE_TTL_MS) — short
 * enough that profile updates / account deletion propagate quickly, long
 * enough that a busy dashboard tab no longer pegs Supabase REST.
 *
 * On profile update or logout, callers should call `invalidateCachedUser(id)`.
 */
export const protect = (authService: AuthService) => catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        apm.recordCustomEvent('AuthFailure', {
            reason: 'missing-token',
            path: req.originalUrl,
            method: req.method,
        });
        return next(new AppError('You are not logged in! Please log in to get access.', 401));
    }

    let decoded: { id: string };
    try {
        decoded = jwt.verify(token, config.JWT_SECRET) as { id: string };
    } catch (appTokenError) {
        if (config.SUPABASE_JWT_SECRET) {
            try {
                const supabaseDecoded = jwt.verify(token, config.SUPABASE_JWT_SECRET) as { sub?: string };
                if (!supabaseDecoded.sub) {
                    throw new AppError('Invalid Supabase token payload', 401);
                }
                decoded = { id: supabaseDecoded.sub };
            } catch (supabaseTokenError) {
                if (supabaseTokenError instanceof jwt.TokenExpiredError) {
                    apm.recordCustomEvent('AuthFailure', {
                        reason: 'token-expired',
                        path: req.originalUrl,
                        method: req.method,
                    });
                    return next(new AppError('Your token has expired. Please log in again.', 401));
                }
                apm.recordCustomEvent('AuthFailure', {
                    reason: 'invalid-token',
                    path: req.originalUrl,
                    method: req.method,
                });
                return next(new AppError('Invalid token. Please log in again.', 401));
            }
        } else {
            if (appTokenError instanceof jwt.TokenExpiredError) {
                apm.recordCustomEvent('AuthFailure', {
                    reason: 'token-expired',
                    path: req.originalUrl,
                    method: req.method,
                });
                return next(new AppError('Your token has expired. Please log in again.', 401));
            }
            apm.recordCustomEvent('AuthFailure', {
                reason: 'invalid-token',
                path: req.originalUrl,
                method: req.method,
            });
            return next(new AppError('Invalid token. Please log in again.', 401));
        }
    }

    let currentUser = getCachedUser(decoded.id);

    if (!currentUser) {
        const fetched = await authService.getUserById(decoded.id);
        if (!fetched) {
            apm.recordCustomEvent('AuthFailure', {
                reason: 'user-not-found',
                path: req.originalUrl,
                method: req.method,
                userId: decoded.id,
            });
            return next(new AppError('The user belonging to this token no longer exists.', 401));
        }
        setCachedUser(fetched);
        currentUser = fetched;
    }

    req.user = currentUser;
    apm.setUserID(currentUser.id);
    apm.addCustomAttributes({
        userId: currentUser.id,
        authProvider: currentUser.auth_provider ?? 'local',
    });
    apm.recordCustomEvent('AuthSuccess', {
        userId: currentUser.id,
        path: req.originalUrl,
        method: req.method,
    });
    next();
});
