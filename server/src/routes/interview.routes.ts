import express from 'express';
import { interviewController } from '../controllers/interview.controller';
import { codeController } from '../controllers/code.controller';
import { protect } from '../middleware/auth.middleware';
import { codeExecLimiter } from '../middleware/rateLimit.middleware';
import { validate } from '../middleware/validate.middleware';
import { CreateInterviewSchema, ExecuteCodeSchema, UpdateInterviewSchema, SpeakSchema } from '../models/Interview';

const router = express.Router();

// Protect all routes
router.use(protect);

router.route('/')
    .get(interviewController.getAllInterviews)
    .post(validate(CreateInterviewSchema), interviewController.createInterview);

// Named routes BEFORE /:id to avoid conflicts
router.post('/execute', codeExecLimiter, validate(ExecuteCodeSchema), codeController.execute);
router.post('/speak', validate(SpeakSchema), interviewController.speak);
router.get('/stats', interviewController.getStats);
router.get('/leaderboard', interviewController.getLeaderboard);

// Parameterized routes
router.get('/:id', interviewController.getInterview);
router.patch('/:id', validate(UpdateInterviewSchema), interviewController.updateInterview);
router.get('/:id/feedback', interviewController.getFeedback);
router.get('/:id/transcript', interviewController.getTranscript);

export default router;
