export type UserRole = 'student' | 'faculty' | 'dept_head' | 'core_team' | 'system_admin';

export interface User {
  id: string;
  uid?: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  deptCode?: string;
  year?: string;
  rollNo?: string;
  designation?: string;
  avatar?: string;
  createdAt?: string;
  lastLoginAt?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  createdAt?: string;
}

export interface Competency {
  id: number;
  name: string;
  description: string;
  univAvg: number;
  createdAt?: string;
}

export type ApprovalStatus = 'approved' | 'pending' | 'rejected' | 'draft' | 'returned';

export interface Question {
  id: number;
  skillId: number;
  skillName: string;
  text: string;
  isReverse: boolean;
  difficulty: 'Standard' | 'Intermediate' | 'Advanced';
  approvalStatus: ApprovalStatus;
  createdBy: string;
  facultyId?: string;
  explanation?: string;
  reviewComments?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt?: string;
}

export type AssessmentStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'published' | 'closed' | 'archived' | 'rejected';

export interface AssessmentConfig {
  id: string;
  name: string;
  department: string;
  departmentId: string;
  timeLimit: number; // in minutes
  questionsPerCompetency: number;
  totalQuestions: number;
  active: boolean;
  status?: AssessmentStatus;
  scheduledAt: string;
  startDate?: string;
  endDate?: string;
  intendedGroup?: string;
  selectedQuestionIds?: number[];
  description: string;
  createdBy: string;
  facultyId?: string;
  reviewNotes?: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt?: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  description?: string;
  type: 'info' | 'success' | 'warning' | 'action_required';
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface CompetencyScore {
  id: number;
  name: string;
  score: number;
  rawPoints: number;
  maxPoints: number;
  univAvg: number;
  level: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  levelName: string;
  levelLabel: string;
  levelColor: string;
  levelBg: string;
  trend: 'up' | 'down';
}

export interface AttemptResult {
  id: string;
  userId: string;
  studentName: string;
  rollNo?: string;
  department?: string;
  assessmentId: string;
  assessmentName: string;
  overallScore: number;
  certificationStatus: 'Certified' | 'Needs Improvement';
  isCertified: boolean;
  timeSpentSeconds?: number;
  timeTakenFormatted?: string;
  totalQuestions: number;
  answers: Record<string | number, number>;
  competencyScores: CompetencyScore[];
  strengths: CompetencyScore[];
  developmentAreas: CompetencyScore[];
  createdAt?: string;
}

export interface Certificate {
  id: string;
  certificateNumber: string;
  attemptId: string;
  studentId: string;
  studentName: string;
  rollNo?: string;
  department?: string;
  assessmentId: string;
  assessmentName: string;
  overallScore: number;
  competencyScores: CompetencyScore[];
  verificationHash: string;
  issuedAt: string;
}

export type AuditLogCategory = 
  | 'AUTH_LOG' 
  | 'ASSESSMENT_LOG' 
  | 'DATABASE_LOG' 
  | 'SECURITY_LOG' 
  | 'ADMIN_ACTION_LOG' 
  | 'ERROR_LOG';

export interface AuditLog {
  id: string;
  category: AuditLogCategory;
  action: string;
  userId: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  meta?: Record<string, unknown>;
}
