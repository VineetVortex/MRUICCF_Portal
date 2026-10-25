import { Router } from 'express';
import { verifyCertificate, getUserCertificates } from '../controllers/certificateController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

// Public endpoint for certificate verification (supports scanning QR code or entering Cert #)
router.get('/verify/:identifier', verifyCertificate);

// Authenticated endpoint for retrieving student certificates
router.get('/student/:studentId', authenticate, getUserCertificates);

export default router;
