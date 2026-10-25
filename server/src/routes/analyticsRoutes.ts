import { Router } from 'express';
import { getInstitutionalAnalytics } from '../controllers/analyticsController.js';
import { authenticate, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// Analytics restricted to Dept Head, Core Team, System Admin
router.get('/', authenticate, requireRole(['dept_head', 'core_team', 'system_admin']), getInstitutionalAnalytics);

export default router;
