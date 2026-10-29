/**
 * Manav Rachna ICCF Portal - Enterprise API Client
 * Connects frontend React client to the Node.js + TypeScript SaaS Backend.
 * Seamlessly integrates with in-memory 30s JWT and HttpOnly refresh session rotation.
 */

import { authFetch, apiLoginUser, apiLogoutUser, setAuthSession } from './authClient.js';

const ENV_API_URL = import.meta.env.VITE_API_URL || '';
const isProd = import.meta.env.PROD || (typeof window !== 'undefined' && !window.location.hostname.includes('localhost'));
const API_BASE_URL = (isProd && (!ENV_API_URL || ENV_API_URL.includes('localhost:5000')))
  ? 'https://mruiccf-portal.onrender.com/api'
  : (ENV_API_URL || '/api');

/**
 * Health check test
 */
export async function testBackendHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return { connected: false, status: res.status };
    const data = await res.json();
    return { connected: true, data };
  } catch (err) {
    return { connected: false, error: err.message };
  }
}

/**
 * Authentication: Login user
 */
export async function apiLogin(credentials) {
  try {
    const result = await apiLoginUser(credentials);
    return result;
  } catch (err) {
    console.warn('[API] Auth login error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Questions API (Protected by 30s JWT)
 */
export async function apiGetQuestions(status = 'all', skillId = null) {
  try {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status', status);
    if (skillId) params.append('skillId', skillId);

    const res = await authFetch(`${API_BASE_URL}/questions?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return { success: false, fallback: true, error: err.message };
  }
}

export async function apiSubmitQuestion(questionData) {
  try {
    const res = await authFetch(`${API_BASE_URL}/questions`, {
      method: 'POST',
      body: JSON.stringify(questionData),
    });
    return await res.json();
  } catch (err) {
    return { success: false, fallback: true, error: err.message };
  }
}

export async function apiApproveQuestion(questionId) {
  try {
    const res = await authFetch(`${API_BASE_URL}/questions/${questionId}/approve`, {
      method: 'PATCH',
    });
    return await res.json();
  } catch (err) {
    return { success: false, fallback: true, error: err.message };
  }
}

export async function apiRejectQuestion(questionId) {
  try {
    const res = await authFetch(`${API_BASE_URL}/questions/${questionId}/reject`, {
      method: 'PATCH',
    });
    return await res.json();
  } catch (err) {
    return { success: false, fallback: true, error: err.message };
  }
}

export async function apiGetQuestionBankStats() {
  try {
    const res = await authFetch(`${API_BASE_URL}/questions/stats`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiUpdateQuestion(questionId, updates) {
  try {
    const res = await authFetch(`${API_BASE_URL}/questions/${questionId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiDeleteQuestion(questionId) {
  try {
    const res = await authFetch(`${API_BASE_URL}/questions/${questionId}`, {
      method: 'DELETE',
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiPreviewImportQuestions(items) {
  try {
    const res = await authFetch(`${API_BASE_URL}/questions/import/preview`, {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiCommitImportQuestions(items) {
  try {
    const res = await authFetch(`${API_BASE_URL}/questions/import/commit`, {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiGetCompetencies() {
  try {
    const res = await fetch(`${API_BASE_URL}/competencies`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiCreateCompetency(compData) {
  try {
    const res = await authFetch(`${API_BASE_URL}/competencies`, {
      method: 'POST',
      body: JSON.stringify(compData),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiUpdateCompetency(compId, updates) {
  try {
    const res = await authFetch(`${API_BASE_URL}/competencies/${compId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Assessments API
 */
export async function apiGetAssessments() {
  try {
    const res = await authFetch(`${API_BASE_URL}/assessments`);
    return await res.json();
  } catch (err) {
    return { success: false, fallback: true, error: err.message };
  }
}

export async function apiCreateAssessment(assessmentData) {
  try {
    const res = await authFetch(`${API_BASE_URL}/assessments`, {
      method: 'POST',
      body: JSON.stringify(assessmentData),
    });
    return await res.json();
  } catch (err) {
    return { success: false, fallback: true, error: err.message };
  }
}

/**
 * Attempts & Scoring API (Calculated and verified server-side!)
 */
export async function apiStartOrResumeAttempt(payload) {
  try {
    const res = await authFetch(`${API_BASE_URL}/attempts/start`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    return { success: false, fallback: true, error: err.message };
  }
}

export async function apiGetActiveAttempt(userId = null) {
  try {
    const url = userId ? `${API_BASE_URL}/attempts/active?userId=${encodeURIComponent(userId)}` : `${API_BASE_URL}/attempts/active`;
    const res = await authFetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return { success: false, fallback: true, error: err.message };
  }
}

export async function apiAutosaveAttempt(attemptId, payload) {
  try {
    const res = await authFetch(`${API_BASE_URL}/attempts/${encodeURIComponent(attemptId)}/autosave`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    return { success: false, fallback: true, error: err.message };
  }
}

export async function apiLogIntegrityEvent(attemptId, eventData) {
  try {
    const res = await authFetch(`${API_BASE_URL}/attempts/${encodeURIComponent(attemptId)}/integrity-event`, {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
    return await res.json();
  } catch (err) {
    return { success: false, fallback: true, error: err.message };
  }
}

export async function apiFinalizeAttempt(attemptId, payload) {
  try {
    const res = await authFetch(`${API_BASE_URL}/attempts/${encodeURIComponent(attemptId)}/finalize`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    return { success: false, fallback: true, error: err.message };
  }
}

export async function apiSubmitAttempt(attemptPayload) {
  try {
    const res = await authFetch(`${API_BASE_URL}/attempts`, {
      method: 'POST',
      body: JSON.stringify(attemptPayload),
    });
    return await res.json();
  } catch (err) {
    return { success: false, fallback: true, error: err.message };
  }
}

export async function apiGetAllAttempts() {
  try {
    const res = await authFetch(`${API_BASE_URL}/attempts`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return { success: false, fallback: true, error: err.message };
  }
}

export async function apiGetUserAttempts(userId) {
  try {
    const res = await authFetch(`${API_BASE_URL}/attempts/user/${userId}`);
    return await res.json();
  } catch (err) {
    return { success: false, fallback: true, error: err.message };
  }
}

/**
 * Certificate Verification API (Public URL/QR Verification)
 */
export async function apiVerifyCertificate(identifier) {
  try {
    const res = await fetch(`${API_BASE_URL}/certificates/verify/${encodeURIComponent(identifier)}`);
    return await res.json();
  } catch (err) {
    return { success: false, fallback: true, error: err.message };
  }
}

/**
 * Institutional Analytics API
 */
export async function apiGetAnalytics() {
  try {
    const res = await authFetch(`${API_BASE_URL}/analytics`);
    return await res.json();
  } catch (err) {
    return { success: false, fallback: true, error: err.message };
  }
}

/**
 * Administrative User Provisioning
 */
export async function apiProvisionUser(payload) {
  try {
    const res = await authFetch(`${API_BASE_URL}/auth/provision`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * =============================================================================
 * Faculty Portal & Department Head API Endpoints
 * =============================================================================
 */

export async function apiGetFacultyDashboard() {
  try {
    const res = await authFetch(`${API_BASE_URL}/faculty/dashboard`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiGetFacultyProfile() {
  try {
    const res = await authFetch(`${API_BASE_URL}/faculty/profile`);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiGetFacultyAssessments() {
  try {
    const res = await authFetch(`${API_BASE_URL}/faculty/assessments`);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiCreateFacultyAssessment(payload) {
  try {
    const res = await authFetch(`${API_BASE_URL}/faculty/assessments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiUpdateFacultyAssessment(id, payload) {
  try {
    const res = await authFetch(`${API_BASE_URL}/faculty/assessments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiSubmitFacultyAssessment(id) {
  try {
    const res = await authFetch(`${API_BASE_URL}/faculty/assessments/${id}/submit`, {
      method: 'POST',
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiGetApprovedMasterQuestions(skillId = null, difficulty = null) {
  try {
    const params = new URLSearchParams();
    if (skillId) params.append('skillId', skillId);
    if (difficulty) params.append('difficulty', difficulty);
    const res = await authFetch(`${API_BASE_URL}/faculty/questions/approved?${params.toString()}`);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiGetFacultyQuestionDrafts() {
  try {
    const res = await authFetch(`${API_BASE_URL}/faculty/questions/drafts`);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiSubmitFacultyQuestionDraft(payload) {
  try {
    const res = await authFetch(`${API_BASE_URL}/faculty/questions/drafts`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiGetFacultyStudents(search = '', status = 'all') {
  try {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status && status !== 'all') params.append('status', status);
    const res = await authFetch(`${API_BASE_URL}/faculty/students?${params.toString()}`);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiGetFacultyStudentDetail(studentId) {
  try {
    const res = await authFetch(`${API_BASE_URL}/faculty/students/${encodeURIComponent(studentId)}`);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiGetFacultyReports() {
  try {
    const res = await authFetch(`${API_BASE_URL}/faculty/reports`);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiGetFacultyCompetencyAnalytics() {
  try {
    const res = await authFetch(`${API_BASE_URL}/faculty/analytics`);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiGetFacultyNotifications() {
  try {
    const res = await authFetch(`${API_BASE_URL}/faculty/notifications`);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiMarkNotificationRead(id) {
  try {
    const res = await authFetch(`${API_BASE_URL}/faculty/notifications/${id}/read`, {
      method: 'PATCH',
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Department Head Endpoints
export async function apiGetDepartmentOverview() {
  try {
    const res = await authFetch(`${API_BASE_URL}/faculty/department/overview`);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiGetDepartmentQuestionQueue() {
  try {
    const res = await authFetch(`${API_BASE_URL}/faculty/department/question-queue`);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiReviewDepartmentQuestion(id, action, comments = '') {
  try {
    const res = await authFetch(`${API_BASE_URL}/faculty/department/question-queue/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ action, comments }),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiGetDepartmentAssessmentQueue() {
  try {
    const res = await authFetch(`${API_BASE_URL}/faculty/department/assessment-queue`);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiReviewDepartmentAssessment(id, action, notes = '') {
  try {
    const res = await authFetch(`${API_BASE_URL}/faculty/department/assessment-queue/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ action, notes }),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiGetDepartmentAnalytics() {
  try {
    const res = await authFetch(`${API_BASE_URL}/faculty/department/analytics`);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Submit Beta Test Student Feedback
 */
export async function apiSubmitFeedback(feedbackData) {
  try {
    const res = await fetch(`${API_BASE_URL}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedbackData)
    });
    return await res.json();
  } catch (err) {
    console.warn('[API] Feedback submission offline fallback:', err);
    // Save to localStorage so feedback is never lost
    try {
      const existing = JSON.parse(localStorage.getItem('iccf_beta_feedbacks') || '[]');
      existing.unshift({
        id: `fb_local_${Date.now()}`,
        ...feedbackData,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem('iccf_beta_feedbacks', JSON.stringify(existing));
    } catch (_) {}
    return { success: true, offline: true };
  }
}

/**
 * Fetch Beta Test Feedbacks for Admin Portal
 */
export async function apiGetFeedbacks() {
  try {
    const res = await fetch(`${API_BASE_URL}/feedback`);
    if (res.ok) {
      const data = await res.json();
      return data.feedbacks || [];
    }
  } catch (err) {
    console.warn('[API] Fetch feedbacks fallback:', err);
  }
  // LocalStorage fallback
  try {
    return JSON.parse(localStorage.getItem('iccf_beta_feedbacks') || '[]');
  } catch (_) {
    return [];
  }
}

/**
 * ==========================================
 * Tester Access & One-Time Invitation APIs
 * ==========================================
 */

/**
 * Admin: Import/update authorized testing roster
 */
export async function apiImportTesterRoster(testers) {
  try {
    const res = await authFetch(`${API_BASE_URL}/admin/testers/import`, {
      method: 'POST',
      body: JSON.stringify({ testers })
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Admin: Get tester roster with invitation statuses
 */
export async function apiGetTesterRoster(search = '') {
  try {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await authFetch(`${API_BASE_URL}/admin/testers${query}`);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message, testers: [] };
  }
}

/**
 * Admin: Issue a new high-entropy one-time invitation code
 * Plaintext code is returned ONCE by the backend and never retrievable again.
 */
export async function apiIssueTesterInvitation(rosterId, expiresInHours = 8) {
  try {
    const res = await authFetch(`${API_BASE_URL}/admin/testers/${rosterId}/invitations`, {
      method: 'POST',
      body: JSON.stringify({ expiresInHours })
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Admin: Revoke an unused invitation
 */
export async function apiRevokeTesterInvitation(invitationId) {
  try {
    const res = await authFetch(`${API_BASE_URL}/admin/invitations/${invitationId}/revoke`, {
      method: 'POST'
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Admin: Get tester access event audit log
 */
export async function apiGetTesterAccessEvents(limit = 100) {
  try {
    const res = await authFetch(`${API_BASE_URL}/admin/tester-events?limit=${limit}`);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message, events: [] };
  }
}

/**
 * Student: Check active tester authorization status
 */
export async function apiGetTesterAccessStatus() {
  try {
    const res = await authFetch(`${API_BASE_URL}/tester-access/status`);
    return await res.json();
  } catch (err) {
    return { success: false, isTester: false, error: err.message };
  }
}

/**
 * Student: Atomically redeem a one-time invitation code
 */
export async function apiRedeemTesterCode(code) {
  try {
    const res = await authFetch(`${API_BASE_URL}/tester-access/redeem`, {
      method: 'POST',
      body: JSON.stringify({ code })
    });
    const data = await res.json();
    return data;
  } catch (err) {
    return { success: false, error: err.message };
  }
}


