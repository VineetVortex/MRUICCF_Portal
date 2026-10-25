import { Router } from 'express';
import { getAuditLogs } from '../controllers/auditController.js';
import { authenticate, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// Audit logs restricted to Core Team and System Admin
router.get('/', authenticate, requireRole(['core_team', 'system_admin']), getAuditLogs);

export default router;
