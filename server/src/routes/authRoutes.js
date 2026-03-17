import { Router } from 'express';
import { login, me, requestPasswordReset, resetPassword } from '../controllers/authController.js';
import { authRequired } from '../middleware/auth.js';
import { authRateLimiter, passwordResetRateLimiter } from '../middleware/rateLimiters.js';

const router = Router();

router.post('/login', authRateLimiter, login);
router.post('/password-reset/request', passwordResetRateLimiter, requestPasswordReset);
router.post('/password-reset/confirm', passwordResetRateLimiter, resetPassword);
router.get('/me', authRequired, me);

export default router;
