import { Router } from 'express';
import authRoutes from './authRoutes.js';
import competencyRoutes from './competencyRoutes.js';
import questionRoutes from './questionRoutes.js';
import assessmentRoutes from './assessmentRoutes.js';
import attemptRoutes from './attemptRoutes.js';
import certificateRoutes from './certificateRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import auditRoutes from './auditRoutes.js';
import aiRoutes from './aiRoutes.js';
import facultyRoutes from './facultyRoutes.js';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/competencies', competencyRoutes);
apiRouter.use('/questions', questionRoutes);
apiRouter.use('/assessments', assessmentRoutes);
apiRouter.use('/attempts', attemptRoutes);
apiRouter.use('/certificates', certificateRoutes);
apiRouter.use('/analytics', analyticsRoutes);
apiRouter.use('/audit-logs', auditRoutes);
apiRouter.use('/ai', aiRoutes);
apiRouter.use('/faculty', facultyRoutes);

// API Information Route
apiRouter.get('/', (req, res) => {
  res.status(200).json({
    name: 'Manav Rachna ICCF Portal Enterprise API',
    version: '1.0.0',
    status: 'online',
    timestamp: new Date().toISOString(),
    endpoints: [
      '/api/auth',
      '/api/competencies',
      '/api/questions',
      '/api/assessments',
      '/api/attempts',
      '/api/certificates',
      '/api/analytics',
      '/api/audit-logs',
      '/api/ai'
    ]
  });
});

export default apiRouter;
