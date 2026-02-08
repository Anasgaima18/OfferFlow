import express from 'express';
import { authController } from '../controllers/auth.controller';
import { protect } from '../middleware/auth.middleware';
import { authLimiter } from '../middleware/rateLimit.middleware';

const router = express.Router();

router.post('/signup', authLimiter, authController.signup);
router.post('/login', authLimiter, authController.login);
router.get('/me', protect, authController.me);

export default router;
