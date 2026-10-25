import { Router } from 'express';
import { 
  getCompetencies, 
  getDepartments, 
  createCompetency, 
  updateCompetency 
} from '../controllers/competencyController.js';
import { authenticate, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', getCompetencies);
router.get('/departments', getDepartments);

// Admin-only master competency management
router.post('/', authenticate, requireRole(['core_team', 'system_admin']), createCompetency);
router.put('/:id', authenticate, requireRole(['core_team', 'system_admin']), updateCompetency);

export default router;
