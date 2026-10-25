import { Router } from 'express';
import {
  submitAssessmentAttempt,
  getUserAttempts,
  getAttemptById,
} from '../controllers/attemptController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { submissionRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/', authenticate, submissionRateLimiter, submitAssessmentAttempt);
router.get('/user/:userId', authenticate, getUserAttempts);
router.get('/:id', authenticate, getAttemptById);

export default router;
