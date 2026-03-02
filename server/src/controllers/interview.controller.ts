import { Request, Response, NextFunction } from 'express';
import { InterviewService } from '../services/interview.service';
import { FeedbackService } from '../services/feedback.service';
import { CreateInterviewSchema } from '../models/Interview';
import { AppError } from '../utils/appError';
import { BaseController } from './BaseController';
import { catchAsync } from '../utils/catchAsync';
import { ElevenLabsService } from '../services/elevenlabs.service';

export class InterviewController extends BaseController {
    constructor(
        private readonly interviewService: InterviewService,
        private readonly elevenLabsService: ElevenLabsService,
        private readonly feedbackService: FeedbackService
    ) {
        super();
    }

    getAllInterviews = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.user!.id as string;
        const interviews = await this.interviewService.getAllInterviews(userId);

        this.handleSuccess(res, { interviews }, 'Interviews retrieved successfully');
    });

    createInterview = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const validatedData = CreateInterviewSchema.parse(req.body);

        const interview = await this.interviewService.createInterview({
            ...validatedData,
            user_id: req.user!.id as string
        });

        this.handleSuccess(res, { interview }, 'Interview created successfully', 201);
    });

    getInterviewById = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const interviewId = req.params.id as string;
        const interview = await this.interviewService.getInterviewById(interviewId);

        if (!interview) {
            throw new AppError('Interview not found', 404);
        }

        if (interview.user_id !== req.user!.id) {
            throw new AppError('Not authorized to access this interview', 403);
        }

        this.handleSuccess(res, { interview }, 'Interview retrieved successfully');
    });

    updateInterview = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const interviewId = req.params.id as string;
        const interview = await this.interviewService.getInterviewById(interviewId);

        if (!interview) {
            throw new AppError('Interview not found', 404);
        }

        if (interview.user_id !== req.user!.id) {
            throw new AppError('Not authorized to modify this interview', 403);
        }

        // Only allow updating specific fields
        const allowedUpdates = {
            score: req.body.score,
            feedback: req.body.feedback,
            status: req.body.status
        };

        const updatedInterview = await this.interviewService.updateInterview(interviewId, allowedUpdates);

        this.handleSuccess(res, { interview: updatedInterview }, 'Interview updated successfully');
    });

    getFeedback = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const interviewId = req.params.id as string;
        const interview = await this.interviewService.getInterviewById(interviewId);

        if (!interview) {
            throw new AppError('No interview found with that ID', 404);
        }

        if (interview.user_id !== req.user!.id) {
            throw new AppError('You do not have permission to access this interview', 403);
        }

        const feedback = await this.feedbackService.generateFeedback(interviewId);

        this.handleSuccess(res, { feedback, interview }, 'Feedback retrieved successfully');
    });

    getTranscript = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const interviewId = req.params.id as string;
        const interview = await this.interviewService.getInterviewById(interviewId);

        if (!interview) {
            throw new AppError('Interview not found', 404);
        }

        if (interview.user_id !== req.user!.id) {
            throw new AppError('Not authorized to access this transcript', 403);
        }

        const messages = await this.interviewService.getTranscript(interviewId);

        this.handleSuccess(res, { messages }, 'Transcript retrieved successfully');
    });

    addTranscriptMessage = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const interviewId = req.params.id as string;
        const interview = await this.interviewService.getInterviewById(interviewId);

        if (!interview) {
            throw new AppError('Interview not found', 404);
        }

        if (interview.user_id !== req.user!.id) {
            throw new AppError('Not authorized to modify this transcript', 403);
        }

        const { role, content } = req.body;

        if (!role || !content) {
            throw new AppError('Role and content are required', 400);
        }

        if (role !== 'user' && role !== 'ai') {
            throw new AppError('Role must be user or ai', 400);
        }

        const message = await this.interviewService.addTranscriptMessage(
            interviewId,
            role,
            content
        );

        this.handleSuccess(res, { message }, 'Message added successfully', 201);
    });

    getTTSAudio = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const { text, type } = req.body;

        if (!text) {
            throw new AppError('Text is required', 400);
        }

        const audioBuffer = await this.elevenLabsService.generateSpeech(text, type as string);

        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioBuffer.length.toString(),
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });

        res.status(200).send(audioBuffer);
    });

    getUserStats = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.user!.id as string;
        const stats = await this.interviewService.getUserStats(userId);
        
        this.handleSuccess(res, { stats }, 'User stats retrieved successfully');
    });

    getLeaderboard = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const limitStr = req.query.limit as string;
        const limit = limitStr ? parseInt(limitStr, 10) : 10;
        
        const leaderboard = await this.interviewService.getLeaderboard(limit);
        
        this.handleSuccess(res, { leaderboard }, 'Leaderboard retrieved successfully');
    });
}
