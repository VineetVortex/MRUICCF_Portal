/**
 * Storage and Workflow Management
 * Adheres to COMPLETE_DOCUMENTATION.md & Supabase connectivity
 * Handles:
 * - Roles (student, dept_head, core_team, system_admin) & Bootstrap admin auto-detection
 * - Question Bank with Moderation Workflow (pending -> approved | rejected)
 * - Assessment Configuration (creation & parameters)
 * - Attempt History & Certifications
 * - Direct Supabase synchronization with offline/local fallback
 * - Seed Data operation (window.handleSeedData)
 */

import { COMPETENCIES_DATA } from '../data/assessmentData.js';
import { logEvent, LOG_CATEGORIES } from './logger.js';
import { getSupabaseClient, isSupabaseConfigured } from './supabase.js';
import { 
  apiSubmitAttempt, 
  apiApproveQuestion, 
  apiRejectQuestion, 
  apiSubmitQuestion, 
  apiCreateAssessment 
} from './api.js';

const STORAGE_KEY_QUESTIONS = 'mr_iccf_questions_v1';
const STORAGE_KEY_ASSESSMENTS = 'mr_iccf_assessments_v1';
const STORAGE_KEY_ATTEMPTS = 'mr_iccf_attempts_v1';
const STORAGE_KEY_USER = 'mr_iccf_current_user_v1';

// Bootstrap admin email specified for platform administration (assigns core_team automatically)
export const BOOTSTRAP_ADMIN_EMAIL = 'iccf@mruadmin.edu.in';

export const USER_ROLES = {
  STUDENT: 'student',
  FACULTY: 'faculty',
  DEPT_HEAD: 'dept_head',
  CORE_TEAM: 'core_team',
  SYSTEM_ADMIN: 'system_admin'
};

// No pre-seeded users — real users are created on first login via Google OAuth / email auth

// Questions come from the database — populated with master questionnaire baseline
export function getInitialQuestions() {
  const list = [];
  try {
    if (Array.isArray(COMPETENCIES_DATA)) {
      COMPETENCIES_DATA.forEach((c) => {
        (c.questions || []).forEach((q) => {
          list.push({
            id: Number(q.id),
            skillId: Number(q.skillId),
            skillName: q.skillName || c.name,
            text: q.text,
            isReverse: Boolean(q.isReverse),
            difficulty: q.isReverse ? 'Intermediate' : 'Standard',
            approvalStatus: 'approved',
            createdBy: 'Master Questionnaire Copy',
            createdAt: new Date().toISOString()
          });
        });
      });
    }
  } catch (e) {
    console.warn('[Storage] Error loading baseline questions:', e);
  }
  return list;
}

// --- Storage API & Supabase Sync ---

export function getStoredQuestions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_QUESTIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error(e);
  }
  const init = getInitialQuestions();
  localStorage.setItem(STORAGE_KEY_QUESTIONS, JSON.stringify(init));
  return init;
}

/**
 * Fetches latest live questions from backend API and synchronizes localStorage
 */
export async function fetchLiveQuestions() {
  try {
    const { apiGetQuestions } = await import('./api.js');
    const res = await apiGetQuestions('all');
    if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
      saveQuestions(res.data);
      return res.data;
    }
  } catch (err) {
    console.warn('[Storage] Notice fetching live questions:', err);
  }
  return getStoredQuestions();
}

export function saveQuestions(questions) {
  try {
    localStorage.setItem(STORAGE_KEY_QUESTIONS, JSON.stringify(questions));
  } catch (e) {
    console.error(e);
  }
}

