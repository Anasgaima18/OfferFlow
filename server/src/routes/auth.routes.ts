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

router.post('/signup', validate(UserSchemaZod), authController.signup);
router.post('/login', authController.login);

// Protect all routes after this middleware
router.use(protect(authService));

router.get('/me', authController.getCurrentUser);

export default router;
