import express from 'express';
import multer from 'multer';
import { ContentController } from '../controllers/content.controller';
import { ContentService } from '../services/content.service';
import { SarvamService } from '../services/sarvam.service';
import { protect } from '../middleware/auth.middleware';
import { AuthService } from '../services/auth.service';
import { UserRepository } from '../repositories/UserRepository';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const userRepository = new UserRepository();
const authService = new AuthService(userRepository);
const contentController = new ContentController(new ContentService(new SarvamService()));

router.get('/questions', protect(authService), contentController.getQuestions);
router.get('/daily-challenge', protect(authService), contentController.getDailyChallenge);
router.post('/resume-review', protect(authService), upload.single('resume'), contentController.reviewResume);

export default router;