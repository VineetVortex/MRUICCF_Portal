import { Router } from 'express';
import {
  getFacultyDashboard,
  getFacultyProfile,
  getFacultyAssessments,
  createFacultyAssessment,
  updateFacultyAssessment,
  submitFacultyAssessment,
  getApprovedMasterQuestions,
  getFacultyQuestionDrafts,
  createFacultyQuestionDraft,
  getFacultyStudents,
  getFacultyStudentDetail,
  getFacultyReports,
  getFacultyCompetencyAnalytics,
  getFacultyNotifications,
  markNotificationRead,
  getDepartmentOverview,
  getDepartmentQuestionQueue,
  reviewDepartmentQuestion,
  getDepartmentAssessmentQueue,
  reviewDepartmentAssessment,
  getDepartmentAnalytics,
} from '../controllers/facultyController.js';
import { authenticate, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// Base protection: Accessible to Faculty, Department Heads, and Admins
const facultyAccess = [authenticate, requireRole(['faculty', 'dept_head', 'core_team', 'system_admin'])];
const deptHeadAccess = [authenticate, requireRole(['dept_head', 'core_team', 'system_admin'])];

// 1. Faculty Dashboard & Profile
router.get('/dashboard', ...facultyAccess, getFacultyDashboard);
router.get('/profile', ...facultyAccess, getFacultyProfile);

// 2. Faculty Assessment Lifecycle
router.get('/assessments', ...facultyAccess, getFacultyAssessments);
router.post('/assessments', ...facultyAccess, createFacultyAssessment);
router.put('/assessments/:id', ...facultyAccess, updateFacultyAssessment);
router.post('/assessments/:id/submit', ...facultyAccess, submitFacultyAssessment);

// 3. Questions: View Master Questions (Read-only) & Propose Question Drafts
router.get('/questions/approved', ...facultyAccess, getApprovedMasterQuestions);
router.get('/questions/drafts', ...facultyAccess, getFacultyQuestionDrafts);
router.post('/questions/drafts', ...facultyAccess, createFacultyQuestionDraft);

// 4. Assigned Students & Progress (Scoped by department / assigned group)
router.get('/students', ...facultyAccess, getFacultyStudents);
router.get('/students/:studentId', ...facultyAccess, getFacultyStudentDetail);

// 5. Results, Reports & Competency Analytics
router.get('/reports', ...facultyAccess, getFacultyReports);
router.get('/analytics', ...facultyAccess, getFacultyCompetencyAnalytics);

// 6. Notifications
router.get('/notifications', ...facultyAccess, getFacultyNotifications);
router.patch('/notifications/:id/read', ...facultyAccess, markNotificationRead);

// 7. Department Head Dedicated Operations (Authorized HoD scope only)
router.get('/department/overview', ...deptHeadAccess, getDepartmentOverview);
router.get('/department/question-queue', ...deptHeadAccess, getDepartmentQuestionQueue);
router.patch('/department/question-queue/:id/review', ...deptHeadAccess, reviewDepartmentQuestion);
router.get('/department/assessment-queue', ...deptHeadAccess, getDepartmentAssessmentQueue);
router.patch('/department/assessment-queue/:id/review', ...deptHeadAccess, reviewDepartmentAssessment);
router.get('/department/analytics', ...deptHeadAccess, getDepartmentAnalytics);

export default router;
