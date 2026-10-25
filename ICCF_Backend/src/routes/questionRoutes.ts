import { Router } from 'express';
import {
  getQuestions,
  getQuestionBankStats,
  submitQuestion,
  updateQuestion,
  deleteQuestion,
  approveQuestion,
  rejectQuestion,
  previewImportQuestions,
  commitImportQuestions,
} from '../controllers/questionController.js';
import { authenticate, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// Read questions (Authenticated)
router.get('/', authenticate, getQuestions);

// Question Bank Statistics (Admin only)
router.get('/stats', authenticate, requireRole(['core_team', 'system_admin']), getQuestionBankStats);

// Submit new question (Faculty / Admin)
router.post('/', authenticate, submitQuestion);

// Update question (Admin only)
router.put('/:id', authenticate, requireRole(['core_team', 'system_admin']), updateQuestion);

// Delete / Retire question (Admin only)
router.delete('/:id', authenticate, requireRole(['core_team', 'system_admin']), deleteQuestion);

// Question Moderation (Dept Head / Core Team / System Admin)
router.patch('/:id/approve', authenticate, requireRole(['dept_head', 'core_team', 'system_admin']), approveQuestion);
router.patch('/:id/reject', authenticate, requireRole(['dept_head', 'core_team', 'system_admin']), rejectQuestion);

// Admin-Only Bulk Import Workflow (Dry-run preview & transactional commit)
router.post('/import/preview', authenticate, requireRole(['core_team', 'system_admin']), previewImportQuestions);
router.post('/import/commit', authenticate, requireRole(['core_team', 'system_admin']), commitImportQuestions);

export default router;