export async function approveQuestion(questionId, reviewerName = 'Dept Head') {
  const list = getStoredQuestions();
  const updated = list.map((q) => {
    if (q.id === questionId) {
      return { ...q, approvalStatus: 'approved', reviewedBy: reviewerName, reviewedAt: new Date().toISOString() };
    }
    return q;
  });
  saveQuestions(updated);
  logEvent(LOG_CATEGORIES.ADMIN_ACTION_LOG, `Approved question #${questionId}`, { questionId, reviewerName });

  // Call Node.js + TypeScript SaaS Backend API
  try {
    await apiApproveQuestion(questionId, getCurrentUser());
  } catch (apiErr) {
    console.warn('[API] Approve question notice:', apiErr);
  }

  // Sync to Supabase if connected
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('questions').update({
        approval_status: 'approved',
        reviewed_by: reviewerName,
        reviewed_at: new Date().toISOString()
      }).eq('id', questionId);
    } catch (err) {
      console.warn('Supabase question approve sync warning:', err);
    }
  }

  return updated;
}

export async function rejectQuestion(questionId, reviewerName = 'Dept Head') {
  const list = getStoredQuestions();
  const updated = list.map((q) => {
    if (q.id === questionId) {
      return { ...q, approvalStatus: 'rejected', reviewedBy: reviewerName, reviewedAt: new Date().toISOString() };
    }
    return q;
  });
  saveQuestions(updated);
  logEvent(LOG_CATEGORIES.ADMIN_ACTION_LOG, `Rejected question #${questionId}`, { questionId, reviewerName });

  // Call Node.js + TypeScript SaaS Backend API
  try {
    await apiRejectQuestion(questionId, getCurrentUser());
  } catch (apiErr) {
    console.warn('[API] Reject question notice:', apiErr);
  }

  // Sync to Supabase if connected
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('questions').update({
        approval_status: 'rejected',
        reviewed_by: reviewerName,
        reviewed_at: new Date().toISOString()
      }).eq('id', questionId);
    } catch (err) {
      console.warn('Supabase question reject sync warning:', err);
    }
  }

  return updated;
}

export async function submitNewQuestion(questionData, creatorName = 'Faculty') {
  const list = getStoredQuestions();
  const newQ = {
    id: Date.now(),
    skillId: Number(questionData.skillId),
    skillName: questionData.skillName,
    text: questionData.text,
    isReverse: Boolean(questionData.isReverse),
    difficulty: questionData.difficulty || 'Intermediate',
    approvalStatus: 'pending',
    createdBy: creatorName,
    submittedAt: new Date().toISOString()
  };
  const updated = [newQ, ...list];
  saveQuestions(updated);
  logEvent(LOG_CATEGORIES.ADMIN_ACTION_LOG, `Submitted new question for moderation`, { id: newQ.id, skill: newQ.skillName });

  // Call Node.js + TypeScript SaaS Backend API
  try {
    await apiSubmitQuestion(newQ, getCurrentUser());
  } catch (apiErr) {
    console.warn('[API] Submit question notice:', apiErr);
  }

  // Sync to Supabase if connected
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('questions').insert([{
        id: newQ.id,
        skill_id: newQ.skillId,
        skill_name: newQ.skillName,
        text: newQ.text,
        is_reverse: newQ.isReverse,
        difficulty: newQ.difficulty,
        approval_status: 'pending',
        created_by: creatorName
      }]);
    } catch (err) {
      console.warn('Supabase new question insert warning:', err);
    }
  }

  return newQ;
}

export async function deleteQuestion(questionId, adminName = 'Admin') {
  const list = getStoredQuestions();
  const updated = list.filter(q => q.id !== questionId);
  saveQuestions(updated);
  logEvent(LOG_CATEGORIES.ADMIN_ACTION_LOG, `Deleted question #${questionId}`, { questionId, adminName });

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('questions').delete().eq('id', questionId);
    } catch (err) {
      console.warn('Supabase delete question warning:', err);
    }
  }
  return updated;
}

