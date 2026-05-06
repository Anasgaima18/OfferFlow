import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import {
    ForgotPasswordSchemaZod,
    OAuthProviderSchema,
    ResetPasswordSchemaZod,
    UpdateUserSchemaZod,
    UserSchemaZod,
    VerifyEmailSchemaZod,
} from '../models/User';
import { AppError } from '../utils/appError';
import { BaseController } from './BaseController';
import { catchAsync } from '../utils/catchAsync';
import { config } from '../config/env';
import { z } from 'zod';

const LoginSchemaZod = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

const OAuthExchangeSchemaZod = z.object({
    code: z.string().min(1),
});

const ResendVerificationSchemaZod = z.object({
    email: z.string().email('Invalid email address'),
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

    updateCurrentUser = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const updates = UpdateUserSchemaZod.parse(req.body);
        const user = await this.authService.updateProfile(req.user!.id, updates);
        this.handleSuccess(res, { user }, 'Profile updated successfully');
    });

    startOAuth = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const provider = OAuthProviderSchema.parse(req.params.provider);
        const origin = `${req.protocol}://${req.get('host')}`;
        const url = this.authService.buildOAuthAuthorizationUrl(provider, origin);
        res.redirect(url);
    });

    oauthCallback = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const provider = OAuthProviderSchema.parse(req.params.provider);
        const code = req.query.code as string | undefined;
        const state = req.query.state as string | undefined;

        if (!code || !state) {
            throw new AppError('Missing OAuth callback parameters', 400);
        }

        const origin = `${req.protocol}://${req.get('host')}`;
        const exchangeCode = await this.authService.handleOAuthCallback(provider, code, state, origin);
        const clientBaseUrl = ((config.CLIENT_URL || 'http://localhost:5173').split(',')[0] ?? 'http://localhost:5173').trim().replace(/\/$/, '');
        res.redirect(`${clientBaseUrl}/oauth/callback?code=${encodeURIComponent(exchangeCode)}`);
    });

    exchangeOAuth = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const { code } = OAuthExchangeSchemaZod.parse(req.body);
        const result = await this.authService.exchangeOAuthLoginCode(code);
        this.handleSuccess(res, result, 'OAuth login successful');
    });

    verifyEmail = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const { token } = VerifyEmailSchemaZod.parse(req.body);
        const user = await this.authService.verifyEmail(token);
        this.handleSuccess(res, { user }, 'Email verified successfully');
    });

    resendVerification = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const { email } = ResendVerificationSchemaZod.parse(req.body);
        const result = await this.authService.resendVerification(email);
        this.handleSuccess(res, result, 'If the account exists, a verification email has been sent');
    });

    forgotPassword = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const { email } = ForgotPasswordSchemaZod.parse(req.body);
        const result = await this.authService.forgotPassword(email);
        this.handleSuccess(res, result, 'If the account exists, reset instructions have been sent');
    });

    resetPassword = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const { token, password } = ResetPasswordSchemaZod.parse(req.body);
        await this.authService.resetPassword(token, password);
        this.handleSuccess(res, {}, 'Password reset successful');
    });

    deleteCurrentUser = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        await this.authService.deleteAccount(req.user!.id);
        this.handleSuccess(res, {}, 'Account deleted successfully');
    });

    getSupabaseToken = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const token = this.authService.createSupabaseRealtimeToken(req.user!.id);
        this.handleSuccess(res, token, 'Supabase token issued');
    });
}
