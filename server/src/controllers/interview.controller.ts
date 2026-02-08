import { Request, Response, NextFunction } from 'express';
import { interviewService } from '../services/interview.service';
import { feedbackService } from '../services/feedback.service';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import { elevenLabsService } from '../services/elevenlabs.service';

export class InterviewController {

    // Get all interviews for current user
    getAllInterviews = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.user!.id;
        const interviews = await interviewService.getAllInterviews(userId);

        res.status(200).json({
            success: true,
            results: interviews.length,
            data: { interviews }
        });
    });

    // Create a new interview session
    createInterview = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.user!.id;
        const { type } = req.body;

        const interview = await interviewService.createInterview({
            user_id: userId,
            type: type as 'behavioral' | 'technical' | 'system-design'
        });

        res.status(201).json({
            success: true,
            data: { interview }
        });
    });

    // Get single interview
    getInterview = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const interview = await interviewService.getInterviewById(req.params.id as string);

        if (!interview) {
            return next(new AppError('No interview found with that ID', 404));
        }

        // Authorization: verify ownership
        if (interview.user_id !== req.user!.id) {
            return next(new AppError('You do not have permission to access this interview', 403));
        }

        res.status(200).json({
            success: true,
            data: { interview }
        });
    });

    // Update interview (score, feedback, status)
    updateInterview = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        // Authorization: verify ownership before update
        const existing = await interviewService.getInterviewById(req.params.id as string);
        if (!existing) {
            return next(new AppError('No interview found with that ID', 404));
        }
        if (existing.user_id !== req.user!.id) {
            return next(new AppError('You do not have permission to modify this interview', 403));
        }

        const { score, feedback, status } = req.body;

        const interview = await interviewService.updateInterview(req.params.id as string, {
            score,
            feedback,
            status
        });

        res.status(200).json({
            success: true,
            data: { interview }
        });
    });

    // Get user stats
    getStats = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.user!.id;
        const stats = await interviewService.getUserStats(userId);

        res.status(200).json({
            success: true,
            data: stats
        });
    });

    // Get leaderboard
    getLeaderboard = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const limit = parseInt(req.query.limit as string) || 10;
        const leaderboard = await interviewService.getLeaderboard(limit);

        res.status(200).json({
            success: true,
            data: { leaderboard }
        });
    });

    // Get feedback for an interview
    getFeedback = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const interviewId = req.params.id as string;
        const interview = await interviewService.getInterviewById(interviewId);

        if (!interview) {
            return next(new AppError('No interview found with that ID', 404));
        }

        // Authorization: verify ownership
        if (interview.user_id !== req.user!.id) {
            return next(new AppError('You do not have permission to access this interview', 403));
        }

        const feedback = await feedbackService.generateFeedback(interviewId);

        res.status(200).json({
            success: true,
            data: { feedback, interview }
        });
    });

    // Get transcript for an interview
    getTranscript = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const interviewId = req.params.id as string;

        // Authorization: verify ownership
        const interview = await interviewService.getInterviewById(interviewId);
        if (!interview) {
            return next(new AppError('No interview found with that ID', 404));
        }
        if (interview.user_id !== req.user!.id) {
            return next(new AppError('You do not have permission to access this interview', 403));
        }

        const transcript = await interviewService.getTranscript(interviewId);

        res.status(200).json({
            success: true,
            data: { transcript }
        });
    });

    // Text to Speech (ElevenLabs)
    speak = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const { text, voiceId } = req.body;

        if (!text) {
            return next(new AppError('Text is required', 400));
        }

        const audioBuffer = await elevenLabsService.generateSpeech(text, voiceId);

        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioBuffer.length
        });

        res.send(audioBuffer);
    });
}

export const interviewController = new InterviewController();
