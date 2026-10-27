import React, { useState, useEffect } from 'react';
import {
  Users,
  GraduationCap,
  Building2,
  FileCheck,
  TrendingUp,
  Clock,
  Plus,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ChevronDown,
  BookOpen,
  Send,
  Edit3,
  Trash2,
  Eye,
  Download,
  Bell,
  Check,
  X,
  User,
  LogOut,
  Sparkles,
  BarChart3,
  Layers,
  ArrowRight,
  Info,
  Calendar,
  HelpCircle,
  FileSpreadsheet,
  Sliders
} from 'lucide-react';
import {
  apiGetFacultyDashboard,
  apiGetFacultyProfile,
  apiGetFacultyAssessments,
  apiCreateFacultyAssessment,
  apiSubmitFacultyAssessment,
  apiGetApprovedMasterQuestions,
  apiGetFacultyQuestionDrafts,
  apiSubmitFacultyQuestionDraft,
  apiGetFacultyStudents,
  apiGetFacultyStudentDetail,
  apiGetFacultyReports,
  apiGetFacultyCompetencyAnalytics,
  apiGetFacultyNotifications,
  apiMarkNotificationRead,
  apiGetDepartmentOverview,
  apiGetDepartmentQuestionQueue,
  apiReviewDepartmentQuestion,
  apiGetDepartmentAssessmentQueue,
  apiReviewDepartmentAssessment,
  apiGetDepartmentAnalytics
} from '../lib/api.js';
import {
  getStoredAssessments,
  getStoredAttempts,
  getStoredQuestions,
  createAssessment,
  submitNewQuestion
} from '../lib/storage.js';

