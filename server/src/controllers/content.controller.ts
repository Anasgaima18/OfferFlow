import { Request, Response, NextFunction } from 'express';
import { BaseController } from './BaseController';
import { catchAsync } from '../utils/catchAsync';
import { ContentService } from '../services/content.service';
import { AppError } from '../utils/appError';

export class ContentController extends BaseController {
    constructor(private readonly contentService: ContentService) {
        super();
    }

    getQuestions = catchAsync(async (req: Request, res: Response, _next: NextFunction) => {
        const payload = this.contentService.getQuestions({
            search: req.query.search as string | undefined,
            difficulty: req.query.difficulty as string | undefined,
            category: req.query.category as string | undefined,
            page: req.query.page ? Number(req.query.page) : undefined,
            pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
        });

        this.handleSuccess(res, payload, 'Question bank retrieved successfully');
    });

    getDailyChallenge = catchAsync(async (_req: Request, res: Response, _next: NextFunction) => {
        this.handleSuccess(res, this.contentService.getDailyChallenge(), 'Daily challenge retrieved successfully');
    });

    reviewResume = catchAsync(async (req: Request, res: Response, _next: NextFunction) => {
        if (!req.file) {
            throw new AppError('Resume file is required', 400);
        }
        const result = await this.contentService.reviewResume(req.file, req.user!.id);
        this.handleSuccess(res, result, 'Resume reviewed successfully');
    });
}