import express from 'express';
import { InterviewController } from '../controllers/interview.controller';
import { CodeController } from '../controllers/code.controller';
import { protect } from '../middleware/auth.middleware';
import { codeExecLimiter } from '../middleware/rateLimit.middleware';
import { validate } from '../middleware/validate.middleware';
import { CreateInterviewSchema, ExecuteCodeSchema, UpdateInterviewSchema, SpeakSchema } from '../models/Interview';

import { InterviewRepository } from '../repositories/InterviewRepository';
import { InterviewService } from '../services/interview.service';
import { SarvamService } from '../services/sarvam.service';
import { ElevenLabsService } from '../services/elevenlabs.service';
import { FeedbackService } from '../services/feedback.service';
import { CodeService } from '../services/code.service';
import { AuthService } from '../services/auth.service';
import { UserRepository } from '../repositories/UserRepository';

const router = express.Router();

// Dependency Injection Setup
const userRepository = new UserRepository();
const authService = new AuthService(userRepository);

const interviewRepository = new InterviewRepository();
const sarvamService = new SarvamService();
const elevenLabsService = new ElevenLabsService();
const interviewService = new InterviewService(interviewRepository);
const feedbackService = new FeedbackService(interviewService, sarvamService);

const interviewController = new InterviewController(interviewService, elevenLabsService, feedbackService);

const codeService = new CodeService();
const codeController = new CodeController(codeService);

// Protect all routes
router.use(protect(authService));

router.route('/')
    .get(interviewController.getAllInterviews)
    .post(validate(CreateInterviewSchema), interviewController.createInterview);

// Named routes BEFORE /:id to avoid conflicts
router.post('/execute', codeExecLimiter, validate(ExecuteCodeSchema), codeController.execute);
router.post('/speak', validate(SpeakSchema), interviewController.getTTSAudio);
router.get('/stats', interviewController.getUserStats);
router.get('/leaderboard', interviewController.getLeaderboard);

// Parameterized routes
router.get('/:id', interviewController.getInterviewById);
router.patch('/:id', validate(UpdateInterviewSchema), interviewController.updateInterview);
router.get('/:id/feedback', interviewController.getFeedback);
router.get('/:id/transcript', interviewController.getTranscript);

export default router;
