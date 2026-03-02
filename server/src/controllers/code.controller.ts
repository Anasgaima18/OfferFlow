import { Request, Response, NextFunction } from 'express';
import { CodeService } from '../services/code.service';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import { BaseController } from './BaseController';

export class CodeController extends BaseController {
    constructor(private readonly codeService: CodeService) {
        super();
    }

    execute = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const { language, code } = req.body;

        if (!code) {
            throw new AppError('No code provided', 400);
        }

        const userId = req.user?.id as string | undefined;
        const output = await this.codeService.executeCode(language || 'javascript', code, userId);

        this.handleSuccess(res, { output }, 'Code executed successfully');
    });
}
