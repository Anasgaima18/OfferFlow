import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/appError';
import { catchAsync } from '../utils/catchAsync';
import { authService } from '../services/auth.service';

export const protect = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // 1) Get token and check if it's there
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return next(new AppError('You are not logged in! Please log in to get access.', 401));
    }

    // 2) Verification token
    if (!process.env.JWT_SECRET) {
        return next(new AppError('Server configuration error: JWT_SECRET is not set', 500));
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { id: string };

    // 3) Check if user still exists
    const currentUser = await authService.getUserById(decoded.id);
    if (!currentUser) {
        return next(new AppError('The user belonging to this token no longer does exist.', 401));
    }

    // GRANT ACCESS TO PROTECTED ROUTE
    req.user = currentUser;
    next();
});
