import { Router } from 'express';
import { getAssessments, createAssessment } from '../controllers/assessmentController.js';
import { authenticate, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', authenticate, getAssessments);
router.post('/', authenticate, requireRole(['core_team', 'dept_head', 'system_admin']), createAssessment);

export default router;
