import React, { useState, useEffect } from 'react';
import { 
  Users, 
  GraduationCap, 
  Building2, 
  FileCheck, 
  TrendingUp, 
  Download, 
  ChevronDown,
  Layers,
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  ShieldCheck,
  Database,
  RefreshCw,
  AlertCircle,
  Sliders,
  Filter,
  Check,
  Search,
  Trash2,
  Edit3,
  Copy,
  ExternalLink,
  Bot,
  Zap,
  Play,
  FileSpreadsheet,
  RotateCcw,
  Sparkles,
  Upload
} from 'lucide-react';
import { COMPETENCIES_DATA } from '../data/assessmentData';
import { 
  getStoredQuestions, 
  approveQuestion, 
  rejectQuestion, 
  submitNewQuestion,
  deleteQuestion,
  updateQuestion,
  batchApproveQuestions,
  batchRejectQuestions,
  getStoredAssessments,
  getStoredAttempts,
  createAssessment,
  updateAssessment,
  deleteAssessment,
  cloneAssessment,
  deleteAttempt,
  saveAssessments,
  saveQuestions,
  fetchLiveQuestions,
  fetchLiveAttempts,
  handleSeedData,
  USER_ROLES,
  getStoredAuthorizedTesters,
  saveAuthorizedTesters,
  isStrictTestingModeEnabled,
  setStrictTestingMode,
  getQuestionnaireSettings,
  saveQuestionnaireSettings,
  getSkillTimeLimit
} from '../lib/storage';
import * as XLSX from 'xlsx';
import { Mail, Send, ToggleLeft, ToggleRight, UserCheck, UserX, FileDown } from 'lucide-react';
import {
  apiGetQuestions,
  apiGetQuestionBankStats,
  apiUpdateQuestion,
  apiDeleteQuestion,
  apiPreviewImportQuestions,
  apiCommitImportQuestions,
  apiGetCompetencies,
  apiCreateCompetency,
  apiUpdateCompetency
} from '../lib/api';

