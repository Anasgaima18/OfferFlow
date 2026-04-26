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

        // F12: propagate client-disconnect to the upstream Piston call so a
        // worker isn't blocked on a request whose client already gave up.
        const abort = new AbortController();
        req.on('close', () => {
            if (!res.writableEnded) abort.abort();
        });

        const userId = req.user?.id as string | undefined;
        const output = await this.codeService.executeCode(language || 'javascript', code, userId, abort.signal);

        this.handleSuccess(res, { output }, 'Code executed successfully');
    });
}
