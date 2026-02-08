import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { catchAsync } from '../utils/catchAsync';
import { UserSchemaZod } from '../models/User';
import { z } from 'zod';

const LoginSchemaZod = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

export class AuthController {

    signup = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        // 1) Validate Input
        const validatedData = UserSchemaZod.parse(req.body);

        // 2) Call Service
        const { user, token } = await authService.signup(validatedData);

        // 3) Send Response
        res.status(201).json({
            success: true,
            token,
            user
        });
    });

    login = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const validatedData = LoginSchemaZod.parse(req.body);

        const { user, token } = await authService.login(validatedData.email, validatedData.password);

        res.status(200).json({
            success: true,
            token,
            user
        });
    });

    me = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        // req.user is set by the protect middleware
        res.status(200).json({
            success: true,
            user: req.user
        });
    });
}

export const authController = new AuthController();
