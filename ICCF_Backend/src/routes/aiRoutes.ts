import { Router } from 'express';
import { evaluateAnswerWithAi, getAiModelHealth } from '../controllers/aiController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

// Public health of the 5 free OpenRouter models
router.get('/models', getAiModelHealth);

// Authenticated evaluation
router.post('/evaluate', authenticate, evaluateAnswerWithAi);

export default router;