export async function updateQuestion(questionId, updates, adminName = 'Admin') {
  const list = getStoredQuestions();
  const updated = list.map(q => {
    if (q.id === questionId) {
      return { ...q, ...updates, updatedAt: new Date().toISOString(), updatedBy: adminName };
    }
    return q;
  });
  saveQuestions(updated);
  logEvent(LOG_CATEGORIES.ADMIN_ACTION_LOG, `Updated question #${questionId}`, { questionId, adminName, updates });

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('questions').update({
        text: updates.text,
        is_reverse: updates.isReverse,
        difficulty: updates.difficulty,
        skill_id: updates.skillId,
        skill_name: updates.skillName,
        approval_status: updates.approvalStatus
      }).eq('id', questionId);
    } catch (err) {
      console.warn('Supabase update question warning:', err);
    }
  }
  return updated;
}

export async function batchApproveQuestions(questionIds = [], reviewerName = 'Dept Head') {
  const set = new Set(questionIds.map(String));
  const list = getStoredQuestions();
  const updated = list.map(q => {
    if (set.has(String(q.id))) {
      return { ...q, approvalStatus: 'approved', reviewedBy: reviewerName, reviewedAt: new Date().toISOString() };
    }
    return q;
  });
  saveQuestions(updated);
  logEvent(LOG_CATEGORIES.ADMIN_ACTION_LOG, `Batch approved ${questionIds.length} questions`, { count: questionIds.length, reviewerName });
  return updated;
}

export async function batchRejectQuestions(questionIds = [], reviewerName = 'Dept Head') {
  const set = new Set(questionIds.map(String));
  const list = getStoredQuestions();
  const updated = list.map(q => {
    if (set.has(String(q.id))) {
      return { ...q, approvalStatus: 'rejected', reviewedBy: reviewerName, reviewedAt: new Date().toISOString() };
    }
    return q;
  });
  saveQuestions(updated);
  logEvent(LOG_CATEGORIES.ADMIN_ACTION_LOG, `Batch rejected ${questionIds.length} questions`, { count: questionIds.length, reviewerName });
  return updated;
}

// Assessments
export function getStoredAssessments() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ASSESSMENTS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return [];
}

export function saveAssessments(assessments) {
  try {
    localStorage.setItem(STORAGE_KEY_ASSESSMENTS, JSON.stringify(assessments));
  } catch (e) {
    console.error(e);
  }
}

export async function createAssessment(data, creatorName = 'Core Team') {
  const list = getStoredAssessments();
  const newAssmt = {
    id: `asmt-${Date.now()}`,
    name: data.name,
    department: data.department || 'All Departments',
    departmentId: data.departmentId || 'dept_all',
    timeLimit: Number(data.timeLimit) || 45,
    questionsPerCompetency: Number(data.questionsPerCompetency) || 10,
    totalQuestions: (Number(data.questionsPerCompetency) || 10) * 15,
    active: true,
    scheduledAt: data.scheduledAt || new Date().toISOString(),
    description: data.description || 'Configured via ICCF Assessment Management.',
    createdBy: creatorName
  };
  const updated = [newAssmt, ...list];
  saveAssessments(updated);
  logEvent(LOG_CATEGORIES.ADMIN_ACTION_LOG, `Created assessment: ${newAssmt.name}`, { id: newAssmt.id, timeLimit: newAssmt.timeLimit });

  // Call Node.js + TypeScript SaaS Backend API
  try {
    await apiCreateAssessment(newAssmt, getCurrentUser());
  } catch (apiErr) {
    console.warn('[API] Create assessment notice:', apiErr);
  }

  // Sync to Supabase if connected
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('assessments').insert([{
        id: newAssmt.id,
        name: newAssmt.name,
        department: newAssmt.department,
        time_limit: newAssmt.timeLimit,
        questions_per_competency: newAssmt.questionsPerCompetency,
        total_questions: newAssmt.totalQuestions,
        active: true,
        description: newAssmt.description
      }]);
    } catch (err) {
      console.warn('Supabase assessment insert warning:', err);
    }
  }

  return newAssmt;
}