export default function AdminView({ 
  setView, 
  currentUser, 
  userRole, 
  setUserRole, 
  onAssessmentsUpdated, 
  setActiveAttempt,
  setActiveAssessment
}) {
  // Tabs: 'overview' | 'moderation' | 'assessments' | 'roster'
  const [activeTab, setActiveTab] = useState(() => {
    if (userRole === 'dept_head') return 'moderation';
    return 'overview';
  });

  const isAdmin = userRole === USER_ROLES.CORE_TEAM || userRole === USER_ROLES.SYSTEM_ADMIN;

  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedDept, setSelectedDept] = useState('All');
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Question Bank & Moderation state
  const [questions, setQuestions] = useState(() => getStoredQuestions());
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected'
  const [skillFilter, setSkillFilter] = useState('all');
  const [reverseFilter, setReverseFilter] = useState('all'); // 'all' | 'standard' | 'reverse'
  const [questionSearch, setQuestionSearch] = useState('');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  
  // Question Bank Live Stats
  const [qbStats, setQbStats] = useState(null);
  const [isLoadingQb, setIsLoadingQb] = useState(false);

  // Bulk Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importPreviewData, setImportPreviewData] = useState(null);
  const [isImportValidating, setIsImportValidating] = useState(false);
  const [isImportCommitting, setIsImportCommitting] = useState(false);
  const [importStatusMessage, setImportStatusMessage] = useState('');

  // Competency Management state
  const [showCompetenciesModal, setShowCompetenciesModal] = useState(false);
  const [competenciesList, setCompetenciesList] = useState(() => COMPETENCIES_DATA);
  const [editingComp, setEditingComp] = useState(null);
  const [newCompName, setNewCompName] = useState('');
  const [newCompDesc, setNewCompDesc] = useState('');
  const [newCompAvg, setNewCompAvg] = useState(72);
  const [isSavingComp, setIsSavingComp] = useState(false);

  // Modals for Questions
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionSkillId, setNewQuestionSkillId] = useState('1');
  const [newQuestionReverse, setNewQuestionReverse] = useState(false);
  const [newQuestionDifficulty, setNewQuestionDifficulty] = useState('Intermediate');

  const [editingQuestion, setEditingQuestion] = useState(null);

  // Assessment Configuration state
  const [assessments, setAssessments] = useState(() => getStoredAssessments());
  const [showCreateAssessmentModal, setShowCreateAssessmentModal] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState(null);
  const [newAssmtTitle, setNewAssmtTitle] = useState('');
  const [newAssmtDept, setNewAssmtDept] = useState('Computer Science & Engineering');
  const [newAssmtTimeLimit, setNewAssmtTimeLimit] = useState(45);
  const [newAssmtQuestionsPerComp, setNewAssmtQuestionsPerComp] = useState(10);

  // Questionnaire Timings state (for individual human-centric skill questionnaires)
  const [questionnaireTimingSettings, setQuestionnaireTimingSettings] = useState(() => getQuestionnaireSettings());
  const [timingSavedFeedback, setTimingSavedFeedback] = useState(false);
  const [showPerSkillOverrides, setShowPerSkillOverrides] = useState(false);

  const handleSaveQuestionnaireTiming = (newDuration, perSkillMap = null) => {
    const updated = {
      ...questionnaireTimingSettings,
      durationMinutes: Math.max(1, Number(newDuration) || 10),
      perSkillDuration: perSkillMap !== null ? perSkillMap : (questionnaireTimingSettings.perSkillDuration || {})
    };
    setQuestionnaireTimingSettings(updated);
    saveQuestionnaireSettings(updated);
    setTimingSavedFeedback(true);
    setTimeout(() => setTimingSavedFeedback(false), 3000);
  };

  const handleUpdateSingleSkillTiming = (skillId, minutes) => {
    const updatedPerSkill = {
      ...(questionnaireTimingSettings.perSkillDuration || {}),
      [skillId]: Math.max(1, Number(minutes) || questionnaireTimingSettings.durationMinutes || 10)
    };
    handleSaveQuestionnaireTiming(questionnaireTimingSettings.durationMinutes, updatedPerSkill);
  };

  // Roster / Student Attempts state
  const [attempts, setAttempts] = useState(() => getStoredAttempts());
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterStatusFilter, setRosterStatusFilter] = useState('all'); // 'all' | 'certified' | 'pending'

  // Authorized Testers & Excel Testing Roster state
  const [authorizedTesters, setAuthorizedTesters] = useState(() => getStoredAuthorizedTesters());
  const [strictTestingMode, setStrictTestingModeState] = useState(() => isStrictTestingModeEnabled());
  const [testerSearch, setTesterSearch] = useState('');
  const [testerStatusMessage, setTesterStatusMessage] = useState('');
  const [isSendingInvites, setIsSendingInvites] = useState(false);
  const [inviteResultModal, setInviteResultModal] = useState(null);

  // Seed Data notification state
  const [seedNotification, setSeedNotification] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSyncingAttempts, setIsSyncingAttempts] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState(() => new Date());

  // Concurrently fetch and sync student attempts across clients & storage
  const syncLiveAttempts = async (showSpinner = false) => {
    if (showSpinner) setIsSyncingAttempts(true);
    try {
      // 1. Immediately read latest from localStorage (instant in-browser updates)
      const localAtt = getStoredAttempts();
      if (localAtt) setAttempts(localAtt);

      // 2. Fetch live attempts from SaaS backend / database
      const liveAtt = await fetchLiveAttempts();
      if (liveAtt && liveAtt.length > 0) {
        setAttempts(liveAtt);
      }
      setLastSyncedTime(new Date());
    } catch (err) {
      console.warn('[AdminView] Live synchronization warning:', err);
    } finally {
      if (showSpinner) setIsSyncingAttempts(false);
    }
  };

  // Initial live synchronization from database
  useEffect(() => {
    setIsLoadingQb(true);
    fetchLiveQuestions().then((live) => {
      if (live && live.length > 0) setQuestions(live);
      setIsLoadingQb(false);
    });
    fetchLiveAttempts().then((liveAtt) => {
      if (liveAtt && liveAtt.length > 0) setAttempts(liveAtt);
    });
    apiGetQuestionBankStats().then((res) => {
      if (res && res.success && res.data) setQbStats(res.data);
    });
    apiGetCompetencies().then((res) => {
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        setCompetenciesList(res.data);
      }
    });
  }, []);

  // Live Concurrent Synchronization: Cross-tab events, BroadcastChannel, and background polling
  useEffect(() => {
    // Cross-tab storage change listener
    const handleStorageChange = (e) => {
      if (!e.key || e.key === 'iccf_student_attempts' || e.key.includes('attempt')) {
        setAttempts(getStoredAttempts());
        setLastSyncedTime(new Date());
      }
    };

    // Custom in-window event (dispatched when student completes questionnaires)
    const handleCustomUpdate = () => {
      setAttempts(getStoredAttempts());
      setLastSyncedTime(new Date());
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('iccf_attempts_updated', handleCustomUpdate);

    // Cross-tab broadcast channel
    let bc = null;
    try {
      bc = new BroadcastChannel('iccf_attempts_channel');
      bc.onmessage = () => {
        setAttempts(getStoredAttempts());
        setLastSyncedTime(new Date());
      };
    } catch (e) {}

    // Background live polling interval (every 8 seconds)
    const pollInterval = setInterval(() => {
      syncLiveAttempts(false);
    }, 8000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('iccf_attempts_updated', handleCustomUpdate);
      if (bc) {
        try { bc.close(); } catch (e) {}
      }
      clearInterval(pollInterval);
    };
  }, []);

  // Refresh data periodically on tab change
  useEffect(() => {
    setQuestions(getStoredQuestions());
    setAssessments(getStoredAssessments());
    setAttempts(getStoredAttempts());
    setAuthorizedTesters(getStoredAuthorizedTesters());
    setStrictTestingModeState(isStrictTestingModeEnabled());
  }, [activeTab]);

  // Question moderation actions with backend API synchronization
  const handleApprove = async (id) => {
    const updated = await approveQuestion(id, currentUser?.name || 'Administrator');
    setQuestions(updated);
    apiGetQuestionBankStats().then((res) => { if (res?.data) setQbStats(res.data); });
  };

  const handleReject = async (id) => {
    const updated = await rejectQuestion(id, currentUser?.name || 'Administrator');
    setQuestions(updated);
    apiGetQuestionBankStats().then((res) => { if (res?.data) setQbStats(res.data); });
  };

  const handleDeleteQuestion = async (id) => {
    if (window.confirm(`Are you sure you want to permanently delete / retire Question #${id}?`)) {
      try {
        await apiDeleteQuestion(id);
      } catch (e) {
        console.warn('[Admin] API delete question notice:', e);
      }
      const updated = await deleteQuestion(id, currentUser?.name || 'Admin');
      setQuestions(updated);
      setSelectedQuestionIds(prev => prev.filter(qId => qId !== id));
      apiGetQuestionBankStats().then((res) => { if (res?.data) setQbStats(res.data); });
    }
  };

  const handleSaveEditQuestion = async (e) => {
    e.preventDefault();
    if (!editingQuestion) return;

    const skillObj = (competenciesList || COMPETENCIES_DATA).find(c => String(c.id) === String(editingQuestion.skillId));
    const updates = {
      text: editingQuestion.text,
      skillId: Number(editingQuestion.skillId),
      skillName: skillObj ? skillObj.name : editingQuestion.skillName,
      difficulty: editingQuestion.difficulty,
      isReverse: Boolean(editingQuestion.isReverse),
      approvalStatus: editingQuestion.approvalStatus
    };

    try {
      await apiUpdateQuestion(editingQuestion.id, updates);
    } catch (e) {
      console.warn('[Admin] API update question notice:', e);
    }

    const updated = await updateQuestion(editingQuestion.id, updates, currentUser?.name || 'Admin');
    setQuestions(updated);
    setEditingQuestion(null);
    apiGetQuestionBankStats().then((res) => { if (res?.data) setQbStats(res.data); });
  };

  const handleBatchApprove = async () => {
    if (selectedQuestionIds.length === 0) return;
    const updated = await batchApproveQuestions(selectedQuestionIds, currentUser?.name || 'Dept Head');
    setQuestions(updated);
    setSelectedQuestionIds([]);
    apiGetQuestionBankStats().then((res) => { if (res?.data) setQbStats(res.data); });
  };

  const handleBatchReject = async () => {
    if (selectedQuestionIds.length === 0) return;
    const updated = await batchRejectQuestions(selectedQuestionIds, currentUser?.name || 'Dept Head');
    setQuestions(updated);
    setSelectedQuestionIds([]);
    apiGetQuestionBankStats().then((res) => { if (res?.data) setQbStats(res.data); });
  };

  const handleAddQuestionSubmit = async (e) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;

    const skillObj = (competenciesList || COMPETENCIES_DATA).find(c => String(c.id) === String(newQuestionSkillId));
    await submitNewQuestion({
      skillId: Number(newQuestionSkillId),
      skillName: skillObj ? skillObj.name : 'General',
      text: newQuestionText.trim(),
      isReverse: newQuestionReverse,
      difficulty: newQuestionDifficulty
    }, currentUser?.name || 'Administrator');

    setQuestions(getStoredQuestions());
    setNewQuestionText('');
    setShowAddQuestionModal(false);
    apiGetQuestionBankStats().then((res) => { if (res?.data) setQbStats(res.data); });
  };

  // Bulk Import Handlers
  const handleValidateImport = async () => {
    if (!importText.trim()) {
      setImportStatusMessage('Please enter or paste CSV/JSON questionnaire data.');
      return;
    }

    setIsImportValidating(true);
    setImportStatusMessage('');
    setImportPreviewData(null);

    let parsedItems = [];
    try {
      if (importText.trim().startsWith('[') || importText.trim().startsWith('{')) {
        const rawJson = JSON.parse(importText.trim());
        parsedItems = Array.isArray(rawJson) ? rawJson : [rawJson];
      } else {
        // Parse CSV lines
        const lines = importText.trim().split('\n').map(l => l.trim()).filter(Boolean);
        const header = lines[0].toLowerCase();
        const dataLines = header.includes('skillid') || header.includes('text') ? lines.slice(1) : lines;

        dataLines.forEach((line) => {
          const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
          if (parts.length >= 2) {
            const skillId = Number(parts[0]);
            const text = parts[1];
            const isReverse = parts[2] ? parts[2].toLowerCase() === 'true' || parts[2] === '1' || parts[2].toLowerCase() === 'yes' : false;
            const difficulty = parts[3] || 'Intermediate';
            parsedItems.push({ skillId, text, isReverse, difficulty });
          }
        });
      }

      if (parsedItems.length === 0) {
        setImportStatusMessage('No valid records parsed from input text. Check format.');
        setIsImportValidating(false);
        return;
      }

      const res = await apiPreviewImportQuestions(parsedItems);
      if (res && res.success) {
        setImportPreviewData({ ...res, rawItems: parsedItems });
      } else {
        setImportStatusMessage(res?.error || 'Validation failed on server.');
      }
    } catch (err) {
      setImportStatusMessage(`Parse error: ${err.message}`);
    } finally {
      setIsImportValidating(false);
    }
  };

  const handleCommitImport = async () => {
    if (!importPreviewData?.previewSample) return;
    setIsImportCommitting(true);
    try {
      const res = await apiCommitImportQuestions(importPreviewData.rawItems);
      if (res && res.success) {
        const live = await fetchLiveQuestions();
        if (live) setQuestions(live);
        setImportStatusMessage(`Success! ${res.importedCount || 'All'} questions imported into master Question Bank.`);
        setImportPreviewData(null);
        setImportText('');
        apiGetQuestionBankStats().then((s) => { if (s?.data) setQbStats(s.data); });
        setTimeout(() => setShowImportModal(false), 2000);
      } else {
        setImportStatusMessage(res?.error || 'Commit failed.');
      }
    } catch (err) {
      setImportStatusMessage(err.message || 'Import commit failed.');
    } finally {
      setIsImportCommitting(false);
    }
  };

  // Competency Management Handlers
  const handleCreateCompetencySubmit = async (e) => {
    e.preventDefault();
    if (!newCompName.trim()) return;
    setIsSavingComp(true);
    try {
      const res = await apiCreateCompetency({
        name: newCompName.trim(),
        description: newCompDesc.trim(),
        univAvg: Number(newCompAvg) || 72
      });
      if (res && res.success && res.data) {
        setCompetenciesList(prev => [...prev, res.data]);
        setNewCompName('');
        setNewCompDesc('');
      }
    } catch (err) {
      console.warn('Create competency error:', err);
    } finally {
      setIsSavingComp(false);
    }
  };

  const handleUpdateCompetencySubmit = async (e) => {
    e.preventDefault();
    if (!editingComp) return;
    setIsSavingComp(true);
    try {
      const res = await apiUpdateCompetency(editingComp.id, {
        name: editingComp.name,
        description: editingComp.description,
        univAvg: Number(editingComp.univAvg || 72)
      });
      if (res && res.success) {
        setCompetenciesList(prev => prev.map(c => c.id === editingComp.id ? { ...c, ...editingComp } : c));
        setEditingComp(null);
      }
    } catch (err) {
      console.warn('Update competency error:', err);
    } finally {
      setIsSavingComp(false);
    }
  };

  // Assessment creation & configuration actions
  const handleCreateAssessmentSubmit = async (e) => {
    e.preventDefault();
    if (!newAssmtTitle.trim()) return;

    await createAssessment({
      name: newAssmtTitle.trim(),
      department: newAssmtDept,
      timeLimit: Number(newAssmtTimeLimit) || 45,
      questionsPerCompetency: Number(newAssmtQuestionsPerComp) || 10
    }, currentUser?.name || 'Core Team');

    const updated = getStoredAssessments();
    setAssessments(updated);
    if (onAssessmentsUpdated) onAssessmentsUpdated();
    setNewAssmtTitle('');
    setShowCreateAssessmentModal(false);
  };

  const handleSaveEditAssessment = async (e) => {
    e.preventDefault();
    if (!editingAssessment) return;

    const updated = await updateAssessment(editingAssessment.id, {
      name: editingAssessment.name,
      department: editingAssessment.department,
      timeLimit: Number(editingAssessment.timeLimit),
      questionsPerCompetency: Number(editingAssessment.questionsPerCompetency),
      active: editingAssessment.active
    }, currentUser?.name || 'Core Team');

    setAssessments(updated);
    if (onAssessmentsUpdated) onAssessmentsUpdated();
    setEditingAssessment(null);
  };

  const handleDeleteAssessment = async (id) => {
    if (window.confirm('Delete this assessment configuration permanently?')) {
      const updated = await deleteAssessment(id, currentUser?.name || 'Core Team');
      setAssessments(updated);
      if (onAssessmentsUpdated) onAssessmentsUpdated();
    }
  };

  const handleCloneAssessment = async (id) => {
    const updated = await cloneAssessment(id, currentUser?.name || 'Core Team');
    setAssessments(updated);
    if (onAssessmentsUpdated) onAssessmentsUpdated();
  };

  const toggleAssessmentActive = async (id) => {
    const target = assessments.find(a => a.id === id);
    if (!target) return;
    const updated = await updateAssessment(id, { active: !target.active }, currentUser?.name || 'Core Team');
    setAssessments(updated);
    if (onAssessmentsUpdated) onAssessmentsUpdated();
  };

  // Roster Attempt actions
  const handleDeleteAttempt = async (id) => {
    if (window.confirm('Are you sure you want to delete this student attempt record?')) {
      const updated = await deleteAttempt(id, currentUser?.name || 'Admin');
      setAttempts(updated);
    }
  };

  const handleViewStudentReport = (att) => {
    if (setActiveAttempt) setActiveAttempt(att);
    setView('results');
  };

  const handleViewStudentCertificate = (att) => {
    if (setActiveAttempt) setActiveAttempt(att);
    setView('certificate');
  };

  // Seed Data operation
  const runSeedData = async () => {
    setIsSeeding(true);
    const res = await handleSeedData();
    setQuestions(getStoredQuestions());
    setAssessments(getStoredAssessments());
    setAttempts(getStoredAttempts());
    setSeedNotification(res.message);
    setIsSeeding(false);
    if (onAssessmentsUpdated) onAssessmentsUpdated();
    setTimeout(() => setSeedNotification(''), 6000);
  };

  // Export functions (CSV)
  const exportQuestionsCSV = () => {
    const headers = ['ID', 'Competency', 'Question Text', 'Difficulty', 'Reverse Scored', 'Status', 'Created By', 'Submitted At'];
    const rows = questions.map(q => [
      q.id,
      `"${(q.skillName || '').replace(/"/g, '""')}"`,
      `"${(q.text || '').replace(/"/g, '""')}"`,
      q.difficulty || 'Intermediate',
      q.isReverse ? 'Yes' : 'No',
      q.approvalStatus || 'pending',
      `"${(q.createdBy || '').replace(/"/g, '""')}"`,
      q.submittedAt || ''
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `ICCF_Questions_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportRosterCSV = () => {
    const headers = ['Attempt ID', 'Student Name', 'Roll No', 'Department', 'Composite Score', 'Certified', 'Time Taken', 'Date'];
    const rows = attempts.map(a => [
      a.id,
      `"${(a.studentName || '').replace(/"/g, '""')}"`,
      a.rollNo || '',
      `"${(a.department || '').replace(/"/g, '""')}"`,
      a.overallScore,
      a.overallScore >= 65 ? 'Certified' : 'Pending',
      a.timeTakenFormatted || '',
      a.timestamp || ''
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `ICCF_Student_Roster_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // -------------------------------------------------------------
  // Excel Testing Roster Handlers
  // -------------------------------------------------------------
  const handleDownloadSampleExcel = () => {
    const sampleData = [
      {
        'Email Address': 'student.test1@mru.edu.in',
        'Full Name': 'Aarav Sharma',
        'Roll Number': '22CS0101',
        'Department': 'Computer Science & Technology',
        'Role': 'student'
      },
      {
        'Email Address': 'student.test2@mru.edu.in',
        'Full Name': 'Priya Verma',
        'Roll Number': '22CS0145',
        'Department': 'Computer Science & Technology',
        'Role': 'student'
      },
      {
        'Email Address': 'faculty.mentor@mru.edu.in',
        'Full Name': 'Dr. Rajesh Khanna',
        'Roll Number': 'FAC089',
        'Department': 'Computer Science & Technology',
        'Role': 'faculty'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Authorized Testers');
    XLSX.writeFile(workbook, 'ICCF_Authorized_Testers_Template.xlsx');
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawJson = XLSX.utils.sheet_to_json(sheet);

        if (!rawJson || rawJson.length === 0) {
          alert('The uploaded spreadsheet contains no data rows.');
          return;
        }

        const parsedTesters = [];
        const seenEmails = new Set();

        rawJson.forEach((row) => {
          // Robust column extraction with alias support
          const emailRaw = row['Email Address'] || row['Email'] || row['email'] || row['EMAIL'] || row['Mail'] || '';
          const email = String(emailRaw).trim().toLowerCase();
          if (!email || !email.includes('@') || seenEmails.has(email)) return;
          seenEmails.add(email);

          const name = row['Full Name'] || row['Name'] || row['name'] || row['Student Name'] || email.split('@')[0];
          const rollNo = row['Roll Number'] || row['Roll No'] || row['rollNo'] || row['Roll'] || '';
          const department = row['Department'] || row['department'] || row['Dept'] || 'Computer Science & Technology';
          const role = String(row['Role'] || row['role'] || 'student').trim().toLowerCase();

          parsedTesters.push({
            id: `usr_${email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_')}`,
            email,
            name: String(name).trim(),
            rollNo: String(rollNo).trim(),
            department: String(department).trim(),
            role: role === 'faculty' ? 'faculty' : (role === 'admin' ? 'core_team' : 'student'),
            addedAt: new Date().toISOString()
          });
        });

        if (parsedTesters.length === 0) {
          alert('No valid student/tester email addresses could be detected. Please verify your column headers.');
          return;
        }

        // Merge with existing authorized testers without duplicates
        const existing = getStoredAuthorizedTesters();
        const mergedMap = new Map();
        existing.forEach(t => mergedMap.set(t.email.toLowerCase(), t));
        parsedTesters.forEach(t => mergedMap.set(t.email.toLowerCase(), t));
        const mergedList = Array.from(mergedMap.values());

        saveAuthorizedTesters(mergedList);
        setAuthorizedTesters(mergedList);

        // Also call backend bulk provision API
        fetch('/api/auth/testers/bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
          },
          body: JSON.stringify({ testers: parsedTesters })
        }).catch(err => console.warn('[Bulk provision API notice]', err));

        setTesterStatusMessage(`Successfully loaded and authorized ${parsedTesters.length} testers from ${file.name}!`);
        setTimeout(() => setTesterStatusMessage(''), 8000);
      } catch (err) {
        console.error('Error parsing Excel sheet:', err);
        alert('Failed to parse Excel file. Please ensure it is a valid .xlsx, .xls, or .csv document.');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleToggleStrictMode = () => {
    const nextVal = !strictTestingMode;
    setStrictTestingModeState(nextVal);
    setStrictTestingMode(nextVal);
  };

  const handleDeleteTester = (emailToDelete) => {
    if (window.confirm(`Revoke portal access for ${emailToDelete}?`)) {
      const updated = authorizedTesters.filter(t => t.email.toLowerCase() !== emailToDelete.toLowerCase());
      saveAuthorizedTesters(updated);
      setAuthorizedTesters(updated);
    }
  };

  const handleClearAllTesters = () => {
    if (window.confirm('Are you sure you want to clear the entire testing roster? Only admins will be able to log in under Strict Mode.')) {
      saveAuthorizedTesters([]);
      setAuthorizedTesters([]);
    }
  };

  const handleSendAllInvites = async () => {
    if (authorizedTesters.length === 0) {
      alert('No authorized testers found. Please upload an Excel sheet first.');
      return;
    }

    setIsSendingInvites(true);
    const portalUrl = window.location.origin;

    try {
      const token = localStorage.getItem('token') || '';
      const resp = await fetch('/api/auth/testers/send-invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          testers: authorizedTesters,
          portalUrl
        })
      });

      const resData = await resp.json().catch(() => ({}));
      setIsSendingInvites(false);

      // Generate mailto link for direct batch client dispatch
      const bccEmails = authorizedTesters.map(t => t.email).join(',');
      const emailSubject = encodeURIComponent("🎓 You're invited to the Manav Rachna ICCF Competency Assessment");
      const emailBody = encodeURIComponent(
        `Dear Participant,\n\nYou have been officially registered and authorized for the Manav Rachna ICCF Competency Assessment beta.\n\n` +
        `Access the portal here:\n${portalUrl}\n\n` +
        `Sign in using your authorized email address (via OTP verification or "Continue with Google").\n\n` +
        `Best regards,\nInstitutional Competency Certification Framework (ICCF)\nManav Rachna Educational Institutions`
      );
      const mailtoLink = `mailto:?bcc=${encodeURIComponent(bccEmails)}&subject=${emailSubject}&body=${emailBody}`;

      setInviteResultModal({
        count: authorizedTesters.length,
        dispatchedCount: resData.dispatchedCount || authorizedTesters.length,
        mailtoLink
      });
    } catch (err) {
      setIsSendingInvites(false);
      console.error('[Send Invites Error]', err);
      // Fallback modal with mailto
      const bccEmails = authorizedTesters.map(t => t.email).join(',');
      const emailSubject = encodeURIComponent("🎓 You're invited to the Manav Rachna ICCF Competency Assessment");
      const emailBody = encodeURIComponent(
        `Dear Participant,\n\nYou have been authorized for the Manav Rachna ICCF Beta.\n\nPortal: ${portalUrl}\n\nBest regards,\nManav Rachna ICCF`
      );
      setInviteResultModal({
        count: authorizedTesters.length,
        dispatchedCount: 0,
        mailtoLink: `mailto:?bcc=${encodeURIComponent(bccEmails)}&subject=${emailSubject}&body=${emailBody}`
      });
    }
  };

  const filteredTesters = authorizedTesters.filter(t => {
    if (!testerSearch.trim()) return true;
    const q = testerSearch.toLowerCase();
    return (t.email || '').toLowerCase().includes(q) ||
      (t.name || '').toLowerCase().includes(q) ||
      (t.rollNo || '').toLowerCase().includes(q) ||
      (t.department || '').toLowerCase().includes(q);
  });

  // Filtered questions for moderation and Question Bank Management
  const filteredQuestions = questions.filter((q) => {
    const matchesStatus = statusFilter === 'all' || q.approvalStatus === statusFilter;
    const matchesSkill = skillFilter === 'all' || String(q.skillId) === String(skillFilter);
    const matchesReverse = reverseFilter === 'all' 
      ? true 
      : reverseFilter === 'reverse' 
        ? Boolean(q.isReverse) 
        : !q.isReverse;
    const matchesSearch = !questionSearch.trim() || 
      (q.text || '').toLowerCase().includes(questionSearch.toLowerCase()) ||
      (q.skillName || '').toLowerCase().includes(questionSearch.toLowerCase());
    return matchesStatus && matchesSkill && matchesReverse && matchesSearch;
  });

  const pendingCount = questions.filter(q => q.approvalStatus === 'pending').length;
  const approvedCount = questions.filter(q => q.approvalStatus === 'approved').length;
  const reverseScoredCount = questions.filter(q => Boolean(q.isReverse)).length;

  // Filtered Roster attempts
  const filteredAttempts = attempts.filter((a) => {
    const matchesStatus = rosterStatusFilter === 'all' 
      ? true 
      : rosterStatusFilter === 'certified' 
        ? (a.overallScore >= 65) 
        : (a.overallScore < 65);
    const matchesSearch = !rosterSearch.trim() || 
      (a.studentName || '').toLowerCase().includes(rosterSearch.toLowerCase()) ||
      (a.rollNo || '').toLowerCase().includes(rosterSearch.toLowerCase()) ||
      (a.department || '').toLowerCase().includes(rosterSearch.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Overview calculations
  const totalStudentsCount = new Set(attempts.map(a => a.userId || a.rollNo).filter(Boolean)).size;
  const certifiedCount = attempts.filter(a => a.isCertified || a.overallScore >= 65).length;
  const certificationRate = attempts.length > 0 ? `${Math.round((certifiedCount / attempts.length) * 100)}%` : '0%';

  const stats = [
    { label: 'Assessed Students', value: totalStudentsCount, icon: Users, color: '#2563EB', bg: '#EFF6FF' },
    { label: 'Assessments Taken', value: attempts.length, icon: GraduationCap, color: '#DC2626', bg: '#FEF2F2' },
    { label: 'Pending Moderation', value: pendingCount, icon: Clock, color: '#D97706', bg: '#FEF3C7' },
    { label: 'Active Assessment Cohorts', value: assessments.filter(a => a.active).length, icon: FileCheck, color: '#EA580C', bg: '#FFF7ED' },
    { label: 'Certification Rate', value: certificationRate, icon: TrendingUp, color: '#059669', bg: '#ECFDF5' },
  ];

  // SVG Line Chart calculations for 15 competencies
  const chartWidth = 620;
  const chartHeight = 240;
  const padLeft = 40;
  const padRight = 20;
  const padTop = 30;
  const padBottom = 60;
  const usableWidth = chartWidth - padLeft - padRight;
  const usableHeight = chartHeight - padTop - padBottom;

  const pointsData = COMPETENCIES_DATA.map((c) => {
    const compScores = attempts
      .map(a => a.competencyScores?.find(cs => cs.id === c.id || cs.name === c.name)?.score)
      .filter(s => typeof s === 'number');
    const avgScore = compScores.length > 0 
      ? Math.round(compScores.reduce((acc, v) => acc + v, 0) / compScores.length) 
      : 0;
    return {
      skill: c.name,
      current: avgScore,
      previous: compScores.length > 0 ? (c.univAvg || 72) : 0
    };
  });
  const stepX = usableWidth / Math.max(1, (pointsData.length - 1));

  const getY = (val) => {
    const minVal = 0;
    const maxVal = 100;
    const ratio = (val - minVal) / (maxVal - minVal);
    return padTop + usableHeight * (1 - ratio);
  };

  const currentLine = pointsData.map((d, i) => `${padLeft + i * stepX},${getY(d.current)}`).join(' ');
  const prevLine = pointsData.map((d, i) => `${padLeft + i * stepX},${getY(d.previous)}`).join(' ');

  // Department scores (100% dynamic based on submitted attempts)
  const deptMap = {};
  attempts.forEach(a => {
    const dept = a.department || 'General';
    if (!deptMap[dept]) deptMap[dept] = { total: 0, count: 0 };
    deptMap[dept].total += (a.overallScore || 0);
    deptMap[dept].count += 1;
  });
  const deptList = Object.keys(deptMap).map((d, idx) => ({
    name: d.length > 10 ? d.substring(0, 9) + '..' : d,
    fullName: d,
    score: Math.round(deptMap[d].total / deptMap[d].count),
    color: ['#8B1528', '#2563EB', '#0D9488', '#D97706', '#7C3AED'][idx % 5]
  }));
  const displayDepts = deptList.length > 0 ? deptList : [
    { name: 'CST', fullName: 'Computer Science & Technology', score: 0, color: '#8B1528' },
    { name: 'ECE', fullName: 'Electronics & Communication', score: 0, color: '#2563EB' },
    { name: 'ME', fullName: 'Mechanical Engineering', score: 0, color: '#0D9488' }
  ];

  return (
    <div style={{ padding: '24px 0 60px 0' }} className="animate-fade-in">
      <div className="container">
        {/* Top Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{
                padding: '2px 8px',
                borderRadius: '6px',
                backgroundColor: '#FDF2F4',
                color: '#8B1528',
                fontSize: '0.75rem',
                fontWeight: 700
              }}>
                ICCF Governance Console
              </span>
              <span style={{ color: '#78716C', fontSize: '0.8rem' }}>
                Signed in as <strong>{currentUser?.name || 'Administrator'}</strong> ({userRole === 'core_team' ? 'Core Team Admin' : 'Department Head'})
              </span>
            </div>
            <h1 style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#1C1917',
              fontFamily: 'var(--font-sans)',
              lineHeight: 1.2
            }}>
              Institutional Governance & Administration
            </h1>
            <p style={{ color: '#78716C', fontSize: '0.92rem', marginTop: '2px' }}>
              Complete institutional oversight: question bank moderation, competency frameworks, assessment configurations, and student cohort performance.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>

            {/* Live Concurrency Status */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '9999px',
              fontSize: '0.78rem',
              fontWeight: 700,
              backgroundColor: '#ECFDF5',
              color: '#065F46',
              border: '1px solid #A7F3D0'
            }} title={`Real-time concurrent auto-sync active (every 8s). Last synced: ${lastSyncedTime.toLocaleTimeString()}`}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }} />
              <span>Live Sync Active</span>
            </div>

            <button
              onClick={() => syncLiveAttempts(true)}
              disabled={isSyncingAttempts}
              className="btn-secondary"
              style={{
                padding: '8px 14px',
                fontSize: '0.82rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: isSyncingAttempts ? 'not-allowed' : 'pointer',
                backgroundColor: isSyncingAttempts ? '#F3F4F6' : '#FFFFFF'
              }}
              title="Force instant sync with student portal questionnaire attempts"
            >
              <RefreshCw size={14} style={{ animation: isSyncingAttempts ? 'spin 1s linear infinite' : 'none' }} />
              <span>{isSyncingAttempts ? 'Syncing...' : 'Sync Live Data'}</span>
            </button>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '0.8rem',
              fontWeight: 700,
              backgroundColor: '#EFF6FF',
              color: '#1E40AF',
              border: '1px solid #BFDBFE'
            }}>
              <ShieldCheck size={14} color="#1E40AF" />
              <span>Master Question Bank: 150 Items Active</span>
            </div>

            <button
              onClick={() => setView('faculty')}
              className="btn-primary"
              style={{
                padding: '8px 16px',
                fontSize: '0.82rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#0D9488',
                borderColor: '#0D9488'
              }}
              title="Open Faculty Assessment & Moderation Console"
            >
              <Building2 size={14} />
              <span>Faculty Console</span>
            </button>

            <button
              onClick={() => window.print()}
              className="btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.82rem' }}
            >
              <Download size={14} />
              <span>Print Summary</span>
            </button>
          </div>
        </div>

        {/* Seed notification banner */}
        {seedNotification && (
          <div style={{
            padding: '12px 18px',
            borderRadius: '12px',
            backgroundColor: '#DCFCE7',
            border: '1px solid #86EFAC',
            color: '#15803D',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }} className="animate-fade-in">
            <CheckCircle2 size={18} />
            <span>{seedNotification}</span>
          </div>
        )}

        {/* 5 Top Stat Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          {stats.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div key={idx} className="mr-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  backgroundColor: s.bg,
                  color: s.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Icon size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1C1917', lineHeight: 1.1 }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#78716C', marginTop: '2px' }}>
                    {s.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Admin Navigation Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #EAE7E0',
          marginBottom: '24px',
          gap: '6px',
          overflowX: 'auto'
        }}>
          {[
            { id: 'overview', label: 'Overview & Benchmarks', icon: BarChart3, adminOnly: false },
            { id: 'moderation', label: isAdmin ? `Question Bank Management (${questions.length})` : `Question Moderation & Submissions (${questions.length})`, icon: FileCheck, adminOnly: false },
            { id: 'assessments', label: `Assessment Configurations (${assessments.length})`, icon: Sliders, adminOnly: true },
            { id: 'roster', label: `Student Roster & Attempts (${attempts.length})`, icon: Users, adminOnly: false },
            { id: 'testers', label: `Testing Access & Excel Roster (${authorizedTesters.length})`, icon: FileSpreadsheet, adminOnly: true }
          ].filter(tab => !tab.adminOnly || isAdmin).map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '12px 16px',
                  fontSize: '0.88rem',
                  fontWeight: isActive ? 800 : 600,
                  color: isActive ? '#8B1528' : '#78716C',
                  borderBottom: isActive ? '3px solid #8B1528' : '3px solid transparent',
                  background: 'none',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ============================================================== */}
        {/* TAB 1: Institution Overview (Charts & Department Bars)         */}
        {/* ============================================================== */}
        {activeTab === 'overview' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
            gap: '24px'
          }}>
            {/* Left: Competency Progression Profile (Line Chart) */}
            <div className="mr-card" style={{ padding: '28px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1C1917' }}>
                    Institution-wide Competency Profile
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#78716C', marginTop: '2px' }}>
                    Multi-cohort progression across all 15 competency dimensions
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.78rem', fontWeight: 600 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#8B1528' }} />
                    <span style={{ color: '#8B1528' }}>Current Cohort (2026)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#0284C7' }} />
                    <span style={{ color: '#0284C7' }}>Baseline Benchmark</span>
                  </div>
                </div>
              </div>

              {/* SVG Line Graph */}
              <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: '100%', minWidth: '540px', height: 'auto' }}>
                  {[50, 60, 70, 80, 90, 100].map((val) => {
                    const y = getY(val);
                    return (
                      <g key={val}>
                        <line x1={padLeft} y1={y} x2={chartWidth - padRight} y2={y} stroke="#F1EFEA" strokeWidth="1" strokeDasharray="3 3" />
                        <text x={padLeft - 8} y={y + 3} textAnchor="end" fontSize="9" fill="#9CA3AF">{val}%</text>
                      </g>
                    );
                  })}

                  <polyline
                    points={prevLine}
                    fill="none"
                    stroke="#0284C7"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  <polyline
                    points={currentLine}
                    fill="none"
                    stroke="#8B1528"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Nodes */}
                  {pointsData.map((d, i) => {
                    const cx = padLeft + i * stepX;
                    const cy = getY(d.current);
                    return (
                      <circle
                        key={i}
                        cx={cx}
                        cy={cy}
                        r="4.5"
                        fill="#FFFFFF"
                        stroke="#8B1528"
                        strokeWidth="2.5"
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={() => setHoveredPoint(d)}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                    );
                  })}
                </svg>

                {hoveredPoint && (
                  <div style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    backgroundColor: '#1C1917',
                    color: '#FFFFFF',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}>
                    <strong>{hoveredPoint.skill}</strong>: {hoveredPoint.current}% (Univ Avg: {hoveredPoint.previous}%)
                  </div>
                )}
              </div>
            </div>

            {/* Right: Departmental Leaderboard */}
            <div className="mr-card" style={{ padding: '28px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1C1917', marginBottom: '4px' }}>
                Departmental Benchmark Rankings
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#78716C', marginBottom: '20px' }}>
                Comparative institutional readiness across registered academic faculties
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {displayDepts.map((dept, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '80px', fontSize: '0.85rem', fontWeight: 700, color: '#4B5563' }}>
                      {dept.name}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ height: '9px', backgroundColor: '#F1EFEA', borderRadius: '9999px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${dept.score}%`,
                          height: '100%',
                          backgroundColor: dept.color,
                          borderRadius: '9999px'
                        }} />
                      </div>
                    </div>

                    <div style={{ width: '45px', textAlign: 'right', fontWeight: 800, fontSize: '0.9rem', color: '#1C1917' }}>
                      {dept.score}%
                    </div>
                  </div>
                ))}
              </div>

              <div style={{
                marginTop: '28px',
                padding: '14px',
                borderRadius: '12px',
                backgroundColor: '#FAF8F5',
                border: '1px solid #ECE7DF',
                fontSize: '0.82rem',
                color: '#57534E',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <Sparkles size={20} color="#D97706" />
                <div>
                  <strong>Institutional Threshold Benchmark:</strong> Minimum 65.00% required for official certification.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: Question Bank Moderation (Complete Management)           */}
        {/* ============================================================== */}
        {activeTab === 'moderation' && (
          <div>
            {/* Question Bank Master KPI Ribbon */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <div className="mr-card" style={{ padding: '14px 18px', borderLeft: '4px solid #2563EB' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Total Master Questions</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1E293B', marginTop: '2px' }}>
                  {isLoadingQb ? '…' : questions.length}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 600 }}>10 questions / competency</div>
              </div>

              <div className="mr-card" style={{ padding: '14px 18px', borderLeft: '4px solid #16A34A' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Active & Approved</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#16A34A', marginTop: '2px' }}>
                  {approvedCount}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748B' }}>Live in assessment pool</div>
              </div>

              <div className="mr-card" style={{ padding: '14px 18px', borderLeft: '4px solid #4F46E5' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Reverse-Keyed (R / RA)</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#4F46E5', marginTop: '2px' }}>
                  {reverseScoredCount}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#6366F1', fontWeight: 600 }}>Formula: 6 - rawScore</div>
              </div>

              <div className="mr-card" style={{ padding: '14px 18px', borderLeft: '4px solid #D97706' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Pending Moderation</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#D97706', marginTop: '2px' }}>
                  {pendingCount}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748B' }}>Awaiting review</div>
              </div>

              <div className="mr-card" style={{ padding: '14px 18px', borderLeft: '4px solid #8B1528' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Master Competencies</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#8B1528', marginTop: '2px' }}>
                  {competenciesList?.length || 15}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#8B1528', fontWeight: 600 }}>Version v1.0.0-institutional</div>
              </div>
            </div>

            {/* Filter and Add Question Toolbar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '14px',
              marginBottom: '20px'
            }}>
              {/* Left filters */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151' }}>Status:</span>
                {['all', 'pending', 'approved', 'rejected'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '9999px',
                      fontSize: '0.8rem',
                      fontWeight: statusFilter === st ? 700 : 500,
                      backgroundColor: statusFilter === st ? '#8B1528' : '#FAF8F5',
                      color: statusFilter === st ? '#FFFFFF' : '#4B5563',
                      border: statusFilter === st ? 'none' : '1px solid #D6D3D1',
                      cursor: 'pointer',
                      textTransform: 'capitalize'
                    }}
                  >
                    {st} {st === 'pending' && `(${pendingCount})`}
                  </button>
                ))}

                <select
                  value={skillFilter}
                  onChange={(e) => setSkillFilter(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D6D3D1',
                    fontSize: '0.8rem',
                    color: '#374151',
                    backgroundColor: '#FFFFFF'
                  }}
                >
                  <option value="all">All 15 Competencies</option>
                  {(competenciesList || COMPETENCIES_DATA).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <select
                  value={reverseFilter}
                  onChange={(e) => setReverseFilter(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D6D3D1',
                    fontSize: '0.8rem',
                    color: '#374151',
                    backgroundColor: '#FFFFFF'
                  }}
                >
                  <option value="all">All Scoring Keys</option>
                  <option value="standard">Standard Scored (1 to 5)</option>
                  <option value="reverse">Reverse Keyed (6 - X)</option>
                </select>

                {/* Search Box */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #D6D3D1',
                  borderRadius: '8px',
                  padding: '4px 10px'
                }}>
                  <Search size={14} color="#78716C" />
                  <input
                    type="text"
                    value={questionSearch}
                    onChange={(e) => setQuestionSearch(e.target.value)}
                    placeholder="Search question text or competency..."
                    style={{ border: 'none', outline: 'none', fontSize: '0.8rem', width: '200px' }}
                  />
                </div>
              </div>

              {/* Right Action buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {selectedQuestionIds.length > 0 && (
                  <>
                    <button
                      onClick={handleBatchApprove}
                      style={{
                        padding: '7px 12px',
                        borderRadius: '8px',
                        backgroundColor: '#16A34A',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <CheckCircle2 size={14} />
                      <span>Approve ({selectedQuestionIds.length})</span>
                    </button>

                    <button
                      onClick={handleBatchReject}
                      style={{
                        padding: '7px 12px',
                        borderRadius: '8px',
                        backgroundColor: '#DC2626',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <XCircle size={14} />
                      <span>Reject ({selectedQuestionIds.length})</span>
                    </button>
                  </>
                )}

                {isAdmin && (
                  <>
                    <button
                      onClick={() => setShowCompetenciesModal(true)}
                      className="btn-secondary"
                      style={{ padding: '7px 14px', fontSize: '0.82rem', gap: '6px' }}
                      title="View and manage the 15 master competency dimensions"
                    >
                      <Layers size={15} color="#8B1528" />
                      <span>Competencies ({competenciesList?.length || 15})</span>
                    </button>

                    <button
                      onClick={() => {
                        setImportText('');
                        setImportPreviewData(null);
                        setImportStatusMessage('');
                        setShowImportModal(true);
                      }}
                      className="btn-secondary"
                      style={{ padding: '7px 14px', fontSize: '0.82rem', gap: '6px' }}
                      title="Admin-only batch validation and import without duplicate records"
                    >
                      <Upload size={15} color="#059669" />
                      <span>Bulk Import (CSV/JSON)</span>
                    </button>
                  </>
                )}

                <button
                  onClick={exportQuestionsCSV}
                  className="btn-secondary"
                  style={{ padding: '7px 14px', fontSize: '0.82rem', gap: '6px' }}
                  title="Export questions to CSV spreadsheet"
                >
                  <FileSpreadsheet size={15} />
                  <span>Export CSV</span>
                </button>

                <button
                  onClick={() => setShowAddQuestionModal(true)}
                  className="btn-primary"
                  style={{ padding: '7px 16px', fontSize: '0.82rem', gap: '6px' }}
                >
                  <Plus size={15} />
                  <span>Add Question</span>
                </button>
              </div>
            </div>

            {/* Question selection toolbar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#FAF8F5',
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #ECE7DF',
              marginBottom: '14px',
              fontSize: '0.78rem',
              color: '#57534E'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={filteredQuestions.length > 0 && selectedQuestionIds.length === filteredQuestions.length}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedQuestionIds(filteredQuestions.map(q => q.id));
                    else setSelectedQuestionIds([]);
                  }}
                  style={{ accentColor: '#8B1528' }}
                />
                <span>Select All Filtered ({filteredQuestions.length} items)</span>
              </div>
              <div>
                Showing <strong>{filteredQuestions.length}</strong> of {questions.length} questions
              </div>
            </div>

            {/* Questions List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {filteredQuestions.length === 0 ? (
                <div className="mr-card" style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
                  No questions match the selected filter.
                </div>
              ) : (
                filteredQuestions.map((q) => {
                  const isPending = q.approvalStatus === 'pending';
                  const isApproved = q.approvalStatus === 'approved';
                  const isSelected = selectedQuestionIds.includes(q.id);

                  return (
                    <div
                      key={q.id}
                      className="mr-card"
                      style={{
                        padding: '18px 22px',
                        borderLeft: isPending ? '5px solid #D97706' : isApproved ? '5px solid #16A34A' : '5px solid #DC2626',
                        backgroundColor: isSelected ? '#FFFBFB' : '#FFFFFF'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '300px' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedQuestionIds(prev => [...prev, q.id]);
                              else setSelectedQuestionIds(prev => prev.filter(id => id !== q.id));
                            }}
                            style={{ accentColor: '#8B1528', marginTop: '4px' }}
                          />

                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#8B1528' }}>
                                {q.skillName}
                              </span>
                              <span style={{ color: '#9CA3AF' }}>•</span>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                backgroundColor: isPending ? '#FEF3C7' : isApproved ? '#DCFCE7' : '#FEE2E2',
                                color: isPending ? '#B45309' : isApproved ? '#15803D' : '#DC2626',
                                textTransform: 'uppercase'
                              }}>
                                Status: {q.approvalStatus}
                              </span>
                              {q.isReverse && (
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  backgroundColor: '#EFF6FF',
                                  color: '#1D4ED8'
                                }}>
                                  Reverse-Scored (6 - X)
                                </span>
                              )}
                            </div>

                            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1C1917', lineHeight: 1.4, marginBottom: '6px' }}>
                              "{q.text}"
                            </div>

                            <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                              ID: #{q.id} • Creator: <strong>{q.createdBy || 'System'}</strong> • Difficulty: {q.difficulty || 'Intermediate'}
                              {q.reviewedBy && ` • Reviewed by: ${q.reviewedBy}`}
                            </div>
                          </div>
                        </div>

                        {/* Moderation & Edit Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {isPending && (
                            <>
                              <button
                                onClick={() => handleApprove(q.id)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  backgroundColor: '#16A34A',
                                  color: '#FFFFFF',
                                  fontWeight: 700,
                                  fontSize: '0.78rem',
                                  border: 'none',
                                  cursor: 'pointer'
                                }}
                              >
                                <CheckCircle2 size={13} />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => handleReject(q.id)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  backgroundColor: '#DC2626',
                                  color: '#FFFFFF',
                                  fontWeight: 700,
                                  fontSize: '0.78rem',
                                  border: 'none',
                                  cursor: 'pointer'
                                }}
                              >
                                <XCircle size={13} />
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => setEditingQuestion(q)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              backgroundColor: '#FAF8F5',
                              border: '1px solid #D6D3D1',
                              color: '#374151',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600
                            }}
                            title="Edit question text and parameters"
                          >
                            <Edit3 size={13} />
                            <span>Edit</span>
                          </button>

                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteQuestion(q.id)}
                              style={{
                                padding: '6px 8px',
                                borderRadius: '6px',
                                backgroundColor: '#FEE2E2',
                                border: '1px solid #FCA5A5',
                                color: '#DC2626',
                                cursor: 'pointer'
                              }}
                              title="Delete question permanently"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal: Submit New Question */}
            {showAddQuestionModal && (
              <div style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(3px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100,
                padding: '20px'
              }} className="animate-fade-in">
                <div style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '20px',
                  maxWidth: '520px',
                  width: '100%',
                  padding: '30px',
                  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
                }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1C1917', marginBottom: '16px' }}>
                    Submit Question for Moderation
                  </h3>

                  <form onSubmit={handleAddQuestionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                        Target Competency Dimension
                      </label>
                      <select
                        value={newQuestionSkillId}
                        onChange={(e) => setNewQuestionSkillId(e.target.value)}
                        style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '0.85rem' }}
                      >
                        {COMPETENCIES_DATA.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                        Question Statement (5-point Likert Item)
                      </label>
                      <textarea
                        rows={3}
                        value={newQuestionText}
                        onChange={(e) => setNewQuestionText(e.target.value)}
                        placeholder="e.g. I actively listen to conflicting arguments before formulating counter-proposals."
                        required
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '0.85rem' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                          Difficulty Level
                        </label>
                        <select
                          value={newQuestionDifficulty}
                          onChange={(e) => setNewQuestionDifficulty(e.target.value)}
                          style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '0.85rem' }}
                        >
                          <option value="Foundation">Foundation</option>
                          <option value="Intermediate">Intermediate</option>
                          <option value="Advanced">Advanced</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', paddingTop: '20px', gap: '8px' }}>
                        <input
                          type="checkbox"
                          id="revChk"
                          checked={newQuestionReverse}
                          onChange={(e) => setNewQuestionReverse(e.target.checked)}
                          style={{ accentColor: '#8B1528' }}
                        />
                        <label htmlFor="revChk" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>
                          Reverse-worded item (6 - X)
                        </label>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                      <button
                        type="button"
                        onClick={() => setShowAddQuestionModal(false)}
                        className="btn-secondary"
                        style={{ padding: '8px 16px' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn-primary"
                        style={{ padding: '8px 20px' }}
                      >
                        Submit to Queue
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Modal: Edit Question */}
            {editingQuestion && (
              <div style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(3px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100,
                padding: '20px'
              }} className="animate-fade-in">
                <div style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '20px',
                  maxWidth: '520px',
                  width: '100%',
                  padding: '30px',
                  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
                }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1C1917', marginBottom: '16px' }}>
                    Edit Question #{editingQuestion.id}
                  </h3>

                  <form onSubmit={handleSaveEditQuestion} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                        Competency Dimension
                      </label>
                      <select
                        value={editingQuestion.skillId}
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, skillId: e.target.value })}
                        style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '0.85rem' }}
                      >
                        {COMPETENCIES_DATA.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                        Question Statement Text
                      </label>
                      <textarea
                        rows={3}
                        value={editingQuestion.text}
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, text: e.target.value })}
                        required
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '0.85rem' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                          Approval Status
                        </label>
                        <select
                          value={editingQuestion.approvalStatus}
                          onChange={(e) => setEditingQuestion({ ...editingQuestion, approvalStatus: e.target.value })}
                          style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '0.85rem' }}
                        >
                          <option value="approved">Approved</option>
                          <option value="pending">Pending</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', paddingTop: '20px', gap: '8px' }}>
                        <input
                          type="checkbox"
                          id="editRevChk"
                          checked={editingQuestion.isReverse}
                          onChange={(e) => setEditingQuestion({ ...editingQuestion, isReverse: e.target.checked })}
                          style={{ accentColor: '#8B1528' }}
                        />
                        <label htmlFor="editRevChk" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>
                          Reverse-worded item
                        </label>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                      <button
                        type="button"
                        onClick={() => setEditingQuestion(null)}
                        className="btn-secondary"
                        style={{ padding: '8px 16px' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn-primary"
                        style={{ padding: '8px 20px' }}
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Modal: Bulk Questionnaire Import (CSV / JSON) */}
            {showImportModal && (
              <div style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(3px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100,
                padding: '20px'
              }} className="animate-fade-in">
                <div style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '20px',
                  maxWidth: '720px',
                  width: '100%',
                  padding: '30px',
                  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                  maxHeight: '90vh',
                  overflowY: 'auto'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          backgroundColor: '#ECFDF5',
                          color: '#059669'
                        }}>
                          Safe Dry-Run Import
                        </span>
                        <span style={{ fontSize: '0.78rem', color: '#78716C' }}>Admin Only</span>
                      </div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1C1917', lineHeight: 1.2 }}>
                        Bulk Import Questions (CSV / JSON)
                      </h3>
                      <p style={{ fontSize: '0.82rem', color: '#78716C', marginTop: '4px' }}>
                        Import new Likert scale items with automatic duplicate detection. Existing IDs and verbatim texts are strictly preserved.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowImportModal(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        color: '#9CA3AF'
                      }}
                    >
                      <XCircle size={20} />
                    </button>
                  </div>

                  {/* Format Guidance & Quick Template */}
                  <div style={{
                    backgroundColor: '#FAF8F5',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    border: '1px solid #ECE7DF',
                    marginBottom: '16px',
                    fontSize: '0.78rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700, color: '#1C1917' }}>Supported Formats:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setImportText(`skillId,text,isReverse,difficulty
1,"I actively seek out constructive feedback from colleagues on my deliverables.",false,Intermediate
2,"I tend to postpone difficult conversations with team members when tensions rise.",true,Intermediate
3,"I analyze quantitative data systematically before reaching final decisions.",false,Advanced`);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#8B1528',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        Load Sample CSV
                      </button>
                    </div>
                    <code style={{ display: 'block', color: '#4B5563', fontFamily: 'monospace', fontSize: '0.72rem' }}>
                      CSV: skillId,text,isReverse,difficulty (e.g. 1,"Question statement",false,Intermediate)
                      <br />
                      JSON: [&#123; "skillId": 1, "text": "...", "isReverse": false, "difficulty": "Intermediate" &#125;]
                    </code>
                  </div>

                  {/* Input Textarea */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                      Paste CSV or JSON Payload:
                    </label>
                    <textarea
                      rows={6}
                      value={importText}
                      onChange={(e) => {
                        setImportText(e.target.value);
                        setImportPreviewData(null);
                        setImportStatusMessage('');
                      }}
                      placeholder={`skillId,text,isReverse,difficulty\n1,"I consistently follow through on commitments made to team members.",false,Intermediate`}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid #D6D3D1',
                        fontSize: '0.8rem',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>

                  {/* Status Banner */}
                  {importStatusMessage && (
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      marginBottom: '16px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      backgroundColor: importStatusMessage.startsWith('Success') ? '#DCFCE7' : '#FEF2F2',
                      color: importStatusMessage.startsWith('Success') ? '#15803D' : '#DC2626',
                      border: importStatusMessage.startsWith('Success') ? '1px solid #86EFAC' : '1px solid #FCA5A5'
                    }}>
                      {importStatusMessage}
                    </div>
                  )}

                  {/* Dry Run Preview Results */}
                  {importPreviewData && (
                    <div style={{
                      backgroundColor: '#FAF8F5',
                      borderRadius: '12px',
                      padding: '16px',
                      border: '1px solid #ECE7DF',
                      marginBottom: '16px'
                    }}>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
                        <div style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: '#EFF6FF', color: '#1E40AF', fontSize: '0.78rem', fontWeight: 700 }}>
                          Parsed: {importPreviewData.totalParsed || importPreviewData.totalCount || 0}
                        </div>
                        <div style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: '#DCFCE7', color: '#15803D', fontSize: '0.78rem', fontWeight: 700 }}>
                          Ready to Insert: {importPreviewData.validCount || 0}
                        </div>
                        <div style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: '#FEF3C7', color: '#B45309', fontSize: '0.78rem', fontWeight: 700 }}>
                          Duplicates Skipped: {importPreviewData.duplicateCount || 0}
                        </div>
                        {importPreviewData.errorCount > 0 && (
                          <div style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: '#FEE2E2', color: '#DC2626', fontSize: '0.78rem', fontWeight: 700 }}>
                            Errors: {importPreviewData.errorCount}
                          </div>
                        )}
                      </div>

                      {importPreviewData.duplicates && importPreviewData.duplicates.length > 0 && (
                        <div style={{
                          padding: '10px',
                          borderRadius: '6px',
                          backgroundColor: '#FFFBEB',
                          border: '1px solid #FDE68A',
                          color: '#92400E',
                          fontSize: '0.75rem',
                          marginBottom: '12px'
                        }}>
                          <strong>Duplicate Protection:</strong> {importPreviewData.duplicates.length} question(s) already exist in the database and will be skipped to protect seeded data integrity.
                        </div>
                      )}

                      {/* Preview Sample Table */}
                      {importPreviewData.previewSample && importPreviewData.previewSample.length > 0 && (
                        <div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '8px' }}>
                            Validation Sample (Showing top {importPreviewData.previewSample.length} items):
                          </div>
                          <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: '6px', backgroundColor: '#FFFFFF' }}>
                            <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', textAlign: 'left' }}>
                                  <th style={{ padding: '6px 10px' }}>Skill ID</th>
                                  <th style={{ padding: '6px 10px' }}>Text</th>
                                  <th style={{ padding: '6px 10px' }}>Reverse</th>
                                  <th style={{ padding: '6px 10px' }}>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {importPreviewData.previewSample.map((item, idx) => (
                                  <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                    <td style={{ padding: '6px 10px', fontWeight: 700 }}>#{item.skillId}</td>
                                    <td style={{ padding: '6px 10px', color: '#1F2937' }}>{item.text}</td>
                                    <td style={{ padding: '6px 10px' }}>
                                      {item.isReverse ? <span style={{ color: '#2563EB', fontWeight: 600 }}>Yes (6-X)</span> : 'No'}
                                    </td>
                                    <td style={{ padding: '6px 10px' }}>
                                      {item.isDuplicate ? (
                                        <span style={{ color: '#D97706', fontWeight: 600 }}>Duplicate</span>
                                      ) : (
                                        <span style={{ color: '#16A34A', fontWeight: 600 }}>Valid</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Controls */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setShowImportModal(false)}
                      className="btn-secondary"
                      style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                    >
                      Close
                    </button>

                    {!importPreviewData ? (
                      <button
                        type="button"
                        onClick={handleValidateImport}
                        disabled={isImportValidating || !importText.trim()}
                        className="btn-secondary"
                        style={{
                          padding: '8px 20px',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          backgroundColor: '#FAF8F5',
                          border: '1px solid #8B1528',
                          color: '#8B1528',
                          cursor: isImportValidating || !importText.trim() ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {isImportValidating ? 'Validating Dry Run...' : 'Validate & Dry Run'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleCommitImport}
                        disabled={isImportCommitting || (importPreviewData.validCount || 0) === 0}
                        className="btn-primary"
                        style={{
                          padding: '8px 22px',
                          fontSize: '0.82rem',
                          backgroundColor: '#059669',
                          borderColor: '#059669',
                          cursor: isImportCommitting || (importPreviewData.validCount || 0) === 0 ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {isImportCommitting ? 'Committing...' : `Commit ${importPreviewData.validCount || 0} Questions to Live DB`}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Modal: Competency Dimensions Management (15 Core Dimensions) */}
            {showCompetenciesModal && (
              <div style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(3px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100,
                padding: '20px'
              }} className="animate-fade-in">
                <div style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '20px',
                  maxWidth: '820px',
                  width: '100%',
                  padding: '30px',
                  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                  maxHeight: '90vh',
                  overflowY: 'auto'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          backgroundColor: '#FDF2F4',
                          color: '#8B1528'
                        }}>
                          ICCF Master Framework
                        </span>
                        <span style={{ fontSize: '0.78rem', color: '#78716C' }}>Admin Only</span>
                      </div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1C1917', lineHeight: 1.2 }}>
                        Competency Dimensions & Benchmarks (15 Domains)
                      </h3>
                      <p style={{ fontSize: '0.82rem', color: '#78716C', marginTop: '4px' }}>
                        Administer the 15 behavioral competency dimensions, descriptions, and institutional cohort averages.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowCompetenciesModal(false);
                        setEditingComp(null);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        color: '#9CA3AF'
                      }}
                    >
                      <XCircle size={20} />
                    </button>
                  </div>

                  {/* Edit Selected Competency Form */}
                  {editingComp && (
                    <div style={{
                      backgroundColor: '#FAF8F5',
                      borderRadius: '12px',
                      padding: '18px',
                      border: '1px solid #ECE7DF',
                      marginBottom: '20px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#8B1528' }}>
                          Edit Competency #{editingComp.id}: {editingComp.name}
                        </h4>
                        <button
                          type="button"
                          onClick={() => setEditingComp(null)}
                          style={{ background: 'none', border: 'none', fontSize: '0.75rem', color: '#6B7280', cursor: 'pointer' }}
                        >
                          Cancel Edit
                        </button>
                      </div>

                      <form onSubmit={handleUpdateCompetencySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                              Dimension Name
                            </label>
                            <input
                              type="text"
                              value={editingComp.name}
                              onChange={(e) => setEditingComp({ ...editingComp, name: e.target.value })}
                              required
                              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D6D3D1', fontSize: '0.82rem' }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                              Univ Benchmark Avg (%)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={editingComp.univAvg || 72}
                              onChange={(e) => setEditingComp({ ...editingComp, univAvg: Number(e.target.value) })}
                              required
                              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D6D3D1', fontSize: '0.82rem' }}
                            />
                          </div>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                            Competency Description / Behavioral Focus
                          </label>
                          <textarea
                            rows={2}
                            value={editingComp.description || ''}
                            onChange={(e) => setEditingComp({ ...editingComp, description: e.target.value })}
                            placeholder="Operational behavioral definition..."
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D6D3D1', fontSize: '0.82rem' }}
                          />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => setEditingComp(null)}
                            className="btn-secondary"
                            style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSavingComp}
                            className="btn-primary"
                            style={{ padding: '6px 18px', fontSize: '0.78rem' }}
                          >
                            {isSavingComp ? 'Saving...' : 'Save Updates'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Competencies Table */}
                  <div style={{ maxHeight: '360px', overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: '8px', marginBottom: '20px' }}>
                    <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                      <thead style={{ position: 'sticky', top: 0, backgroundColor: '#FAF8F5', borderBottom: '1px solid #E5E7EB' }}>
                        <tr style={{ textAlign: 'left', color: '#374151', fontWeight: 700 }}>
                          <th style={{ padding: '10px 12px', width: '50px' }}>#ID</th>
                          <th style={{ padding: '10px 12px' }}>Competency Dimension</th>
                          <th style={{ padding: '10px 12px' }}>Description</th>
                          <th style={{ padding: '10px 12px', width: '90px' }}>Univ Avg</th>
                          <th style={{ padding: '10px 12px', width: '80px', textAlign: 'center' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(competenciesList || COMPETENCIES_DATA).map((comp) => (
                          <tr key={comp.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: '#8B1528' }}>
                              #{comp.id}
                            </td>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1C1917' }}>
                              {comp.name}
                            </td>
                            <td style={{ padding: '10px 12px', color: '#6B7280', fontSize: '0.75rem' }}>
                              {comp.description || 'Core institutional behavioral dimension.'}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                backgroundColor: '#EFF6FF',
                                color: '#1E40AF'
                              }}>
                                {comp.univAvg || 72}%
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => setEditingComp(comp)}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  backgroundColor: '#FAF8F5',
                                  border: '1px solid #D6D3D1',
                                  color: '#374151',
                                  cursor: 'pointer',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <Edit3 size={11} />
                                <span>Edit</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Add New Competency Form */}
                  <div style={{
                    backgroundColor: '#FAF8F5',
                    borderRadius: '12px',
                    padding: '16px',
                    border: '1px solid #ECE7DF'
                  }}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1C1917', marginBottom: '10px' }}>
                      Add New Competency Dimension
                    </h4>
                    <form onSubmit={handleCreateCompetencySubmit} style={{ display: 'grid', gridTemplateColumns: '2fr 3fr 1fr auto', gap: '10px', alignItems: 'flex-end' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#4B5563', marginBottom: '2px' }}>Name</label>
                        <input
                          type="text"
                          value={newCompName}
                          onChange={(e) => setNewCompName(e.target.value)}
                          placeholder="e.g. Systems Thinking"
                          required
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #D6D3D1', fontSize: '0.78rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#4B5563', marginBottom: '2px' }}>Description</label>
                        <input
                          type="text"
                          value={newCompDesc}
                          onChange={(e) => setNewCompDesc(e.target.value)}
                          placeholder="Brief operational behavioral summary"
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #D6D3D1', fontSize: '0.78rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#4B5563', marginBottom: '2px' }}>Avg %</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={newCompAvg}
                          onChange={(e) => setNewCompAvg(e.target.value)}
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #D6D3D1', fontSize: '0.78rem' }}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isSavingComp}
                        className="btn-primary"
                        style={{ padding: '6px 14px', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                      >
                        {isSavingComp ? 'Adding...' : '+ Add Dimension'}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: Assessment Configuration (Full Cohort Management)       */}
        {/* ============================================================== */}
        {activeTab === 'assessments' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1C1917' }}>
                  Institutional Assessment Cohorts
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#78716C', marginTop: '2px' }}>
                  Configure active assessment rules, time constraints, and competency quotas.
                </p>
              </div>

              <button
                onClick={() => setShowCreateAssessmentModal(true)}
                className="btn-primary"
                style={{ padding: '8px 18px', fontSize: '0.85rem', gap: '6px' }}
              >
                <Plus size={15} />
                <span>Create New Assessment</span>
              </button>
            </div>

            {/* ── Questionnaire Timing & Duration Management Panel ── */}
            <div className="mr-card" style={{
              padding: '24px',
              marginBottom: '20px',
              backgroundColor: '#FFFFFF',
              border: '1.5px solid #FDE68A',
              boxShadow: '0 4px 16px rgba(217, 119, 6, 0.08)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: '12px',
                    backgroundColor: '#FEF3C7',
                    color: '#B45309',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Clock size={24} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1C1917', margin: 0 }}>
                      Individual Skill Questionnaire Timing Management
                    </h4>
                    <p style={{ fontSize: '0.82rem', color: '#78716C', margin: '3px 0 0 0' }}>
                      Configure the time duration allotted to students for taking each individual 10-question human-centric skill questionnaire.
                    </p>
                  </div>
                </div>

                {timingSavedFeedback && (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: '9999px',
                    backgroundColor: '#DCFCE7',
                    border: '1px solid #86EFAC',
                    color: '#15803D',
                    fontSize: '0.8rem',
                    fontWeight: 700
                  }}>
                    <CheckCircle2 size={14} />
                    <span>Timing updated live across student sessions!</span>
                  </div>
                )}
              </div>

              {/* Timing Controls */}
              <div style={{
                backgroundColor: '#FAF8F5',
                borderRadius: '14px',
                padding: '16px 20px',
                border: '1px solid #EAE5DC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#44403C', display: 'block', marginBottom: '4px' }}>
                      Default Duration per Skill Questionnaire:
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="number"
                        min="2"
                        max="120"
                        value={questionnaireTimingSettings.durationMinutes || 10}
                        onChange={(e) => handleSaveQuestionnaireTiming(e.target.value)}
                        style={{
                          width: '80px',
                          padding: '7px 10px',
                          borderRadius: '8px',
                          border: '1.5px solid #D6D3D1',
                          fontSize: '0.92rem',
                          fontWeight: 700,
                          color: '#8B1528',
                          textAlign: 'center'
                        }}
                      />
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1C1917' }}>Minutes</span>
                    </div>
                  </div>

                  {/* Preset quick buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', alignSelf: 'flex-end' }}>
                    {[5, 10, 15, 20, 30].map(mins => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => handleSaveQuestionnaireTiming(mins)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: (questionnaireTimingSettings.durationMinutes === mins) ? '1.5px solid #8B1528' : '1px solid #D6D3D1',
                          backgroundColor: (questionnaireTimingSettings.durationMinutes === mins) ? '#FDF2F4' : '#FFFFFF',
                          color: (questionnaireTimingSettings.durationMinutes === mins) ? '#8B1528' : '#57534E'
                        }}
                      >
                        {mins} Mins{mins === 10 ? ' (Standard)' : ''}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowPerSkillOverrides(!showPerSkillOverrides)}
                    className="btn-secondary"
                    style={{ padding: '7px 14px', fontSize: '0.8rem', gap: '6px' }}
                  >
                    <Sliders size={14} />
                    <span>{showPerSkillOverrides ? 'Hide Per-Skill Overrides' : 'Customize per Skill'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveQuestionnaireTiming(questionnaireTimingSettings.durationMinutes)}
                    className="btn-primary"
                    style={{ padding: '7px 18px', fontSize: '0.8rem', backgroundColor: '#059669', borderColor: '#047857' }}
                  >
                    <Check size={14} />
                    <span>Save Timing</span>
                  </button>
                </div>
              </div>

              {/* Per-skill Duration Overrides Table */}
              {showPerSkillOverrides && (
                <div style={{ marginTop: '16px', borderTop: '1px solid #EAE5DC', paddingTop: '16px' }}>
                  <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#1C1917', marginBottom: '8px' }}>
                    Per-Skill Custom Duration Allocations (10 Questions Each):
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '10px',
                    maxHeight: '260px',
                    overflowY: 'auto',
                    padding: '4px'
                  }}>
                    {COMPETENCIES_DATA.map((comp) => {
                      const curMins = questionnaireTimingSettings.perSkillDuration?.[comp.id] || questionnaireTimingSettings.durationMinutes || 10;
                      return (
                        <div key={comp.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          backgroundColor: '#FAF8F5',
                          borderRadius: '8px',
                          border: '1px solid #ECE7DF',
                          fontSize: '0.82rem'
                        }}>
                          <span style={{ fontWeight: 700, color: '#1C1917' }}>
                            {comp.id}. {comp.name}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input
                              type="number"
                              min="2"
                              max="120"
                              value={curMins}
                              onChange={(e) => handleUpdateSingleSkillTiming(comp.id, e.target.value)}
                              style={{
                                width: '56px',
                                padding: '4px 6px',
                                borderRadius: '6px',
                                border: '1px solid #D6D3D1',
                                textAlign: 'center',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                color: '#8B1528'
                              }}
                            />
                            <span style={{ fontSize: '0.74rem', color: '#78716C' }}>mins</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {assessments.map((assmt) => (
                <div key={assmt.id} className="mr-card" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1C1917' }}>
                          {assmt.name}
                        </h4>
                        <span style={{
                          padding: '2px 10px',
                          borderRadius: '9999px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          backgroundColor: assmt.active ? '#DCFCE7' : '#F3F4F6',
                          color: assmt.active ? '#15803D' : '#6B7280'
                        }}>
                          {assmt.active ? '● Live' : '○ Paused'}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.82rem', color: '#6B7280', marginTop: '4px' }}>
                        {assmt.description || 'Configured via Institutional Governance Console.'}
                      </p>
                    </div>

                    {/* Assessment controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => toggleAssessmentActive(assmt.id)}
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                      >
                        {assmt.active ? 'Pause' : 'Activate'}
                      </button>

                      <button
                        onClick={() => setEditingAssessment(assmt)}
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.78rem', gap: '4px' }}
                      >
                        <Edit3 size={13} />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => handleCloneAssessment(assmt.id)}
                        className="btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                        title="Duplicate assessment for another cohort"
                      >
                        <Copy size={13} />
                      </button>

                      <button
                        onClick={() => {
                          if (setActiveAssessment) setActiveAssessment(assmt);
                          setView('assessment');
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          backgroundColor: '#FAF8F5',
                          border: '1px solid #D6D3D1',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: '#8B1528',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title="Preview live assessment interface"
                      >
                        <Play size={13} />
                        <span>Preview</span>
                      </button>

                      <button
                        onClick={() => handleDeleteAssessment(assmt.id)}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#FEE2E2',
                          border: '1px solid #FCA5A5',
                          color: '#DC2626',
                          cursor: 'pointer'
                        }}
                        title="Delete assessment"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '12px',
                    marginTop: '16px',
                    paddingTop: '16px',
                    borderTop: '1px solid #F1EFEA',
                    fontSize: '0.82rem'
                  }}>
                    <div>
                      <span style={{ color: '#78716C', display: 'block' }}>Target Faculty:</span>
                      <strong style={{ color: '#1C1917' }}>{assmt.department}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#78716C', display: 'block' }}>Composite Time Limit:</span>
                      <strong style={{ color: '#8B1528' }}>{assmt.timeLimit} minutes</strong>
                    </div>
                    <div>
                      <span style={{ color: '#78716C', display: 'block' }}>Per-Skill Questionnaire Duration:</span>
                      <strong style={{ color: '#059669' }}>{questionnaireTimingSettings.durationMinutes || 10} minutes (10 items)</strong>
                    </div>
                    <div>
                      <span style={{ color: '#78716C', display: 'block' }}>Items per Competency:</span>
                      <strong style={{ color: '#1C1917' }}>{assmt.questionsPerCompetency || 10} items</strong>
                    </div>
                    <div>
                      <span style={{ color: '#78716C', display: 'block' }}>Total Items:</span>
                      <strong style={{ color: '#1C1917' }}>{assmt.totalQuestions || 150} questions</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal: Create Assessment */}
            {showCreateAssessmentModal && (
              <div style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(3px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100,
                padding: '20px'
              }} className="animate-fade-in">
                <div style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '20px',
                  maxWidth: '480px',
                  width: '100%',
                  padding: '28px',
                  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
                }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1C1917', marginBottom: '16px' }}>
                    Configure New Assessment
                  </h3>

                  <form onSubmit={handleCreateAssessmentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                        Assessment Title
                      </label>
                      <input
                        type="text"
                        value={newAssmtTitle}
                        onChange={(e) => setNewAssmtTitle(e.target.value)}
                        placeholder="e.g. 2026 ECE Mid-Year Benchmark"
                        required
                        style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '0.85rem' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                        Department / Faculty
                      </label>
                      <select
                        value={newAssmtDept}
                        onChange={(e) => setNewAssmtDept(e.target.value)}
                        style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '0.85rem' }}
                      >
                        <option value="All Departments (University-wide)">All Departments (University-wide)</option>
                        <option value="Computer Science & Technology">Computer Science & Technology</option>
                        <option value="Electronics & Communication">Electronics & Communication</option>
                        <option value="Mechanical Engineering">Mechanical Engineering</option>
                        <option value="Management Studies">Management Studies</option>
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                          Time Limit (Mins)
                        </label>
                        <input
                          type="number"
                          min="10"
                          max="180"
                          value={newAssmtTimeLimit}
                          onChange={(e) => setNewAssmtTimeLimit(e.target.value)}
                          required
                          style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '0.85rem' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                          Items per Competency
                        </label>
                        <input
                          type="number"
                          min="2"
                          max="10"
                          value={newAssmtQuestionsPerComp}
                          onChange={(e) => setNewAssmtQuestionsPerComp(e.target.value)}
                          required
                          style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '0.85rem' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                      <button
                        type="button"
                        onClick={() => setShowCreateAssessmentModal(false)}
                        className="btn-secondary"
                        style={{ padding: '8px 16px' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn-primary"
                        style={{ padding: '8px 20px' }}
                      >
                        Save Assessment
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Modal: Edit Assessment */}
            {editingAssessment && (
              <div style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(3px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100,
                padding: '20px'
              }} className="animate-fade-in">
                <div style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '20px',
                  maxWidth: '480px',
                  width: '100%',
                  padding: '28px',
                  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
                }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1C1917', marginBottom: '16px' }}>
                    Edit Assessment
                  </h3>

                  <form onSubmit={handleSaveEditAssessment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                        Assessment Title
                      </label>
                      <input
                        type="text"
                        value={editingAssessment.name}
                        onChange={(e) => setEditingAssessment({ ...editingAssessment, name: e.target.value })}
                        required
                        style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '0.85rem' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                        Department / Faculty
                      </label>
                      <select
                        value={editingAssessment.department}
                        onChange={(e) => setEditingAssessment({ ...editingAssessment, department: e.target.value })}
                        style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '0.85rem' }}
                      >
                        <option value="All Departments (University-wide)">All Departments (University-wide)</option>
                        <option value="Computer Science & Technology">Computer Science & Technology</option>
                        <option value="Electronics & Communication">Electronics & Communication</option>
                        <option value="Mechanical Engineering">Mechanical Engineering</option>
                        <option value="Management Studies">Management Studies</option>
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                          Time Limit (Mins)
                        </label>
                        <input
                          type="number"
                          min="10"
                          max="180"
                          value={editingAssessment.timeLimit}
                          onChange={(e) => setEditingAssessment({ ...editingAssessment, timeLimit: e.target.value })}
                          required
                          style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '0.85rem' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                          Items per Competency
                        </label>
                        <input
                          type="number"
                          min="2"
                          max="10"
                          value={editingAssessment.questionsPerCompetency}
                          onChange={(e) => setEditingAssessment({ ...editingAssessment, questionsPerCompetency: e.target.value })}
                          required
                          style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '0.85rem' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                      <button
                        type="button"
                        onClick={() => setEditingAssessment(null)}
                        className="btn-secondary"
                        style={{ padding: '8px 16px' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn-primary"
                        style={{ padding: '8px 20px' }}
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: Student Roster & Completed Attempts                     */}
        {/* ============================================================== */}
        {activeTab === 'roster' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1C1917' }}>
                  Student Assessment Directory
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#78716C', marginTop: '2px' }}>
                  Inspect all recorded student attempts, certificate verification IDs, and composite score ratings.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={exportRosterCSV}
                  className="btn-secondary"
                  style={{ padding: '7px 14px', fontSize: '0.82rem', gap: '6px' }}
                >
                  <FileSpreadsheet size={15} />
                  <span>Export Roster CSV</span>
                </button>
              </div>
            </div>

            {/* Filter toolbar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151' }}>Filter:</span>
                {[
                  { id: 'all', label: `All (${attempts.length})` },
                  { id: 'certified', label: `Certified (≥65%)` },
                  { id: 'pending', label: `Pending Growth (<65%)` }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setRosterStatusFilter(f.id)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '9999px',
                      fontSize: '0.78rem',
                      fontWeight: rosterStatusFilter === f.id ? 700 : 500,
                      backgroundColor: rosterStatusFilter === f.id ? '#8B1528' : '#FAF8F5',
                      color: rosterStatusFilter === f.id ? '#FFFFFF' : '#4B5563',
                      border: rosterStatusFilter === f.id ? 'none' : '1px solid #D6D3D1',
                      cursor: 'pointer'
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Search box */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #D6D3D1',
                borderRadius: '8px',
                padding: '5px 12px'
              }}>
                <Search size={14} color="#78716C" />
                <input
                  type="text"
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  placeholder="Search by student, roll no, dept..."
                  style={{ border: 'none', outline: 'none', fontSize: '0.82rem', width: '220px' }}
                />
              </div>
            </div>

            {/* Attempts Table */}
            <div className="mr-card" style={{ padding: '0', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#FAF8F5', borderBottom: '1px solid #EAE5DC' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 700, color: '#57534E' }}>Student</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, color: '#57534E' }}>Roll Number</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, color: '#57534E' }}>Faculty / Dept</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, color: '#57534E' }}>Score</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, color: '#57534E' }}>Status</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, color: '#57534E' }}>Submitted</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, color: '#57534E', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttempts.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ padding: '36px', textAlign: 'center', color: '#78716C' }}>
                        No completed student assessments found matching filter.
                      </td>
                    </tr>
                  ) : (
                    filteredAttempts.map((att) => {
                      const isPass = att.overallScore >= 65;
                      return (
                        <tr key={att.id} style={{ borderBottom: '1px solid #F1EFEA', transition: 'background-color 0.15s ease' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 700, color: '#1C1917' }}>
                            {att.studentName || 'Student'}
                          </td>
                          <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 600 }}>
                            {att.rollNo || 'N/A'}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#57534E' }}>
                            {att.department || 'CST'}
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: 800, color: isPass ? '#16A34A' : '#D97706' }}>
                            {att.overallScore}%
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              backgroundColor: isPass ? '#DCFCE7' : '#FEF3C7',
                              color: isPass ? '#15803D' : '#B45309'
                            }}>
                              {isPass ? 'CERTIFIED' : 'PENDING'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '0.76rem', color: '#78716C' }}>
                            {att.timestamp ? new Date(att.timestamp).toLocaleDateString() : 'Recent'}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <button
                                onClick={() => handleViewStudentReport(att)}
                                className="btn-secondary"
                                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                title="Open full competency score report"
                              >
                                Report
                              </button>

                              {isPass && (
                                <button
                                  onClick={() => handleViewStudentCertificate(att)}
                                  className="btn-primary"
                                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                  title="View official verified certificate"
                                >
                                  Certificate
                                </button>
                              )}

                              <button
                                onClick={() => handleDeleteAttempt(att.id)}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  backgroundColor: '#FEE2E2',
                                  border: '1px solid #FCA5A5',
                                  color: '#DC2626',
                                  cursor: 'pointer'
                                }}
                                title="Delete test attempt"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 5: Testing Access & Excel Roster                           */}
        {/* ============================================================== */}
        {activeTab === 'testers' && (
          <div className="animate-fade-in">
            {/* Status Message */}
            {testerStatusMessage && (
              <div style={{
                padding: '12px 18px',
                borderRadius: '12px',
                backgroundColor: '#DCFCE7',
                border: '1px solid #86EFAC',
                color: '#15803D',
                fontSize: '0.88rem',
                fontWeight: 600,
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <CheckCircle2 size={18} />
                <span>{testerStatusMessage}</span>
              </div>
            )}

            {/* Top Control Header */}
            <div className="mr-card" style={{ padding: '24px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '18px' }}>
                <div style={{ maxWidth: '640px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      backgroundColor: strictTestingMode ? '#FEF2F2' : '#F3F4F6',
                      color: strictTestingMode ? '#DC2626' : '#4B5563',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      {strictTestingMode ? '🔒 Strict Testing Mode Active' : '🔓 Open Institutional Mode'}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#78716C' }}>
                      Primary Admin: <strong>vineetkumar182023@gmail.com</strong>
                    </span>
                  </div>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1C1917', margin: '0 0 6px 0' }}>
                    Authorized Beta Testers & Access Control
                  </h2>
                  <p style={{ color: '#57534E', fontSize: '0.86rem', lineHeight: 1.5, margin: 0 }}>
                    Upload an Excel spreadsheet (<strong>.xlsx</strong>, <strong>.xls</strong>, or <strong>.csv</strong>) containing authorized student and faculty email addresses. When <strong>Strict Testing Mode</strong> is ON, <em>only</em> emails present in this roster can log in via OTP or Google Workspace.
                  </p>
                </div>

                {/* Mode Toggle Button */}
                <div style={{
                  padding: '16px 20px',
                  borderRadius: '14px',
                  backgroundColor: '#FAF8F5',
                  border: '1px solid #ECE7DF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px'
                }}>
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#1C1917' }}>
                      Strict Testing Mode
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#78716C' }}>
                      {strictTestingMode ? 'Only roster emails can sign in' : 'Permits all institutional users'}
                    </div>
                  </div>
                  <button
                    onClick={handleToggleStrictMode}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      color: strictTestingMode ? '#8B1528' : '#9CA3AF',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title={strictTestingMode ? 'Disable Strict Mode' : 'Enable Strict Mode'}
                  >
                    {strictTestingMode ? <ToggleRight size={38} /> : <ToggleLeft size={38} />}
                  </button>
                </div>
              </div>

              {/* Action Toolbar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginTop: '22px',
                paddingTop: '18px',
                borderTop: '1px solid #F3F4F6',
                flexWrap: 'wrap'
              }}>
                {/* Upload Excel Button */}
                <label style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  backgroundColor: '#8B1528',
                  color: '#FFFFFF',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(139, 21, 40, 0.25)',
                  transition: 'background-color 0.2s'
                }}>
                  <Upload size={16} />
                  <span>Upload Excel Sheet (.xlsx / .csv)</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleExcelUpload}
                    style={{ display: 'none' }}
                  />
                </label>

                {/* Download Sample Template */}
                <button
                  onClick={handleDownloadSampleExcel}
                  className="btn-secondary"
                  style={{ padding: '10px 16px', fontSize: '0.84rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <FileDown size={16} />
                  <span>Download Sample Excel Template</span>
                </button>

                {/* Send Email Invites */}
                <button
                  onClick={handleSendAllInvites}
                  disabled={isSendingInvites || authorizedTesters.length === 0}
                  className="btn-primary"
                  style={{
                    padding: '10px 18px',
                    fontSize: '0.84rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#1E40AF',
                    borderColor: '#1E40AF',
                    opacity: (isSendingInvites || authorizedTesters.length === 0) ? 0.6 : 1
                  }}
                >
                  <Mail size={16} />
                  <span>{isSendingInvites ? 'Sending Invites...' : `Send Invitation Emails (${authorizedTesters.length})`}</span>
                </button>

                {authorizedTesters.length > 0 && (
                  <button
                    onClick={handleClearAllTesters}
                    className="btn-secondary"
                    style={{
                      padding: '10px 14px',
                      fontSize: '0.82rem',
                      color: '#DC2626',
                      borderColor: '#FCA5A5',
                      marginLeft: 'auto'
                    }}
                  >
                    <Trash2 size={14} />
                    <span>Clear Roster</span>
                  </button>
                )}
              </div>
            </div>

            {/* Testers Roster Table */}
            <div className="mr-card" style={{ padding: '20px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserCheck size={18} color="#8B1528" />
                  <span style={{ fontSize: '0.98rem', fontWeight: 800, color: '#1C1917' }}>
                    Authorized Participants ({filteredTesters.length} of {authorizedTesters.length})
                  </span>
                </div>

                <div style={{ position: 'relative', width: '280px' }}>
                  <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#9CA3AF' }} />
                  <input
                    type="text"
                    placeholder="Search by email, name, roll no..."
                    value={testerSearch}
                    onChange={(e) => setTesterSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 10px 7px 32px',
                      borderRadius: '8px',
                      border: '1px solid #D6D3D1',
                      fontSize: '0.82rem'
                    }}
                  />
                </div>
              </div>

              {authorizedTesters.length === 0 ? (
                <div style={{
                  padding: '48px 24px',
                  textAlign: 'center',
                  backgroundColor: '#FAF8F5',
                  borderRadius: '12px',
                  border: '2px dashed #E5E7EB'
                }}>
                  <FileSpreadsheet size={42} color="#9CA3AF" style={{ margin: '0 auto 12px auto' }} />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1C1917', marginBottom: '6px' }}>
                    No Testing Roster Uploaded Yet
                  </h3>
                  <p style={{ color: '#78716C', fontSize: '0.84rem', maxWidth: '440px', margin: '0 auto 16px auto' }}>
                    Click <strong>"Download Sample Excel Template"</strong> to view the format, fill in your cohort's details, and upload the file to authorize testing access.
                  </p>
                  <button
                    onClick={handleDownloadSampleExcel}
                    className="btn-secondary"
                    style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                  >
                    <Download size={14} />
                    <span>Download Excel Template</span>
                  </button>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#FAF8F5', borderBottom: '2px solid #EAE7E0', textAlign: 'left' }}>
                        <th style={{ padding: '10px 14px', fontWeight: 700, color: '#4B5563' }}>#</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700, color: '#4B5563' }}>Email Address</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700, color: '#4B5563' }}>Full Name</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700, color: '#4B5563' }}>Roll / ID</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700, color: '#4B5563' }}>Department</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700, color: '#4B5563' }}>Role</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700, color: '#4B5563', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTesters.map((t, idx) => (
                        <tr key={t.email} style={{ borderBottom: '1px solid #F3F4F6', transition: 'background-color 0.15s' }}>
                          <td style={{ padding: '10px 14px', color: '#9CA3AF', fontSize: '0.78rem' }}>{idx + 1}</td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: '#1C1917' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{t.email}</span>
                              {t.email.toLowerCase() === 'vineetkumar182023@gmail.com' && (
                                <span style={{ padding: '1px 6px', borderRadius: '4px', backgroundColor: '#FEF3C7', color: '#92400E', fontSize: '0.68rem', fontWeight: 800 }}>
                                  PRIMARY ADMIN
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '10px 14px', color: '#374151' }}>{t.name || '—'}</td>
                          <td style={{ padding: '10px 14px', color: '#6B7280', fontFamily: 'monospace' }}>{t.rollNo || '—'}</td>
                          <td style={{ padding: '10px 14px', color: '#4B5563' }}>{t.department || 'Computer Science & Technology'}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              backgroundColor: t.role === 'faculty' ? '#EFF6FF' : '#F3F4F6',
                              color: t.role === 'faculty' ? '#1E40AF' : '#4B5563'
                            }}>
                              {t.role || 'student'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                            <button
                              onClick={() => handleDeleteTester(t.email)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                backgroundColor: '#FEE2E2',
                                border: '1px solid #FCA5A5',
                                color: '#DC2626',
                                cursor: 'pointer'
                              }}
                              title={`Revoke access for ${t.email}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Email Dispatch Result Modal */}
            {inviteResultModal && (
              <div style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '20px'
              }}>
                <div style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  width: '100%',
                  maxWidth: '520px',
                  padding: '28px',
                  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      backgroundColor: '#DCFCE7',
                      color: '#15803D',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Mail size={22} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1C1917', margin: 0 }}>
                        Testing Invitations Ready
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: '#78716C', margin: 0 }}>
                        {inviteResultModal.count} authorized testers queued
                      </p>
                    </div>
                  </div>

                  <p style={{ color: '#57534E', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: '20px' }}>
                    Invitation emails have been prepared for all authorized testers. If live institutional SMTP is configured on the backend, invitations are dispatched immediately. You can also open your default desktop email client with all testers pre-filled in <strong>BCC</strong> for instant 1-click delivery.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <a
                      href={inviteResultModal.mailtoLink}
                      className="btn-primary"
                      style={{
                        padding: '12px 20px',
                        fontSize: '0.88rem',
                        textAlign: 'center',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      <Send size={16} />
                      <span>Open Email Client (Pre-filled BCC Batch)</span>
                    </a>

                    <button
                      onClick={() => setInviteResultModal(null)}
                      className="btn-secondary"
                      style={{ padding: '10px 16px', fontSize: '0.85rem' }}
                    >
                      Close Window
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

