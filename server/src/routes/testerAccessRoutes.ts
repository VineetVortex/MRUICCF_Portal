import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/authMiddleware.js';
import {
  importTesterRoster,
  getTesterRoster,
  issueTesterInvitation,
  revokeTesterInvitation,
  getTesterAccessEvents,
  redeemTesterInvitation,
  getTesterAccessStatus
} from '../controllers/testerAccessController.js';

const router = Router();

// ==========================================
// Admin Tester Management Endpoints
// Protected: core_team or system_admin only
// ==========================================
const adminOnly = [authenticate, requireRole(['core_team', 'system_admin'])];

// Import & deduplicate roster
router.post('/admin/testers/import', ...adminOnly, importTesterRoster);

// Get authorized roster with invitation statuses
router.get('/admin/testers', ...adminOnly, getTesterRoster);

// Issue high-entropy one-time invitation code
router.post('/admin/testers/:id/invitations', ...adminOnly, issueTesterInvitation);

// Revoke unused invitation
router.post('/admin/invitations/:id/revoke', ...adminOnly, revokeTesterInvitation);

// Retrieve audit event trail
router.get('/admin/tester-events', ...adminOnly, getTesterAccessEvents);

// ==========================================
// Student Tester Access Endpoints
// Protected: authenticated student session
// ==========================================

// Redeem one-time invitation code
router.post('/tester-access/redeem', authenticate, redeemTesterInvitation);

// Check if current authenticated student has active tester authorization
router.get('/tester-access/status', authenticate, getTesterAccessStatus);

// Aliases for convenience if mounted at root or nested
router.post('/redeem', authenticate, redeemTesterInvitation);
router.get('/status', authenticate, getTesterAccessStatus);

export default router;
