import { Router } from 'express';
import {
  submitAssessmentAttempt,
  getAllAttempts,
  getUserAttempts,
  getAttemptById,
  startOrResumeAttempt,
  getActiveAttempt,
  autosaveAttempt,
  logIntegrityEvent,
  finalizeAttempt,
} from '../controllers/attemptController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { submissionRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Phase 2.1 & 2.2: Authoritative session start/resume
router.post('/start', authenticate, startOrResumeAttempt);

// Phase 2.4: Active attempt discovery for students (Resume button)
router.get('/active', authenticate, getActiveAttempt);

// Phase 2.3: Real-time answer autosave
router.patch('/:id/autosave', authenticate, autosaveAttempt);

// Phase 3: Tab switch & fullscreen integrity monitor
router.post('/:id/integrity-event', authenticate, logIntegrityEvent);

// Phase 2.6: Authoritative idempotent finalization
router.post('/:id/finalize', authenticate, submissionRateLimiter, finalizeAttempt);

// Legacy and administrative retrieval routes
router.post('/', authenticate, submissionRateLimiter, submitAssessmentAttempt);
router.get('/', authenticate, getAllAttempts);
router.get('/user/:userId', authenticate, getUserAttempts);
router.get('/:id', authenticate, getAttemptById);

export default router;