export async function updateAssessment(assessmentId, updates, adminName = 'Core Team') {
  const list = getStoredAssessments();
  const updated = list.map(a => {
    if (a.id === assessmentId) {
      return {
        ...a,
        ...updates,
        totalQuestions: updates.questionsPerCompetency ? Number(updates.questionsPerCompetency) * 15 : a.totalQuestions,
        updatedAt: new Date().toISOString(),
        updatedBy: adminName
      };
    }
    return a;
  });
  saveAssessments(updated);
  logEvent(LOG_CATEGORIES.ADMIN_ACTION_LOG, `Updated assessment #${assessmentId}`, { assessmentId, adminName, updates });

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('assessments').update({
        name: updates.name,
        department: updates.department,
        time_limit: updates.timeLimit,
        questions_per_competency: updates.questionsPerCompetency,
        active: updates.active
      }).eq('id', assessmentId);
    } catch (err) {
      console.warn('Supabase update assessment warning:', err);
    }
  }
  return updated;
}

export async function deleteAssessment(assessmentId, adminName = 'Core Team') {
  const list = getStoredAssessments();
  const updated = list.filter(a => a.id !== assessmentId);
  saveAssessments(updated);
  logEvent(LOG_CATEGORIES.ADMIN_ACTION_LOG, `Deleted assessment #${assessmentId}`, { assessmentId, adminName });

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('assessments').delete().eq('id', assessmentId);
    } catch (err) {
      console.warn('Supabase delete assessment warning:', err);
    }
  }
  return updated;
}

export async function cloneAssessment(assessmentId, adminName = 'Core Team') {
  const list = getStoredAssessments();
  const original = list.find(a => a.id === assessmentId);
  if (!original) return list;

  const cloned = {
    ...original,
    id: `asmt-${Date.now()}`,
    name: `${original.name} (Copy)`,
    scheduledAt: new Date().toISOString(),
    createdBy: adminName
  };
  const updated = [cloned, ...list];
  saveAssessments(updated);
  logEvent(LOG_CATEGORIES.ADMIN_ACTION_LOG, `Cloned assessment #${assessmentId} into #${cloned.id}`, { originalId: assessmentId, clonedId: cloned.id, adminName });
  return updated;
}

export async function deleteAttempt(attemptId, adminName = 'Admin') {
  const list = getStoredAttempts();
  const updated = list.filter(a => a.id !== attemptId);
  try {
    localStorage.setItem(STORAGE_KEY_ATTEMPTS, JSON.stringify(updated));
  } catch (e) {}
  logEvent(LOG_CATEGORIES.ADMIN_ACTION_LOG, `Deleted attempt #${attemptId}`, { attemptId, adminName });
  return updated;
}

// Attempts & Certification
export function getStoredAttempts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ATTEMPTS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return [];
}

export async function saveAttempt(attempt) {
  const current = getStoredAttempts();
  const updated = [attempt, ...current];
  try {
    localStorage.setItem(STORAGE_KEY_ATTEMPTS, JSON.stringify(updated));
  } catch (e) {
    console.error(e);
  }

  logEvent(LOG_CATEGORIES.ASSESSMENT_LOG, `Submitted assessment: ${attempt.assessmentName}`, {
    overallScore: attempt.overallScore,
    status: attempt.certificationStatus
  }, attempt.userId);

  // Call Node.js + TypeScript SaaS Backend API (Generates verified certificate on server!)
  try {
    const apiRes = await apiSubmitAttempt({
      assessmentId: attempt.assessmentId,
      assessmentName: attempt.assessmentName,
      answers: attempt.answers || {},
      timeSpentSeconds: attempt.timeSpentSeconds,
      timeTakenFormatted: attempt.timeTakenFormatted,
      userId: attempt.userId,
      studentName: attempt.studentName,
      rollNo: attempt.rollNo,
      department: attempt.department,
    }, getCurrentUser());

    if (apiRes && apiRes.success && apiRes.data?.certificate) {
      attempt.certificate = apiRes.data.certificate;
      console.log('[API] Backend verified attempt and issued certificate:', apiRes.data.certificate.certificateNumber);
    }
  } catch (apiErr) {
    console.warn('[API] Attempt submit notice:', apiErr);
  }

  // Sync directly to Supabase if connected
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('attempts').insert([{
        id: attempt.id,
        user_id: attempt.userId,
        student_name: attempt.studentName,
        roll_no: attempt.rollNo,
        department: attempt.department,
        assessment_id: attempt.assessmentId,
        assessment_name: attempt.assessmentName,
        overall_score: attempt.overallScore,
        certification_status: attempt.certificationStatus,
        is_certified: attempt.isCertified,
        time_spent_seconds: attempt.timeSpentSeconds,
        time_taken_formatted: attempt.timeTakenFormatted,
        total_questions: attempt.totalQuestions,
        answers: attempt.answers,
        competency_scores: attempt.competencyScores,
        strengths: attempt.strengths,
        development_areas: attempt.developmentAreas
      }]);
      console.log('[Supabase] Attempt successfully saved to remote database:', attempt.id);
    } catch (err) {
      console.warn('Supabase attempt sync warning:', err);
    }
  }

  return updated;
}

