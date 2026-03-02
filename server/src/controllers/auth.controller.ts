import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { UserSchemaZod } from '../models/User';
import { AppError } from '../utils/appError';
import { BaseController } from './BaseController';
import { catchAsync } from '../utils/catchAsync';
import { z } from 'zod';

const LoginSchemaZod = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

export class AuthController extends BaseController {
    constructor(private readonly authService: AuthService) {
        super();
    }

    signup = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        // Validate request body
        const validatedData = UserSchemaZod.parse(req.body);

        const result = await this.authService.signup(validatedData);

        this.handleSuccess(res, result, 'User registered successfully', 201);
    });

    login = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const validatedData = LoginSchemaZod.parse(req.body);
        const { email, password } = validatedData;

        const result = await this.authService.login(email, password);

        this.handleSuccess(res, result, 'Logged in successfully');
    });

    getCurrentUser = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const user = await this.authService.getUserById(req.user!.id);
        
        if (!user) {
            throw new AppError('User not found', 404);
        }
        
        this.handleSuccess(res, { user }, 'Current user retrieved');
    });
}
