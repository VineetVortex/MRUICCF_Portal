import { Router } from 'express';
import {
  submitAssessmentAttempt,
  getAllAttempts,
  getUserAttempts,
  getAttemptById,
} from '../controllers/attemptController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { submissionRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/', authenticate, submissionRateLimiter, submitAssessmentAttempt);
router.get('/', authenticate, getAllAttempts);
router.get('/user/:userId', authenticate, getUserAttempts);
router.get('/:id', authenticate, getAttemptById);

export default router;