export function getLatestAttempt(userId = null) {
  if (!userId) return null;
  const attempts = getStoredAttempts();
  const userAttempts = attempts.filter((a) => a.userId === userId);
  return userAttempts.length > 0 ? userAttempts[0] : null;
}

// User & Role Management
export const DEFAULT_PORTAL_USER = {
  id: 'usr_22cse0002',
  uid: 'usr_22cse0002',
  email: '22cse0002@mru.ac.in',
  name: 'Aarav Sharma',
  role: USER_ROLES.STUDENT,
  department: 'Computer Science & Technology',
  deptCode: 'CST',
  rollNo: '22CSE0002',
  year: 'Batch 2022-2026',
  designation: 'Undergraduate Student',
  lastLoginAt: new Date().toISOString()
};

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return null; // Return null so user is not automatically logged in
}

export function logoutUser() {
  try {
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem('mr_iccf_token');
  } catch (e) {
    console.error(e);
  }
}

export function setCurrentUser(user) {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY_USER);
    }
  } catch (e) {
    console.error(e);
  }
  if (user) {
    logEvent(LOG_CATEGORIES.AUTH_LOG, `User logged in: ${user?.name || 'User'} (${user?.role})`, { role: user?.role, email: user?.email });
  }
}

/**
 * Handle Reset & Seed Data Operation
 * Flow: Trigger -> Create sample departments -> Create sample competencies -> Create sample assessment -> Done
 */
