import express from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { UserSchemaZod } from '../models/User';
import { protect } from '../middleware/auth.middleware';
import { authLimiter } from '../middleware/rateLimit.middleware';
import { AuthService } from '../services/auth.service';
import { UserRepository } from '../repositories/UserRepository';

const router = express.Router();

const userRepository = new UserRepository();
const authService = new AuthService(userRepository);
const authController = new AuthController(authService);

router.post('/signup', authLimiter, validate(UserSchemaZod), authController.signup);
router.post('/login', authLimiter, authController.login);
router.get('/oauth/:provider/start', authController.startOAuth);
router.get('/oauth/:provider/callback', authController.oauthCallback);
router.post('/oauth/exchange', authLimiter, authController.exchangeOAuth);

// Protect all routes after this middleware
router.use(protect(authService));

router.get('/me', authController.getCurrentUser);
router.patch('/me', authController.updateCurrentUser);

export default router;
