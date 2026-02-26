import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/appError';
import { catchAsync } from '../utils/catchAsync';
import { authService } from '../services/auth.service';
import { env } from '../config/env';

export const protect = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // 1) Get token and check if it's there
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return next(new AppError('You are not logged in! Please log in to get access.', 401));
    }

    // 2) Verify token — catch invalid/expired tokens explicitly
    let decoded: { id: string };
    try {
        decoded = jwt.verify(token, env.JWT_SECRET) as { id: string };
    } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
            return next(new AppError('Your token has expired. Please log in again.', 401));
        }
        return next(new AppError('Invalid token. Please log in again.', 401));
    }

    // 3) Check if user still exists
    const currentUser = await authService.getUserById(decoded.id);
    if (!currentUser) {
        return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    // GRANT ACCESS TO PROTECTED ROUTE
    req.user = currentUser;
    next();
});