export async function handleSeedData() {
  const currentUser = getCurrentUser();
  const isCoreTeam = currentUser?.role === USER_ROLES.CORE_TEAM || currentUser?.role === USER_ROLES.SYSTEM_ADMIN;
  
  if (!isCoreTeam) {
    console.warn(`[ICCF SEED] Warning: Caller role is "${currentUser?.role || 'anonymous'}". Recommended role: "${USER_ROLES.CORE_TEAM}".`);
  }

  console.log('[ICCF DATA] Initializing baseline seed data...');

  // 1. Sample Departments
  const sampleDepartments = [
    { id: 'dept_cst', code: 'CST', name: 'Computer Science & Technology' },
    { id: 'dept_ece', code: 'ECE', name: 'Electronics & Communication Engineering' },
    { id: 'dept_me', code: 'ME', name: 'Mechanical Engineering' },
    { id: 'dept_mgmt', code: 'FMS', name: 'Management Studies' },
    { id: 'dept_all', code: 'UNIV', name: 'All Departments (University-wide)' }
  ];
  localStorage.setItem('mr_iccf_departments_v1', JSON.stringify(sampleDepartments));

  // 2. Sample Competencies & Questions from COMPETENCIES_DATA
  const sampleQuestions = [];
  COMPETENCIES_DATA.forEach(comp => {
    (comp.questions || []).forEach(q => {
      sampleQuestions.push({
        id: q.id,
        skillId: q.skillId || comp.id,
        skillName: q.skillName || comp.name,
        text: q.text,
        isReverse: Boolean(q.isReverse),
        difficulty: 'Intermediate',
        approvalStatus: 'approved',
        createdBy: 'Academic Council Baseline',
        submittedAt: new Date().toISOString(),
        reviewedBy: 'Dept Head & Core Team',
        reviewedAt: new Date().toISOString()
      });
    });
  });
  saveQuestions(sampleQuestions);

  // 3. Sample Baseline Assessment
  const baselineAssessment = {
    id: 'asmt-2026-core',
    name: '2026 Institutional Human-Centric Skills Assessment',
    department: 'All Departments (University-wide)',
    departmentId: 'dept_all',
    timeLimit: 45,
    questionsPerCompetency: 10,
    totalQuestions: 150,
    active: true,
    scheduledAt: new Date().toISOString(),
    description: 'Comprehensive baseline institutional assessment across all 15 competency dimensions.',
    createdBy: 'Core Team'
  };
  saveAssessments([baselineAssessment]);

  logEvent(LOG_CATEGORIES.DATABASE_LOG, 'Database initialized with sample departments, competencies, and assessment via handleSeedData()', {
    caller: currentUser?.name || 'Console',
    role: currentUser?.role || 'core_team',
    departmentsCount: sampleDepartments.length,
    competenciesCount: COMPETENCIES_DATA.length,
    questionsCount: sampleQuestions.length
  });

  console.log('[ICCF DATA] Database initialization complete: 5 departments, 15 competencies, 1 baseline assessment created.');

  return {
    success: true,
    message: 'Baseline data initialized: sample departments, competencies, and assessment created successfully.'
  };
}

/**
 * Export complete institutional database snapshot for backup and disaster recovery (NFR-04)
 */
export function exportInstitutionalBackup(exportedBy = 'Admin') {
  const backup = {
    metadata: {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      exportedBy,
      environment: 'production',
      schema: 'MR_ICCF_INSTITUTIONAL_V1'
    },
    questions: getStoredQuestions(),
    assessments: getStoredAssessments(),
    attempts: getStoredAttempts()
  };

  logEvent(LOG_CATEGORIES.ADMIN_ACTION_LOG, 'Institutional database snapshot exported for disaster recovery', {
    exportedBy,
    questionsCount: backup.questions.length,
    assessmentsCount: backup.assessments.length,
    attemptsCount: backup.attempts.length
  });

  return backup;
}

/**
 * Restore institutional database from a backup snapshot (NFR-04)
 */
export function importInstitutionalBackup(backupData, importedBy = 'Admin') {
  if (!backupData || !Array.isArray(backupData.questions)) {
    throw new Error('Invalid backup file format: missing questions schema.');
  }

  if (Array.isArray(backupData.questions)) {
    saveQuestions(backupData.questions);
  }
  if (Array.isArray(backupData.assessments)) {
    saveAssessments(backupData.assessments);
  }
  if (Array.isArray(backupData.attempts)) {
    saveAttempts(backupData.attempts);
  }

  logEvent(LOG_CATEGORIES.ADMIN_ACTION_LOG, 'Institutional database snapshot successfully restored from backup', {
    importedBy,
    questionsRestored: backupData.questions?.length || 0,
    assessmentsRestored: backupData.assessments?.length || 0,
    attemptsRestored: backupData.attempts?.length || 0
  });

  return {
    success: true,
    message: `Database restored: ${backupData.questions?.length || 0} questions, ${backupData.assessments?.length || 0} assessments, and ${backupData.attempts?.length || 0} student records.`
  };
}

// Attach globally to window for browser developer console as specified in the Admin Guide
if (typeof window !== 'undefined') {
  window.handleSeedData = handleSeedData;
  window.exportInstitutionalBackup = exportInstitutionalBackup;
  window.importInstitutionalBackup = importInstitutionalBackup;
}