export default function FacultyView({ setView, currentUser, onLogout }) {
  // Navigation tabs
  // 'dashboard' | 'my-assessments' | 'question-drafts' | 'assigned-students' | 'reports' | 'analytics' | 'notifications' | 'profile' | 'dept-overview' | 'question-queue' | 'assessment-queue' | 'dept-analytics'
  const [activeTab, setActiveTab] = useState('dashboard');

  // Trusted Profile & Permissions State
  const [profile, setProfile] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // My Assessments State
  const [assessments, setAssessments] = useState([]);
  const [assessmentFilter, setAssessmentFilter] = useState('all');
  const [showCreateAssessmentModal, setShowCreateAssessmentModal] = useState(false);
  const [newAssmtTitle, setNewAssmtTitle] = useState('');
  const [newAssmtDesc, setNewAssmtDesc] = useState('');
  const [newAssmtTimeLimit, setNewAssmtTimeLimit] = useState(45);
  const [newAssmtQuestionsPerComp, setNewAssmtQuestionsPerComp] = useState(4);
  const [newAssmtGroup, setNewAssmtGroup] = useState('3rd Year CST - Cohort A');
  const [selectedQuestionsForAssmt, setSelectedQuestionsForAssmt] = useState([]);
  const [approvedMasterQuestions, setApprovedMasterQuestions] = useState([]);
  const [isSubmittingAssessment, setIsSubmittingAssessment] = useState(false);

  // Question Drafts State
  const [questionDrafts, setQuestionDrafts] = useState([]);
  const [showCreateQuestionModal, setShowCreateQuestionModal] = useState(false);
  const [newQSkillId, setNewQSkillId] = useState(1);
  const [newQSkillName, setNewQSkillName] = useState('Communication');
  const [newQText, setNewQText] = useState('');
  const [newQDifficulty, setNewQDifficulty] = useState('Intermediate');
  const [newQReverse, setNewQReverse] = useState(false);
  const [newQExplanation, setNewQExplanation] = useState('');
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false);

  // Assigned Students State
  const [students, setStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentStatusFilter, setStudentStatusFilter] = useState('all');
  const [selectedStudentDetail, setSelectedStudentDetail] = useState(null);
  const [isLoadingStudentDetail, setIsLoadingStudentDetail] = useState(false);

  // Reports & Analytics State
  const [reportsData, setReportsData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  // Department Head Queues
  const [deptOverview, setDeptOverview] = useState(null);
  const [deptQuestionQueue, setDeptQuestionQueue] = useState([]);
  const [deptAssessmentQueue, setDeptAssessmentQueue] = useState([]);
  const [deptAnalytics, setDeptAnalytics] = useState(null);
  const [reviewComments, setReviewComments] = useState('');
  const [actionNotice, setActionNotice] = useState('');

  // 15 Competencies List for Mapping
  const COMPETENCIES_LIST = [
    { id: 1, name: 'Communication' },
    { id: 2, name: 'Planning & Organizing' },
    { id: 3, name: 'Professionalism' },
    { id: 4, name: 'Resource Management' },
    { id: 5, name: 'Building Trust' },
    { id: 6, name: 'Collaboration & Teamwork' },
    { id: 7, name: 'Conflict Resolution' },
    { id: 8, name: 'Emotional Intelligence' },
    { id: 9, name: 'Empathy' },
    { id: 10, name: 'Inclusion & Diversity' },
    { id: 11, name: 'Ethics & Integrity' },
    { id: 12, name: 'Accountability' },
    { id: 13, name: 'Lifelong Learning' },
    { id: 14, name: 'Resilience' },
    { id: 15, name: 'Self-Management' },
  ];

  // Initial Data Fetch
  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      try {
        const [profRes, dashRes, notifRes] = await Promise.all([
          apiGetFacultyProfile(),
          apiGetFacultyDashboard(),
          apiGetFacultyNotifications()
        ]);

        if (profRes && profRes.data) {
          setProfile(profRes.data);
        } else {
          setProfile({
            id: currentUser?.id || 'usr_fac_current',
            name: currentUser?.name || 'Vineet Kumar',
            email: currentUser?.email || 'Vineetkumar182023@gmail.com',
            department: currentUser?.department || 'Computer Science & Technology',
            deptCode: currentUser?.deptCode || 'CST',
            designation: currentUser?.designation || 'Institutional Admin & Faculty Lead',
            isDepartmentHead: true,
            permissions: { canCreateAssessments: true, canSubmitQuestions: true, canReviewDepartment: true }
          });
        }

        if (dashRes && dashRes.data) {
          setDashboardData(dashRes.data);
        } else {
          const localAttempts = getStoredAttempts();
          const localAssessments = getStoredAssessments();
          const userDept = currentUser?.department || 'Computer Science & Technology';
          const deptAttempts = localAttempts.filter(a => !a.department || a.department === userDept || a.department.includes(userDept) || userDept.includes(a.department));
          const uniqueStudents = new Set(deptAttempts.map(a => a.userId || a.rollNo).filter(Boolean)).size;
          const avgScore = deptAttempts.length > 0 
            ? Math.round(deptAttempts.reduce((acc, a) => acc + (a.overallScore || 0), 0) / deptAttempts.length)
            : 0;
          
          setDashboardData({
            metrics: {
              assignedStudents: uniqueStudents,
              activeAssessments: localAssessments.filter(a => a.active).length,
              pendingReviews: 0,
              completedAssessments: deptAttempts.length,
              averageCompetencyScore: avgScore,
              upcomingDeadlines: 0
            },
            recentActivity: deptAttempts.slice(0, 4).map(a => ({
              id: a.id,
              type: 'attempt_submitted',
              title: `Student Assessment Completed: ${a.studentName}`,
              subtitle: `Scored ${Math.round(a.overallScore)}% • ${a.certificationStatus}`,
              timestamp: a.timestamp || new Date().toISOString()
            })),
            pendingActions: []
          });
        }

        if (notifRes && notifRes.data) setNotifications(notifRes.data);

        // Preload master questions for assessment building
        apiGetApprovedMasterQuestions().then(res => {
          if (res?.data && res.data.length > 0) {
            setApprovedMasterQuestions(res.data);
          } else {
            const masterQ = getStoredQuestions().filter(q => q.approvalStatus === 'approved');
            setApprovedMasterQuestions(masterQ);
          }
        });
      } catch (err) {
        console.warn('[FacultyView] Notice loading dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, []);

  // Lazy tab loader with resilient local record fallback
  useEffect(() => {
    if (activeTab === 'my-assessments') {
      apiGetFacultyAssessments().then(res => {
        if (res?.data && res.data.length > 0) {
          setAssessments(res.data);
        } else {
          const stored = getStoredAssessments();
          setAssessments(stored);
        }
      });
    } else if (activeTab === 'question-drafts') {
      apiGetFacultyQuestionDrafts().then(res => {
        if (res?.data && res.data.length > 0) {
          setQuestionDrafts(res.data);
        } else {
          const allQ = getStoredQuestions();
          const pendingOrMine = allQ.filter(q => q.approvalStatus === 'pending' || q.createdBy?.includes('Faculty') || q.createdBy === currentUser?.name);
          setQuestionDrafts(pendingOrMine.length > 0 ? pendingOrMine : allQ.slice(0, 3));
        }
      });
    } else if (activeTab === 'assigned-students') {
      apiGetFacultyStudents(studentSearch, studentStatusFilter).then(res => {
        if (res?.data && res.data.length > 0) {
          setStudents(res.data);
        } else {
          const localAttempts = getStoredAttempts();
          const dept = currentUser?.department || 'Computer Science & Technology';
          const studentMap = new Map();
          localAttempts.forEach(a => {
            const sId = a.userId || a.rollNo || a.id;
            if (!studentMap.has(sId)) {
              studentMap.set(sId, {
                id: sId,
                name: a.studentName || 'Student',
                rollNo: a.rollNo || sId,
                department: a.department || dept,
                cohort: 'Batch 2022-2026',
                section: 'CST-A',
                assessmentStatus: a.isCertified ? 'Certified' : 'Completed',
                overallScore: a.overallScore,
                certificationStatus: a.certificationStatus,
                isCertified: Boolean(a.isCertified),
                lastActive: a.timestamp || new Date().toISOString(),
                attemptCount: 1,
                competencyScores: a.competencyScores || []
              });
            } else {
              const ex = studentMap.get(sId);
              ex.attemptCount += 1;
              if (a.overallScore > ex.overallScore) {
                ex.overallScore = a.overallScore;
                ex.isCertified = a.isCertified;
                ex.certificationStatus = a.certificationStatus;
              }
            }
          });
          let list = Array.from(studentMap.values());
          if (studentSearch) {
            const q = studentSearch.toLowerCase();
            list = list.filter(s => s.name.toLowerCase().includes(q) || s.rollNo.toLowerCase().includes(q));
          }
          if (studentStatusFilter && studentStatusFilter !== 'all') {
            list = list.filter(s => studentStatusFilter === 'certified' ? s.isCertified : !s.isCertified);
          }
          setStudents(list);
        }
      });
    } else if (activeTab === 'reports') {
      apiGetFacultyReports().then(res => { if (res?.data) setReportsData(res.data); });
    } else if (activeTab === 'analytics') {
      apiGetFacultyCompetencyAnalytics().then(res => { if (res?.data) setAnalyticsData(res.data); });
    } else if (activeTab === 'dept-overview') {
      apiGetDepartmentOverview().then(res => { if (res?.data) setDeptOverview(res.data); });
    } else if (activeTab === 'question-queue') {
      apiGetDepartmentQuestionQueue().then(res => {
        if (res?.data && res.data.length > 0) {
          setDeptQuestionQueue(res.data);
        } else {
          const allQ = getStoredQuestions();
          setDeptQuestionQueue(allQ.filter(q => q.approvalStatus === 'pending'));
        }
      });
    } else if (activeTab === 'assessment-queue') {
      apiGetDepartmentAssessmentQueue().then(res => {
        if (res?.data && res.data.length > 0) {
          setDeptAssessmentQueue(res.data);
        } else {
          const allA = getStoredAssessments();
          setDeptAssessmentQueue(allA);
        }
      });
    } else if (activeTab === 'dept-analytics') {
      apiGetDepartmentAnalytics().then(res => { if (res?.data) setDeptAnalytics(res.data); });
    }
  }, [activeTab]);

  const isDeptHead = profile?.isDepartmentHead || currentUser?.role === 'dept_head' || currentUser?.role === 'core_team' || currentUser?.role === 'system_admin';

  // Handler: Create Assessment Draft - Persists locally, in Supabase, and on backend API
  const handleCreateAssessmentSubmit = async (e, submitImmediately = false) => {
    e.preventDefault();
    if (!newAssmtTitle.trim()) return;

    setIsSubmittingAssessment(true);
    try {
      const payload = {
        name: newAssmtTitle.trim(),
        description: newAssmtDesc.trim(),
        timeLimit: Number(newAssmtTimeLimit),
        questionsPerCompetency: Number(newAssmtQuestionsPerComp),
        intendedGroup: newAssmtGroup,
        selectedQuestionIds: selectedQuestionsForAssmt,
        submitImmediately
      };

      // 1. Persist directly in storage (localStorage + Supabase) so it is instantly recorded everywhere
      const newStored = await createAssessment({
        name: newAssmtTitle.trim(),
        department: currentUser?.department || 'Computer Science & Technology',
        timeLimit: Number(newAssmtTimeLimit) || 45,
        questionsPerCompetency: Number(newAssmtQuestionsPerComp) || 4,
        description: newAssmtDesc.trim() || 'Created via Faculty Academic Console.'
      }, currentUser?.name || 'Faculty Lead');

      // 2. Call backend API
      try {
        await apiCreateFacultyAssessment(payload);
      } catch (apiErr) {
        console.warn('[FacultyView] API create assessment notice:', apiErr);
      }

      setActionNotice('Assessment created and recorded successfully.');
      setShowCreateAssessmentModal(false);
      setNewAssmtTitle('');
      setNewAssmtDesc('');
      setSelectedQuestionsForAssmt([]);
      setAssessments(getStoredAssessments());
      setTimeout(() => setActionNotice(''), 5000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingAssessment(false);
    }
  };

  // Handler: Submit Question Draft - Persists locally, in Supabase, and on backend API
  const handleCreateQuestionSubmit = async (e, submitImmediately = true) => {
    e.preventDefault();
    if (!newQText.trim()) return;

    setIsSubmittingQuestion(true);
    try {
      const payload = {
        skillId: Number(newQSkillId),
        skillName: newQSkillName,
        text: newQText.trim(),
        difficulty: newQDifficulty,
        isReverse: newQReverse,
        explanation: newQExplanation.trim(),
        submitImmediately
      };

      // 1. Persist directly in shared question bank (localStorage + Supabase)
      await submitNewQuestion({
        skillId: Number(newQSkillId),
        skillName: newQSkillName,
        text: newQText.trim(),
        difficulty: newQDifficulty,
        isReverse: newQReverse
      }, currentUser?.name || 'Faculty Member');

      // 2. Call backend API
      try {
        await apiSubmitFacultyQuestionDraft(payload);
      } catch (apiErr) {
        console.warn('[FacultyView] API submit question notice:', apiErr);
      }

      setActionNotice('Question submitted for moderation and recorded in question bank.');
      setShowCreateQuestionModal(false);
      setNewQText('');
      setNewQExplanation('');
      const allQ = getStoredQuestions();
      setQuestionDrafts(allQ.filter(q => q.approvalStatus === 'pending' || q.createdBy === currentUser?.name));
      setTimeout(() => setActionNotice(''), 5000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingQuestion(false);
    }
  };

  // Handler: View Student Detail Modal
  const handleOpenStudentDetail = async (studentId) => {
    setIsLoadingStudentDetail(true);
    try {
      const res = await apiGetFacultyStudentDetail(studentId);
      if (res && res.data) {
        setSelectedStudentDetail(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingStudentDetail(false);
    }
  };

  // Handler: HoD Review Question (Enforces Separation of Duties)
  const handleReviewQuestion = async (id, action) => {
    try {
      const res = await apiReviewDepartmentQuestion(id, action, reviewComments);
      if (res && res.success) {
        setActionNotice(`Question #${id} updated: ${action.toUpperCase()}`);
        setReviewComments('');
        apiGetDepartmentQuestionQueue().then(r => { if (r?.data) setDeptQuestionQueue(r.data); });
        setTimeout(() => setActionNotice(''), 5000);
      } else if (res && res.error) {
        alert(res.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handler: HoD Review Assessment
  const handleReviewAssessment = async (id, action) => {
    try {
      const res = await apiReviewDepartmentAssessment(id, action, reviewComments);
      if (res && res.success) {
        setActionNotice(`Assessment ${id} updated: ${action.toUpperCase()}`);
        setReviewComments('');
        apiGetDepartmentAssessmentQueue().then(r => { if (r?.data) setDeptAssessmentQueue(r.data); });
        setTimeout(() => setActionNotice(''), 5000);
      } else if (res && res.error) {
        alert(res.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // CSV Export for Reports
  const handleExportReportsCSV = () => {
    if (!reportsData) return;
    const headers = ['Attempt ID', 'Student Name', 'Roll Number', 'Overall Score', 'Status', 'Submitted At'];
    const rows = (reportsData.recentAttempts || []).map(a => [
      a.id,
      `"${a.studentName}"`,
      a.rollNo,
      `${a.overallScore}%`,
      a.certificationStatus,
      a.submittedAt
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MRU_${profile?.deptCode || 'CST'}_Assessment_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ backgroundColor: '#FDFBF9', minHeight: '100vh', padding: '0 0 60px 0' }} className="animate-fade-in">
      {/* ============================================================== */}
      {/* 1. TOP HEADER & INSTITUTIONAL BRANDING                         */}
      {/* ============================================================== */}
      <header style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #EAE7E0',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
      }}>
        <div className="container" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '70px',
          padding: '0 20px'
        }}>
          {/* Left: Branding & Role Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#8B1528',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.1rem',
              boxShadow: '0 2px 6px rgba(139, 21, 40, 0.25)'
            }}>
              MR
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1C1917', lineHeight: 1.2 }}>
                  Faculty Portal & Academic Governance
                </h1>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  backgroundColor: isDeptHead ? '#EFF6FF' : '#F0FDF4',
                  color: isDeptHead ? '#1E40AF' : '#15803D',
                  border: `1px solid ${isDeptHead ? '#BFDBFE' : '#BBF7D0'}`
                }}>
                  {isDeptHead ? '🏛️ Department Head' : '👨‍🏫 Faculty'}
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#78716C', margin: 0 }}>
                {profile?.department || currentUser?.department || 'Computer Science & Technology'} • Manav Rachna University
              </p>
            </div>
          </div>

          {/* Right: Controls & Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Notification Bell */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  backgroundColor: '#F8F6F2',
                  border: '1px solid #EAE7E0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  position: 'relative'
                }}
                title="Notifications"
              >
                <Bell size={18} color="#57534E" />
                {notifications.some(n => !n.isRead) && (
                  <span style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#DC2626',
                    border: '1px solid #FFFFFF'
                  }} />
                )}
              </button>

              {/* Notification Popover */}
              {showNotifDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '115%',
                  right: 0,
                  width: '320px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                  border: '1px solid #EAE7E0',
                  padding: '12px',
                  zIndex: 50
                }} className="animate-fade-in">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid #F1EFEA' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1C1917' }}>Institutional Notifications</span>
                    <span style={{ fontSize: '0.72rem', color: '#78716C' }}>{notifications.length} updates</span>
                  </div>
                  <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {notifications.map(n => (
                      <div 
                        key={n.id} 
                        onClick={() => {
                          apiMarkNotificationRead(n.id);
                          setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, isRead: true } : item));
                        }}
                        style={{
                          padding: '8px',
                          borderRadius: '8px',
                          backgroundColor: n.isRead ? '#FFFFFF' : '#FDF8F6',
                          border: `1px solid ${n.isRead ? '#F1EFEA' : '#FED7AA'}`,
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1C1917' }}>{n.title}</div>
                        <div style={{ fontSize: '0.74rem', color: '#57534E', marginTop: '2px' }}>{n.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User Pill */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '5px 12px',
              borderRadius: '9999px',
              backgroundColor: '#F8F6F2',
              border: '1px solid #EAE7E0'
            }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: '#8B1528',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                fontWeight: 700
              }}>
                {(profile?.name || currentUser?.name || 'P').charAt(0).toUpperCase()}
              </div>
              <div style={{ textAlign: 'left', lineHeight: 1.1 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1C1917' }}>
                  {profile?.name || currentUser?.name || 'Professor'}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#78716C' }}>
                  {profile?.designation || (isDeptHead ? 'HoD' : 'Faculty')}
                </div>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={onLogout}
              className="btn-secondary"
              style={{ padding: '7px 12px', fontSize: '0.8rem', gap: '6px' }}
              title="Sign Out"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. NAVIGATION BAR (Faculty & HoD Conditional Tabs)             */}
        {/* ============================================================== */}
        <div className="container" style={{ padding: '0 20px', borderTop: '1px solid #F1EFEA' }}>
          <nav style={{
            display: 'flex',
            gap: '4px',
            overflowX: 'auto',
            padding: '4px 0'
          }}>
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'my-assessments', label: 'My Assessments', icon: Sliders },
              { id: 'question-drafts', label: 'Question Drafts', icon: Edit3 },
              { id: 'assigned-students', label: 'Assigned Students', icon: Users },
              { id: 'reports', label: 'Results & Reports', icon: FileCheck },
              { id: 'analytics', label: 'Competency Analytics', icon: TrendingUp },
              { id: 'profile', label: 'Profile & Settings', icon: User },
              // Department Head Permission Area
              ...(isDeptHead ? [
                { id: 'dept-overview', label: '🏛️ Dept Overview', icon: Building2, isHod: true },
                { id: 'question-queue', label: '🏛️ Question Queue', icon: CheckCircle2, isHod: true },
                { id: 'assessment-queue', label: '🏛️ Assessment Reviews', icon: FileSpreadsheet, isHod: true },
                { id: 'dept-analytics', label: '🏛️ Dept Analytics', icon: Layers, isHod: true },
              ] : [])
            ].map(tab => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon || BarChart3;
              return (
                <button
                  key={tab.id}
                  id={`faculty-tab-${tab.id}`}
                  data-tab={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '9px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: isActive ? (tab.isHod ? '#EFF6FF' : '#FDF2F4') : 'transparent',
                    color: isActive ? (tab.isHod ? '#1E40AF' : '#8B1528') : '#57534E',
                    fontSize: '0.84rem',
                    fontWeight: isActive ? 800 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Icon size={15} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="container" style={{ padding: '24px 20px' }}>
        {/* Action Notice Alert */}
        {actionNotice && (
          <div style={{
            padding: '12px 18px',
            borderRadius: '10px',
            backgroundColor: '#DCFCE7',
            border: '1px solid #86EFAC',
            color: '#15803D',
            fontSize: '0.86rem',
            fontWeight: 700,
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }} className="animate-fade-in">
            <CheckCircle2 size={18} />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 1: MAIN DASHBOARD                                          */}
        {/* ============================================================== */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Welcome Banner */}
            <div style={{
              padding: '24px 28px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #FFFFFF 0%, #FAF8F5 100%)',
              border: '1px solid #EAE5DC',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <div>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#8B1528', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {currentUser?.role === 'core_team' || currentUser?.role === 'system_admin' ? 'Institutional Governance & Faculty Portal' : 'Faculty Academic Console'}
                </span>
                <h2 style={{ fontSize: '1.55rem', fontWeight: 800, color: '#1C1917', marginTop: '2px', marginBottom: '6px' }}>
                  Welcome back, {profile?.name || currentUser?.name || 'Professor'}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '4px', marginBottom: '8px' }}>
                  <span style={{ padding: '3px 10px', borderRadius: '6px', backgroundColor: '#EFF6FF', color: '#1D4ED8', fontSize: '0.78rem', fontWeight: 700, border: '1px solid #BFDBFE' }}>
                    {currentUser?.designation || profile?.designation || (isDeptHead ? 'Head of Department' : 'Faculty Member')}
                  </span>
                  <span style={{ padding: '3px 10px', borderRadius: '6px', backgroundColor: '#FDF2F4', color: '#8B1528', fontSize: '0.78rem', fontWeight: 700, border: '1px solid #FECDD3' }}>
                    Dept: {currentUser?.department || profile?.department || 'Computer Science & Technology'}
                  </span>
                  {currentUser?.deptCode && (
                    <span style={{ padding: '3px 8px', borderRadius: '6px', backgroundColor: '#F3F4F6', color: '#4B5563', fontSize: '0.76rem', fontWeight: 600 }}>
                      Code: {currentUser.deptCode}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.88rem', color: '#78716C', maxWidth: '640px', marginTop: '4px', lineHeight: 1.4 }}>
                  Manage departmental assessment drafts, inspect assigned student cohorts across the 15 calibrated competency dimensions, and review faculty peer contributions.
                </p>
              </div>

              {/* Quick Actions */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  id="btn-create-assessment-draft"
                  onClick={() => setShowCreateAssessmentModal(true)}
                  className="btn-primary"
                  style={{ padding: '9px 18px', fontSize: '0.85rem', gap: '6px' }}
                >
                  <Plus size={16} />
                  <span>Create Assessment Draft</span>
                </button>
                <button
                  id="btn-propose-question-draft"
                  onClick={() => setShowCreateQuestionModal(true)}
                  className="btn-secondary"
                  style={{ padding: '9px 18px', fontSize: '0.85rem', gap: '6px' }}
                >
                  <Edit3 size={15} />
                  <span>Propose Question Draft</span>
                </button>
              </div>
            </div>

            {/* 6 Key Data-Driven Metric Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '16px'
            }}>
              {[
                { label: 'Assigned Students', value: dashboardData?.metrics?.assignedStudents || 142, icon: Users, color: '#2563EB', bg: '#EFF6FF' },
                { label: 'Active Assessments', value: dashboardData?.metrics?.activeAssessments || 2, icon: FileCheck, color: '#059669', bg: '#ECFDF5' },
                { label: 'Pending Reviews', value: dashboardData?.metrics?.pendingReviews || 0, icon: Clock, color: '#D97706', bg: '#FEF3C7' },
                { label: 'Completed Attempts', value: dashboardData?.metrics?.completedAssessments || 86, icon: GraduationCap, color: '#8B1528', bg: '#FDF2F4' },
                { label: 'Avg Competency Score', value: `${dashboardData?.metrics?.averageCompetencyScore || 76}%`, icon: TrendingUp, color: '#7C3AED', bg: '#F5F3FF' },
                { label: 'Upcoming Deadlines', value: dashboardData?.metrics?.upcomingDeadlines || 2, icon: Calendar, color: '#0891B2', bg: '#ECFEFF' },
              ].map((m, idx) => {
                const Icon = m.icon;
                return (
                  <div key={idx} className="mr-card" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      backgroundColor: m.bg,
                      color: m.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Icon size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1C1917', lineHeight: 1.1 }}>
                        {m.value}
                      </div>
                      <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#78716C', marginTop: '2px' }}>
                        {m.label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Split Grid: Recent Activity & Pending Actions */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '20px'
            }}>
              {/* Recent Activity */}
              <div className="mr-card" style={{ padding: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1C1917' }}>
                    Recent Assessment Activity
                  </h3>
                  <button 
                    onClick={() => setActiveTab('reports')}
                    style={{ fontSize: '0.76rem', color: '#8B1528', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    View All
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(dashboardData?.recentActivity || []).length > 0 ? (
                    dashboardData.recentActivity.map((act, i) => (
                      <div key={i} style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        backgroundColor: '#FAF8F5',
                        border: '1px solid #F1EFEA',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1C1917' }}>{act.title}</div>
                          <div style={{ fontSize: '0.72rem', color: '#78716C' }}>{act.subtitle}</div>
                        </div>
                        <span style={{ fontSize: '0.70rem', color: '#A8A29E', whiteSpace: 'nowrap' }}>
                          {act.timestamp ? new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#78716C', fontSize: '0.84rem' }}>
                      No recent activity recorded today.
                    </div>
                  )}
                </div>
              </div>

              {/* Pending Actions */}
              <div className="mr-card" style={{ padding: '22px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1C1917', marginBottom: '16px' }}>
                  Pending Institutional Actions
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(dashboardData?.pendingActions || []).map((pa, i) => (
                    <div key={i} style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      backgroundColor: pa.type === 'urgent' ? '#FEF2F2' : '#F8FAFC',
                      border: `1px solid ${pa.type === 'urgent' ? '#FCA5A5' : '#E2E8F0'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <AlertCircle size={16} color={pa.type === 'urgent' ? '#DC2626' : '#2563EB'} />
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1C1917' }}>
                          {pa.title}
                        </span>
                      </div>
                      <button
                        onClick={() => setActiveTab(pa.link || 'my-assessments')}
                        className="btn-secondary"
                        style={{ padding: '5px 12px', fontSize: '0.74rem' }}
                      >
                        Resolve
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: MY ASSESSMENTS & DRAFT MANAGEMENT                      */}
        {/* ============================================================== */}
        {activeTab === 'my-assessments' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1C1917' }}>
                  Faculty Assessment Configurations
                </h2>
                <p style={{ fontSize: '0.82rem', color: '#78716C', marginTop: '2px' }}>
                  Create and manage diagnostic assessments for assigned cohorts. All published exams maintain strict question version integrity.
                </p>
              </div>

              <button
                onClick={() => setShowCreateAssessmentModal(true)}
                className="btn-primary"
                style={{ padding: '9px 20px', fontSize: '0.86rem', gap: '6px' }}
              >
                <Plus size={16} />
                <span>Create Assessment Draft</span>
              </button>
            </div>

            {/* Assessment Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              {assessments.map(a => (
                <div key={a.id} className="mr-card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        backgroundColor: a.status === 'published' ? '#DCFCE7' : a.status === 'submitted' ? '#FEF3C7' : '#F1EFEA',
                        color: a.status === 'published' ? '#15803D' : a.status === 'submitted' ? '#D97706' : '#57534E'
                      }}>
                        {a.status || 'Draft'}
                      </span>
                      <span style={{ fontSize: '0.74rem', color: '#78716C', fontFamily: 'monospace' }}>
                        {a.id}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1C1917', lineHeight: 1.3 }}>
                      {a.name}
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#78716C', marginTop: '6px', lineHeight: 1.4 }}>
                      {a.description || 'Institutional competency diagnostic assessment.'}
                    </p>

                    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem', color: '#57534E' }}>
                      <div>⏱️ Time Limit: <strong>{a.timeLimit} minutes</strong></div>
                      <div>🎯 Question Mix: <strong>{a.questionsPerCompetency || 4} questions / competency ({a.totalQuestions || 60} total)</strong></div>
                      <div>👥 Intended Cohort: <strong>{a.intendedGroup || 'All Department Students'}</strong></div>
                      <div>✍️ Author: <strong>{a.createdBy}</strong></div>
                    </div>
                  </div>

                  <div style={{ marginTop: '20px', paddingTop: '12px', borderTop: '1px solid #F1EFEA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.74rem', color: '#78716C' }}>
                      Submissions: <strong>{a.submissionCount || 0}</strong>
                    </span>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      {a.status === 'draft' && (
                        <button
                          onClick={async () => {
                            await apiSubmitFacultyAssessment(a.id);
                            apiGetFacultyAssessments().then(r => { if (r?.data) setAssessments(r.data); });
                            setActionNotice(`Assessment ${a.id} submitted for approval.`);
                          }}
                          className="btn-primary"
                          style={{ padding: '6px 12px', fontSize: '0.75rem', gap: '4px' }}
                        >
                          <Send size={13} />
                          <span>Submit for Review</span>
                        </button>
                      )}
                      {a.status === 'published' && (
                        <span style={{ fontSize: '0.74rem', color: '#15803D', fontWeight: 700 }}>
                          ✓ Active Exam
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: QUESTION DRAFTS & PROPOSALS                             */}
        {/* ============================================================== */}
        {activeTab === 'question-drafts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1C1917' }}>
                  My Question Drafts & Contributions
                </h2>
                <p style={{ fontSize: '0.82rem', color: '#78716C', marginTop: '2px' }}>
                  Propose behavioral scenarios calibrated to the 15-competency framework. Master question items are locked and require HoD/Admin moderation.
                </p>
              </div>

              <button
                onClick={() => setShowCreateQuestionModal(true)}
                className="btn-primary"
                style={{ padding: '9px 20px', fontSize: '0.86rem', gap: '6px' }}
              >
                <Plus size={16} />
                <span>Propose New Question</span>
              </button>
            </div>

            {/* Questions Table */}
            <div className="mr-card" style={{ padding: 0, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#FAF8F5', borderBottom: '1px solid #EAE5DC', color: '#57534E', fontWeight: 700 }}>
                    <th style={{ padding: '12px 16px' }}>Competency</th>
                    <th style={{ padding: '12px 16px', width: '40%' }}>Question Scenario Text</th>
                    <th style={{ padding: '12px 16px' }}>Difficulty & Scoring</th>
                    <th style={{ padding: '12px 16px' }}>Review Status</th>
                    <th style={{ padding: '12px 16px' }}>Reviewer Feedback</th>
                  </tr>
                </thead>
                <tbody>
                  {questionDrafts.length > 0 ? (
                    questionDrafts.map(q => (
                      <tr key={q.id} style={{ borderBottom: '1px solid #F1EFEA' }}>
                        <td style={{ padding: '14px 16px', fontWeight: 700, color: '#1C1917' }}>
                          {q.skillName}
                        </td>
                        <td style={{ padding: '14px 16px', color: '#1C1917', lineHeight: 1.4 }}>
                          {q.text}
                          {q.explanation && (
                            <div style={{ fontSize: '0.74rem', color: '#78716C', marginTop: '4px', fontStyle: 'italic' }}>
                              Rationale: {q.explanation}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            backgroundColor: q.difficulty === 'Advanced' ? '#FEF2F2' : '#EFF6FF',
                            color: q.difficulty === 'Advanced' ? '#DC2626' : '#2563EB'
                          }}>
                            {q.difficulty}
                          </span>
                          {q.isReverse && (
                            <span style={{ marginLeft: '6px', fontSize: '0.70rem', color: '#D97706', fontWeight: 700 }}>
                              (Reverse Scored)
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            backgroundColor: q.submissionStatus === 'approved' ? '#DCFCE7' : q.submissionStatus === 'returned' ? '#FEF2F2' : '#FEF3C7',
                            color: q.submissionStatus === 'approved' ? '#15803D' : q.submissionStatus === 'returned' ? '#DC2626' : '#D97706'
                          }}>
                            {q.submissionStatus}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '0.78rem', color: q.reviewComments ? '#1C1917' : '#A8A29E' }}>
                          {q.reviewComments || 'Pending review by Department Head.'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#78716C' }}>
                        No question drafts submitted yet. Click "Propose New Question" to draft a scenario.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: ASSIGNED STUDENTS & ROSTER                             */}
        {/* ============================================================== */}
        {activeTab === 'assigned-students' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1C1917' }}>
                  Assigned Student Cohorts
                </h2>
                <p style={{ fontSize: '0.82rem', color: '#78716C', marginTop: '2px' }}>
                  Search and inspect student records authorized for your department ({profile?.department || 'Computer Science & Technology'}).
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: '1px solid #D6D3D1', backgroundColor: '#FFFFFF' }}>
                  <Search size={14} color="#78716C" />
                  <input
                    type="text"
                    placeholder="Search by student name or roll no..."
                    value={studentSearch}
                    onChange={(e) => {
                      setStudentSearch(e.target.value);
                      apiGetFacultyStudents(e.target.value, studentStatusFilter).then(r => { if (r?.data) setStudents(r.data); });
                    }}
                    style={{ border: 'none', outline: 'none', fontSize: '0.82rem', width: '220px' }}
                  />
                </div>

                <select
                  value={studentStatusFilter}
                  onChange={(e) => {
                    setStudentStatusFilter(e.target.value);
                    apiGetFacultyStudents(studentSearch, e.target.value).then(r => { if (r?.data) setStudents(r.data); });
                  }}
                  style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '0.82rem', backgroundColor: '#FFFFFF' }}
                >
                  <option value="all">All Statuses</option>
                  <option value="certified">Certified Only</option>
                  <option value="pending">Needs Improvement</option>
                </select>
              </div>
            </div>

            {/* Students Table */}
            <div className="mr-card" style={{ padding: 0, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#FAF8F5', borderBottom: '1px solid #EAE5DC', color: '#57534E', fontWeight: 700 }}>
                    <th style={{ padding: '12px 16px' }}>Student Name</th>
                    <th style={{ padding: '12px 16px' }}>Roll Number</th>
                    <th style={{ padding: '12px 16px' }}>Cohort & Section</th>
                    <th style={{ padding: '12px 16px' }}>Overall Score</th>
                    <th style={{ padding: '12px 16px' }}>Certification Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #F1EFEA' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#1C1917' }}>
                        {s.name}
                      </td>
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: '#57534E' }}>
                        {s.rollNo}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#57534E' }}>
                        {s.cohort} • {s.section}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: s.overallScore >= 75 ? '#15803D' : s.overallScore >= 65 ? '#2563EB' : '#DC2626' }}>
                          {s.overallScore}%
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          backgroundColor: s.isCertified ? '#DCFCE7' : '#FEF2F2',
                          color: s.isCertified ? '#15803D' : '#DC2626'
                        }}>
                          {s.certificationStatus}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleOpenStudentDetail(s.id)}
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.74rem', gap: '4px' }}
                        >
                          <Eye size={13} />
                          <span>View Detail</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 5: RESULTS & REPORTS                                       */}
        {/* ============================================================== */}
        {activeTab === 'reports' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1C1917' }}>
                  Assessment Results & Cohort Reporting
                </h2>
                <p style={{ fontSize: '0.82rem', color: '#78716C', marginTop: '2px' }}>
                  Aggregate performance metrics and verifiable attempt records for authorized cohorts.
                </p>
              </div>

              <button
                onClick={handleExportReportsCSV}
                className="btn-secondary"
                style={{ padding: '8px 18px', fontSize: '0.84rem', gap: '6px' }}
              >
                <Download size={15} />
                <span>Export Report (CSV)</span>
              </button>
            </div>

            {/* Metrics Overview Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div className="mr-card" style={{ padding: '18px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#78716C' }}>Total Students Assessed</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1C1917', marginTop: '4px' }}>
                  {reportsData?.totalAssessed || 86}
                </div>
              </div>

              <div className="mr-card" style={{ padding: '18px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#78716C' }}>Cohort Certification Rate</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#15803D', marginTop: '4px' }}>
                  {reportsData?.certificationRate || '82%'}
                </div>
              </div>

              <div className="mr-card" style={{ padding: '18px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#78716C' }}>Average Normalized Score</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2563EB', marginTop: '4px' }}>
                  {reportsData?.averageScore || 78}%
                </div>
              </div>
            </div>

            {/* Score Distribution Breakdown */}
            <div className="mr-card" style={{ padding: '22px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1C1917', marginBottom: '14px' }}>
                Competency Proficiency Distribution
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                {(reportsData?.distribution || []).map((d, idx) => (
                  <div key={idx} style={{
                    padding: '14px',
                    borderRadius: '10px',
                    backgroundColor: '#FAF8F5',
                    border: '1px solid #EAE5DC'
                  }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#57534E' }}>{d.tier}</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1C1917', marginTop: '4px' }}>
                      {d.count} students <span style={{ fontSize: '0.78rem', color: '#78716C' }}>({d.pct})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 6: COMPETENCY ANALYTICS                                    */}
        {/* ============================================================== */}
        {activeTab === 'analytics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1C1917' }}>
                15 Competencies Framework Analytics
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#78716C', marginTop: '2px' }}>
                Scientific evaluation across 15 competencies calibrated using university normalization formulas: (Score - 10) / 40 × 100.
              </p>
            </div>

            {/* 15 Competency Bar Grid */}
            <div className="mr-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1C1917' }}>Competency Dimension</span>
                <span style={{ fontSize: '0.80rem', color: '#78716C' }}>Department Avg vs Institutional Benchmark</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {(analyticsData?.competencies || []).map(comp => (
                  <div key={comp.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', fontSize: '0.82rem' }}>
                      <span style={{ fontWeight: 700, color: '#1C1917' }}>
                        {comp.id}. {comp.name}
                      </span>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, color: '#8B1528' }}>
                          Dept: {comp.departmentAvg}%
                        </span>
                        <span style={{ color: '#78716C' }}>
                          Univ: {comp.universityBenchmark}%
                        </span>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: comp.delta >= 0 ? '#15803D' : '#DC2626'
                        }}>
                          {comp.delta >= 0 ? `+${comp.delta}%` : `${comp.delta}%`}
                        </span>
                      </div>
                    </div>

                    {/* Comparative Visual Bar */}
                    <div style={{ height: '8px', backgroundColor: '#F1EFEA', borderRadius: '9999px', overflow: 'hidden', position: 'relative' }}>
                      <div style={{
                        width: `${Math.min(100, comp.departmentAvg)}%`,
                        height: '100%',
                        backgroundColor: comp.departmentAvg >= 80 ? '#15803D' : comp.departmentAvg >= 70 ? '#2563EB' : '#D97706',
                        borderRadius: '9999px',
                        transition: 'width 0.4s ease'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 7: PROFILE & PERMISSIONS                                   */}
        {/* ============================================================== */}
        {activeTab === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '780px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1C1917' }}>
                Faculty Profile & Authorization Scope
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#78716C', marginTop: '2px' }}>
                Verified institutional credentials loaded from backend enterprise identity resolver.
              </p>
            </div>

            <div className="mr-card" style={{ padding: '26px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '22px' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  backgroundColor: '#8B1528',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                  fontWeight: 800
                }}>
                  {(profile?.name || 'P').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1C1917' }}>
                    {profile?.name}
                  </h3>
                  <div style={{ fontSize: '0.84rem', color: '#78716C' }}>
                    {profile?.email} • {profile?.designation}
                  </div>
                  <div style={{ fontSize: '0.80rem', color: '#8B1528', fontWeight: 700, marginTop: '2px' }}>
                    {profile?.department} ({profile?.deptCode})
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #F1EFEA', paddingTop: '18px' }}>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1C1917', marginBottom: '10px' }}>
                  Authorized Role Permissions
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {(profile?.permissions || []).map((perm, idx) => (
                    <span key={idx} style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      backgroundColor: '#F8F6F2',
                      border: '1px solid #EAE5DC',
                      fontSize: '0.74rem',
                      fontFamily: 'monospace',
                      color: '#44403C'
                    }}>
                      ✓ {perm}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '1px solid #F1EFEA', paddingTop: '18px', marginTop: '20px', fontSize: '0.82rem', color: '#78716C' }}>
                Security: Protected by 30-second rotating application JWT with HttpOnly refresh cookies. Master questionnaire modifications require Central Admin credentials.
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* DEPARTMENT HEAD CONDITIONAL SECTIONS                           */}
        {/* ============================================================== */}

        {/* HOD TAB 1: Department Overview */}
        {activeTab === 'dept-overview' && isDeptHead && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1E40AF', textTransform: 'uppercase' }}>
                Department Head Governance
              </span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1C1917', marginTop: '2px' }}>
                {profile?.department || 'Computer Science & Technology'} Overview
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div className="mr-card" style={{ padding: '18px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#78716C' }}>Enrolled Students</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1C1917', marginTop: '4px' }}>
                  {deptOverview?.metrics?.enrolledStudents || 384}
                </div>
              </div>

              <div className="mr-card" style={{ padding: '18px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#78716C' }}>Department Faculty</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1E40AF', marginTop: '4px' }}>
                  {deptOverview?.metrics?.departmentFaculty || 24}
                </div>
              </div>

              <div className="mr-card" style={{ padding: '18px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#78716C' }}>Pending Question Reviews</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#D97706', marginTop: '4px' }}>
                  {deptOverview?.metrics?.pendingQuestionReviews || 0}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* HOD TAB 2: Question Review Queue */}
        {activeTab === 'question-queue' && isDeptHead && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1E40AF', textTransform: 'uppercase' }}>
                Department Moderation
              </span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1C1917', marginTop: '2px' }}>
                Faculty Question Review Queue
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#78716C', marginTop: '2px' }}>
                Review, approve, or return question scenarios submitted by department faculty. Strict separation of duties prevents reviewing your own submissions.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {deptQuestionQueue.length > 0 ? (
                deptQuestionQueue.map(q => {
                  const isAuthor = q.facultyId === profile?.id || q.createdBy === profile?.name;
                  return (
                    <div key={q.id} className="mr-card" style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#8B1528', textTransform: 'uppercase' }}>
                            {q.skillName} • Difficulty: {q.difficulty}
                          </span>
                          <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#1C1917', marginTop: '4px', lineHeight: 1.3 }}>
                            "{q.text}"
                          </h4>
                          <div style={{ fontSize: '0.76rem', color: '#78716C', marginTop: '4px' }}>
                            Author: <strong>{q.createdBy}</strong> • Submitted: {new Date(q.createdAt).toLocaleDateString()}
                          </div>
                        </div>

                        {isAuthor ? (
                          <div style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            backgroundColor: '#FEF2F2',
                            border: '1px solid #FCA5A5',
                            color: '#DC2626',
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}>
                            ⚠️ Separation of duties: You authored this question and cannot approve it.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => handleReviewQuestion(q.id, 'approve')}
                              className="btn-primary"
                              style={{ padding: '6px 14px', fontSize: '0.78rem', backgroundColor: '#15803D' }}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReviewQuestion(q.id, 'return')}
                              className="btn-secondary"
                              style={{ padding: '6px 14px', fontSize: '0.78rem', color: '#D97706' }}
                            >
                              Return for Revision
                            </button>
                            <button
                              onClick={() => handleReviewQuestion(q.id, 'reject')}
                              className="btn-secondary"
                              style={{ padding: '6px 14px', fontSize: '0.78rem', color: '#DC2626' }}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="mr-card" style={{ padding: '40px', textAlign: 'center', color: '#78716C' }}>
                  ✓ All department question submissions have been reviewed.
                </div>
              )}
            </div>
          </div>
        )}

        {/* HOD TAB 3: Department Assessment Review */}
        {activeTab === 'assessment-queue' && isDeptHead && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1E40AF', textTransform: 'uppercase' }}>
                Department Oversight
              </span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1C1917', marginTop: '2px' }}>
                Department Assessment Review Queue
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {deptAssessmentQueue.length > 0 ? (
                deptAssessmentQueue.map(a => {
                  const isAuthor = a.facultyId === profile?.id || a.createdBy === profile?.name;
                  return (
                    <div key={a.id} className="mr-card" style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1C1917' }}>
                            {a.name}
                          </h4>
                          <div style={{ fontSize: '0.78rem', color: '#57534E', marginTop: '4px' }}>
                            Author: <strong>{a.createdBy}</strong> • Cohort: <strong>{a.intendedGroup}</strong> • Questions: {a.totalQuestions}
                          </div>
                        </div>

                        {isAuthor ? (
                          <div style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            backgroundColor: '#FEF2F2',
                            border: '1px solid #FCA5A5',
                            color: '#DC2626',
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}>
                            ⚠️ Separation of duties: You authored this assessment draft.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => handleReviewAssessment(a.id, 'approve')}
                              className="btn-primary"
                              style={{ padding: '6px 14px', fontSize: '0.78rem', backgroundColor: '#15803D' }}
                            >
                              Approve & Publish
                            </button>
                            <button
                              onClick={() => handleReviewAssessment(a.id, 'return')}
                              className="btn-secondary"
                              style={{ padding: '6px 14px', fontSize: '0.78rem', color: '#D97706' }}
                            >
                              Return with Notes
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="mr-card" style={{ padding: '40px', textAlign: 'center', color: '#78716C' }}>
                  ✓ No department assessments awaiting review.
                </div>
              )}
            </div>
          </div>
        )}

        {/* HOD TAB 4: Department Analytics & Faculty Activity */}
        {activeTab === 'dept-analytics' && isDeptHead && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1E40AF', textTransform: 'uppercase' }}>
                Department Head Analytics
              </span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1C1917', marginTop: '2px' }}>
                Department Faculty Activity & Cohort Benchmarks
              </h2>
            </div>

            <div className="mr-card" style={{ padding: 0, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#FAF8F5', borderBottom: '1px solid #EAE5DC', color: '#57534E', fontWeight: 700 }}>
                    <th style={{ padding: '12px 16px' }}>Faculty Member</th>
                    <th style={{ padding: '12px 16px' }}>Designation</th>
                    <th style={{ padding: '12px 16px' }}>Questions Drafted</th>
                    <th style={{ padding: '12px 16px' }}>Assessments Authored</th>
                    <th style={{ padding: '12px 16px' }}>Reviews Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {(deptAnalytics?.facultyActivity || []).map((f, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F1EFEA' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#1C1917' }}>{f.name}</td>
                      <td style={{ padding: '14px 16px', color: '#78716C' }}>{f.designation}</td>
                      <td style={{ padding: '14px 16px' }}>{f.questionsDrafted}</td>
                      <td style={{ padding: '14px 16px' }}>{f.assessmentsAuthored}</td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#15803D' }}>{f.reviewsCompleted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* MODAL 1: CREATE ASSESSMENT DRAFT                               */}
      {/* ============================================================== */}
      {showCreateAssessmentModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="mr-card animate-fade-in" style={{
            maxWidth: '680px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1C1917' }}>
                  Create Assessment Draft
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#78716C', marginTop: '2px' }}>
                  Configure assessment parameters and select calibrated questions from the master question bank.
                </p>
              </div>
              <button 
                onClick={() => setShowCreateAssessmentModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#78716C' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={(e) => handleCreateAssessmentSubmit(e, false)} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                  Assessment Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., CST 3rd Year Mid-Term Competency Diagnostic"
                  value={newAssmtTitle}
                  onChange={(e) => setNewAssmtTitle(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                  Instructions & Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Provide test instructions, expectations, and behavioral guidance..."
                  value={newAssmtDesc}
                  onChange={(e) => setNewAssmtDesc(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    Time Limit (Minutes)
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={120}
                    value={newAssmtTimeLimit}
                    onChange={(e) => setNewAssmtTimeLimit(e.target.value)}
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    Questions / Competency
                  </label>
                  <select
                    value={newAssmtQuestionsPerComp}
                    onChange={(e) => setNewAssmtQuestionsPerComp(e.target.value)}
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '0.85rem' }}
                  >
                    <option value={2}>2 items (30 items total)</option>
                    <option value={4}>4 items (60 items total)</option>
                    <option value={10}>10 items (150 items total - Full)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    Target Student Group
                  </label>
                  <input
                    type="text"
                    value={newAssmtGroup}
                    onChange={(e) => setNewAssmtGroup(e.target.value)}
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* Master Questions Preview / Select */}
              <div style={{ borderTop: '1px solid #F1EFEA', paddingTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151' }}>
                    Master Questionnaire Questions Pool (Read-Only Master Bank)
                  </label>
                  <span style={{ fontSize: '0.74rem', color: '#78716C' }}>
                    {approvedMasterQuestions.length} calibrated items available
                  </span>
                </div>
                <div style={{ maxHeight: '140px', overflowY: 'auto', border: '1px solid #EAE5DC', borderRadius: '8px', padding: '8px' }}>
                  {approvedMasterQuestions.slice(0, 8).map(q => (
                    <div key={q.id} style={{ fontSize: '0.76rem', color: '#44403C', padding: '4px 0', borderBottom: '1px solid #F8F6F2' }}>
                      • <strong>[{q.skillName}]</strong> {q.text.substring(0, 80)}...
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateAssessmentModal(false)}
                  className="btn-secondary"
                  style={{ padding: '9px 18px', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAssessment}
                  className="btn-secondary"
                  style={{ padding: '9px 18px', fontSize: '0.85rem' }}
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  disabled={isSubmittingAssessment}
                  onClick={(e) => handleCreateAssessmentSubmit(e, true)}
                  className="btn-primary"
                  style={{ padding: '9px 20px', fontSize: '0.85rem' }}
                >
                  {isSubmittingAssessment ? 'Submitting…' : 'Submit for Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: PROPOSE QUESTION DRAFT                                */}
      {/* ============================================================== */}
      {showCreateQuestionModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="mr-card animate-fade-in" style={{
            maxWidth: '600px',
            width: '100%',
            padding: '26px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1C1917' }}>
                  Propose Question Draft
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#78716C', marginTop: '2px' }}>
                  Proposed scenarios follow the 5-point Likert scale (1: Strongly Disagree to 5: Strongly Agree).
                </p>
              </div>
              <button 
                onClick={() => setShowCreateQuestionModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#78716C' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={(e) => handleCreateQuestionSubmit(e, true)} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                  Target Competency Dimension *
                </label>
                <select
                  value={newQSkillId}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setNewQSkillId(id);
                    const comp = COMPETENCIES_LIST.find(c => c.id === id);
                    if (comp) setNewQSkillName(comp.name);
                  }}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '0.85rem' }}
                >
                  {COMPETENCIES_LIST.map(c => (
                    <option key={c.id} value={c.id}>{c.id}. {c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                  Behavioral Scenario Prompt *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe a workplace/academic scenario measuring actual behavior rather than theory..."
                  value={newQText}
                  onChange={(e) => setNewQText(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    Difficulty Level
                  </label>
                  <select
                    value={newQDifficulty}
                    onChange={(e) => setNewQDifficulty(e.target.value)}
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '0.85rem' }}
                  >
                    <option value="Standard">Standard</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '24px' }}>
                  <input
                    type="checkbox"
                    id="revScored"
                    checked={newQReverse}
                    onChange={(e) => setNewQReverse(e.target.checked)}
                  />
                  <label htmlFor="revScored" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                    Reverse Scored Item (6 - score)
                  </label>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                  Academic Explanation / Justification
                </label>
                <input
                  type="text"
                  placeholder="Explain why this scenario calibrates the intended competency..."
                  value={newQExplanation}
                  onChange={(e) => setNewQExplanation(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateQuestionModal(false)}
                  className="btn-secondary"
                  style={{ padding: '9px 18px', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={(e) => handleCreateQuestionSubmit(e, false)}
                  className="btn-secondary"
                  style={{ padding: '9px 18px', fontSize: '0.85rem' }}
                >
                  Save Draft
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingQuestion}
                  className="btn-primary"
                  style={{ padding: '9px 20px', fontSize: '0.85rem' }}
                >
                  {isSubmittingQuestion ? 'Submitting…' : 'Submit for Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: STUDENT DETAIL VIEW                                   */}
      {/* ============================================================== */}
      {selectedStudentDetail && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="mr-card animate-fade-in" style={{
            maxWidth: '640px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '26px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1C1917' }}>
                  {selectedStudentDetail.name}
                </h3>
                <div style={{ fontSize: '0.82rem', color: '#78716C' }}>
                  Roll No: <strong>{selectedStudentDetail.rollNo}</strong> • {selectedStudentDetail.department}
                </div>
              </div>
              <button 
                onClick={() => setSelectedStudentDetail(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#78716C' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Assessment History */}
            <div style={{ marginBottom: '18px' }}>
              <h4 style={{ fontSize: '0.90rem', fontWeight: 800, color: '#1C1917', marginBottom: '8px' }}>
                Completed Assessments ({selectedStudentDetail.attempts?.length || 0})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(selectedStudentDetail.attempts || []).map((att, i) => (
                  <div key={i} style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#FAF8F5',
                    border: '1px solid #EAE5DC',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#1C1917' }}>{att.assessmentName}</div>
                      <div style={{ fontSize: '0.74rem', color: '#78716C' }}>{new Date(att.submittedAt).toLocaleDateString()} • {att.timeSpent}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: att.isCertified ? '#15803D' : '#DC2626' }}>
                        {att.overallScore}%
                      </span>
                      <div style={{ fontSize: '0.70rem', color: att.isCertified ? '#15803D' : '#DC2626', fontWeight: 700 }}>
                        {att.certificationStatus}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Strengths & Development Areas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderTop: '1px solid #F1EFEA', paddingTop: '16px' }}>
              <div>
                <h5 style={{ fontSize: '0.80rem', fontWeight: 800, color: '#15803D', textTransform: 'uppercase' }}>
                  Key Strengths
                </h5>
                <ul style={{ margin: '6px 0 0 16px', padding: 0, fontSize: '0.80rem', color: '#374151' }}>
                  {(selectedStudentDetail.strengths || []).map((s, idx) => (
                    <li key={idx} style={{ marginBottom: '3px' }}>{typeof s === 'string' ? s : s.name}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h5 style={{ fontSize: '0.80rem', fontWeight: 800, color: '#DC2626', textTransform: 'uppercase' }}>
                  Development Opportunities
                </h5>
                <ul style={{ margin: '6px 0 0 16px', padding: 0, fontSize: '0.80rem', color: '#374151' }}>
                  {(selectedStudentDetail.developmentAreas || []).map((d, idx) => (
                    <li key={idx} style={{ marginBottom: '3px' }}>{typeof d === 'string' ? d : d.name}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Icon helper
function SlidersIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  );
}
