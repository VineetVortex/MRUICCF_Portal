import { Router } from 'express';
import { 
  login, 
  verifyLoginOtp, 
  resendLoginOtp, 
  refreshAccessToken,
  logout,
  getProfile, 
  forgotPassword,
  resetPassword,
  provisionUser,
  listUsers 
} from '../controllers/authController.js';
import { authenticate, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// Public Authentication Endpoints (rate-limited)
router.post('/login', login);
router.post('/verify-otp', verifyLoginOtp);
router.post('/resend-otp', resendLoginOtp);
router.post('/refresh', refreshAccessToken);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Authenticated User Profile Endpoints (Strict 30s JWT verification)
router.get('/me', authenticate, getProfile);
router.get('/profile', authenticate, getProfile);

// Protected Administrative User Provisioning Endpoints
router.post('/provision', authenticate, requireRole(['core_team', 'system_admin']), provisionUser);
router.get('/users', authenticate, requireRole(['core_team', 'system_admin']), listUsers);

export default router;
