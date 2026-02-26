import { Request, Response, NextFunction } from 'express';
import { codeService } from '../services/code.service';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';

export class CodeController {
    execute = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const { language, code } = req.body;

        if (!code) {
            return next(new AppError('No code provided', 400));
        }

        const userId = req.user?.id;
        const output = await codeService.executeCode(language || 'javascript', code, userId);

        res.status(200).json({
            success: true,
            output
        });
    });
}

export const codeController = new CodeController();
