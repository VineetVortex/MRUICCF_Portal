import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Clock, Flag, AlertCircle, ChevronLeft, ChevronRight, Check,
  Sparkles, Send, HelpCircle, CheckCircle2, Zap, Info, Keyboard,
  RotateCcw, BookOpen, ShieldAlert, Wifi, WifiOff, Maximize2, Minimize2,
  RefreshCw, CheckCircle, Lock, Unlock, Play, Pause, Award, ArrowRight,
  FileText, BarChart2, ShieldCheck, Layers, Users, Sparkle, ListFilter,
  CheckCircle as CheckCircleIcon, ArrowLeft
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { COMPETENCIES_DATA } from '../data/assessmentData';
import { getStoredQuestions, saveAttempt, getQuestionnaireSettings, getSkillTimeLimit, getStoredAttempts } from '../lib/storage';
import { calculateAttemptResults, calculateSingleSkillResults, CERTIFICATION_THRESHOLD, getCompetencyLevel } from '../lib/scoring';
import {
  apiStartOrResumeAttempt,
  apiAutosaveAttempt,
  apiLogIntegrityEvent,
  apiFinalizeAttempt
} from '../lib/api';

/* ── Likert definitions ─────────────────────────────────────────────────── */
const LIKERT = [
  { value: 1, label: 'Strongly Disagree', short: 'SD', color: '#DC2626', bg: '#FEE2E2' },
  { value: 2, label: 'Disagree',          short: 'D',  color: '#EA580C', bg: '#FFEDD5' },
  { value: 3, label: 'Neutral',           short: 'N',  color: '#D97706', bg: '#FEF3C7' },
  { value: 4, label: 'Agree',             short: 'A',  color: '#2563EB', bg: '#DBEAFE' },
  { value: 5, label: 'Strongly Agree',    short: 'SA', color: '#16A34A', bg: '#DCFCE7' },
];

/* ── 15 Individual Competency Questionnaires (10 Questions Each, 150 Total) ───── */
export const INDIVIDUAL_QUESTIONNAIRES = [
  {
    id: 1,
    name: 'Communication',
    category: 'Interpersonal Dynamics',
    description: 'Evaluates personal articulation clarity, active and attentive listening, structured presentation of thought, and audience-tailored communication.',
    startIndex: 0,
    endIndex: 10,
    questionCount: 10,
  },
  {
    id: 2,
    name: 'Planning & Organizing',
    category: 'Execution & Planning',
    description: 'Assesses systematic goal setting, task prioritization by urgency and value, realistic timeline forecasting, and agile task decomposition.',
    startIndex: 10,
    endIndex: 20,
    questionCount: 10,
  },
  {
    id: 3,
    name: 'Professionalism',
    category: 'Institutional Conduct',
    description: 'Evaluates punctuality, workplace decorum, boundary respect, professional self-presentation, and formal communicative etiquette.',
    startIndex: 20,
    endIndex: 30,
    questionCount: 10,
  },
  {
    id: 4,
    name: 'Resource Management',
    category: 'Operational Stewardship',
    description: 'Measures resource optimization, material conservation, time-budget discipline, and equitable resource allocation among peers.',
    startIndex: 30,
    endIndex: 40,
    questionCount: 10,
  },
  {
    id: 5,
    name: 'Building Trust',
    category: 'Interpersonal Dynamics',
    description: 'Evaluates reliability, adherence to commitments, integrity in confidentiality, transparent admission of errors, and consistency.',
    startIndex: 40,
    endIndex: 50,
    questionCount: 10,
  },
  {
    id: 6,
    name: 'Collaboration & Teamwork',
    category: 'Team Dynamics',
    description: 'Evaluates team cohesion, proactive knowledge dissemination, prioritizing collective triumph over personal spotlight, and peer support.',
    startIndex: 50,
    endIndex: 60,
    questionCount: 10,
  },
  {
    id: 7,
    name: 'Conflict Resolution & Negotiation',
    category: 'Team Dynamics',
    description: 'Assesses calm de-escalation during disputes, win-win orientation, non-defensive perspective listening, and constructive consensus.',
    startIndex: 60,
    endIndex: 70,
    questionCount: 10,
  },
  {
    id: 8,
    name: 'Emotional Intelligence',
    category: 'Intrapersonal Mastery',
    description: 'Measures self-awareness under pressure, emotional regulation, deliberate reflection before reacting, and cue recognition in peers.',
    startIndex: 70,
    endIndex: 80,
    questionCount: 10,
  },
  {
    id: 9,
    name: 'Empathy',
    category: 'Interpersonal Dynamics',
    description: 'Assesses compassionate perspective-taking, active non-judgmental support, understanding peer hardships, and inclusive listening.',
    startIndex: 80,
    endIndex: 90,
    questionCount: 10,
  },
  {
    id: 10,
    name: 'Inclusion',
    category: 'Team Dynamics',
    description: 'Evaluates championing diverse perspectives, cultural sensitivity, ensuring fair voice allocation, and anti-bias principles.',
    startIndex: 90,
    endIndex: 100,
    questionCount: 10,
  },
  {
    id: 11,
    name: 'Ethics',
    category: 'Principled Leadership',
    description: 'Evaluates unwavering adherence to moral principles, transparent decision-making, resisting unethical shortcuts, and fair conduct.',
    startIndex: 100,
    endIndex: 110,
    questionCount: 10,
  },
  {
    id: 12,
    name: 'Accountability',
    category: 'Principled Leadership',
    description: 'Measures ownership of personal deliverables, accepting consequences without blame-shifting, and proactive rectifications.',
    startIndex: 110,
    endIndex: 120,
    questionCount: 10,
  },
  {
    id: 13,
    name: 'Lifelong Learning',
    category: 'Continuous Growth',
    description: 'Evaluates curiosity, self-directed upskilling, receptive integration of critique, and adaptation to novel methodologies.',
    startIndex: 120,
    endIndex: 130,
    questionCount: 10,
  },
  {
    id: 14,
    name: 'Resilience',
    category: 'Intrapersonal Mastery',
    description: 'Measures bounce-back fortitude from setbacks, psychological endurance under high stakes, and viewing hurdles as growth opportunities.',
    startIndex: 130,
    endIndex: 140,
    questionCount: 10,
  },
  {
    id: 15,
    name: 'Self-Management',
    category: 'Intrapersonal Mastery',
    description: 'Evaluates disciplined time allocation, distraction mitigation, proactive focus management, and work-life balance.',
    startIndex: 140,
    endIndex: 150,
    questionCount: 10,
  }
];

// Backward-compatible alias
export const ASSESSMENT_SESSIONS = INDIVIDUAL_QUESTIONNAIRES;

export default function AssessmentView({
  setView,
  currentUser,
  userRole,
  activeAssessment,
  onCompleteAttempt,
  examLockdown,
  setExamLockdown
}) {
  const allStored = getStoredQuestions();
  const approvedQuestions = allStored.filter(q => q.approvalStatus === 'approved');
  const questionsList = approvedQuestions.length > 0 ? approvedQuestions : allStored;
  const totalQuestions = questionsList.length;

  const assessmentId = activeAssessment?.id || 'asmt-2026-core';
  const assessmentName = activeAssessment?.name || 'Human-Centric Skills Assessment 2026';

  const currentUserId = currentUser?.uid || currentUser?.id || 'usr_anonymous';
  const localKey = `mr_iccf_attempt_${currentUserId}_${assessmentId}`;

  // ── Active Questionnaire Navigation State ──────────────────────────────
  // activeQuestionnaireId: null -> Render Student Portal Questionnaires Hub
  // activeQuestionnaireId: number (1 to 15) -> Render Active Assessment Player
  const [activeQuestionnaireId, setActiveQuestionnaireId] = useState(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');

  // Cumulative Responses & Attempts
  const [attemptId, setAttemptId] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState(new Set());
  const [version, setVersion] = useState(1);
  const [isInitializing, setIsInitializing] = useState(true);

  // Active Assessment Timer — server-anchored deadline
  // deadlineAt holds the ISO string returned by the server; all ticking is relative to it
  const [deadlineAt, setDeadlineAt] = useState(null);
  const [sessionTimeLeft, setSessionTimeLeft] = useState(() => getSkillTimeLimit(1) * 60);
  const [isTimeExpired, setIsTimeExpired] = useState(false);

  // Autosave & Network Status
  const [saveStatus, setSaveStatus] = useState('saved');
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Fullscreen & Academic Integrity
  const [focusLostCount, setFocusLostCount] = useState(0);
  const [integrityWarning, setIntegrityWarning] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Modals
  const [showFinalSubmitModal, setShowFinalSubmitModal] = useState(false);
  const [showFlaggedReview, setShowFlaggedReview] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Skill-specific submission warning & completion modals
  const [showSkillSubmitWarningModal, setShowSkillSubmitWarningModal] = useState(false);
  const [skillSubmitTarget, setSkillSubmitTarget] = useState(null);
  const [completedSkillModalData, setCompletedSkillModalData] = useState(null);

  // Pre-Exam Instruction & Strict Lockdown Briefing Modal
  const [showExamBriefingModal, setShowExamBriefingModal] = useState(false);
  const [pendingStartQId, setPendingStartQId] = useState(null);

  // Live synchronizing attempt records to display completed skills in the Hub
  const [allAttemptsList, setAllAttemptsList] = useState(() => getStoredAttempts());

  useEffect(() => {
    const handleAttemptsSync = () => {
      setAllAttemptsList(getStoredAttempts());
    };
    window.addEventListener('iccf_attempts_updated', handleAttemptsSync);
    return () => window.removeEventListener('iccf_attempts_updated', handleAttemptsSync);
  }, []);

  // Listen for admin changes to questionnaire timing
  useEffect(() => {
    const handleTimingsSync = () => {
      if (activeQuestionnaireId) {
        const newMins = getSkillTimeLimit(activeQuestionnaireId);
        setSessionTimeLeft(prev => Math.min(prev, newMins * 60));
      }
    };
    window.addEventListener('iccf_timings_updated', handleTimingsSync);
    return () => window.removeEventListener('iccf_timings_updated', handleTimingsSync);
  }, [activeQuestionnaireId]);

  // Debounce ref for autosave
  const autosaveTimeoutRef = useRef(null);

  /* ──────────────────────────────────────────────────────────────────────────
     1. Authoritative Backend Attempt Handshake
  ────────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      setIsInitializing(true);
      try {
        const res = await apiStartOrResumeAttempt({
          assessmentId,
          assessmentName,
          timeLimitMinutes: 75,
          totalQuestions,
          userId: currentUserId,
          studentName: currentUser?.name || 'Student',
          rollNo: currentUser?.rollNo || '2024-CST-001',
          department: currentUser?.department || 'Computer Science & Technology',
        });

        if (!isMounted) return;

        if (res && res.success && res.data) {
          const session = res.data;
          setAttemptId(session.id);

          // Store the immutable server deadline for timer anchoring
          if (session.deadlineAt) {
            setDeadlineAt(session.deadlineAt);
            const remaining = Math.max(0, Math.floor((new Date(session.deadlineAt).getTime() - Date.now()) / 1000));
            setSessionTimeLeft(remaining);
          }

          if (res.resumed) {
            const restoredAnswers = session.answers || {};
            setAnswers(restoredAnswers);
            setFlagged(new Set(session.flaggedQuestionIds || []));
            setFocusLostCount(session.focusLostCount || 0);
            setVersion(session.version || 1);
            if (typeof session.currentIndex === 'number' && session.currentIndex >= 0 && session.currentIndex < totalQuestions) {
              setCurrentIndex(session.currentIndex);
            }
          } else {
            // Restore from local cache if available
            try {
              const localDraft = JSON.parse(localStorage.getItem(localKey) || '{}');
              if (localDraft.answers && Object.keys(localDraft.answers).length > 0) {
                setAnswers(localDraft.answers);
                if (localDraft.flagged) setFlagged(new Set(localDraft.flagged));
                if (typeof localDraft.currentIndex === 'number') setCurrentIndex(localDraft.currentIndex);
              }
            } catch (e) {}
          }
        } else {
          // Offline Fallback Attempt ID
          const fallbackAttemptId = `att_local_${Date.now()}`;
          setAttemptId(fallbackAttemptId);
          try {
            const localDraft = JSON.parse(localStorage.getItem(localKey) || '{}');
            if (localDraft.answers) {
              setAnswers(localDraft.answers);
              if (localDraft.flagged) setFlagged(new Set(localDraft.flagged));
              if (typeof localDraft.currentIndex === 'number') setCurrentIndex(localDraft.currentIndex);
            }
          } catch (e) {}
        }
      } catch (err) {
        console.error('[AssessmentView] Session handshake notice:', err);
      } finally {
        if (isMounted) setIsInitializing(false);
      }
    }

    initSession();

    return () => {
      isMounted = false;
    };
  }, [assessmentId, currentUserId]); // eslint-disable-line

  /* ──────────────────────────────────────────────────────────────────────────
     2. Active Assessment Countdown Timer — server-anchored when deadlineAt is known
  ────────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!activeQuestionnaireId) return;

    const interval = setInterval(() => {
      let remaining;
      if (deadlineAt) {
        // Authoritative: always compute from server deadline
        remaining = Math.max(0, Math.floor((new Date(deadlineAt).getTime() - Date.now()) / 1000));
      } else {
        // Offline fallback: pure client decrement
        setSessionTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsTimeExpired(true);
            handleSingleSkillSubmit(activeQuestionnaireId, true);
            return 0;
          }
          return prev - 1;
        });
        return;
      }

      setSessionTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        setIsTimeExpired(true);
        handleSingleSkillSubmit(activeQuestionnaireId, true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeQuestionnaireId, deadlineAt, isTimeExpired]); // eslint-disable-line

  /* ──────────────────────────────────────────────────────────────────────────
     3. Debounced Autosave to Server + Instant Local Storage Cache
  ────────────────────────────────────────────────────────────────────────── */
  const triggerAutosave = useCallback(
    (newAnswers, newCurrentIndex = currentIndex, newFlagged = flagged) => {
      // 1. Instant local persistence
      try {
        localStorage.setItem(
          localKey,
          JSON.stringify({
            attemptId,
            assessmentId,
            answers: newAnswers,
            currentIndex: newCurrentIndex,
            flagged: Array.from(newFlagged),
            updatedAt: new Date().toISOString(),
          })
        );
      } catch (e) {}

      // 2. Server autosave (debounced 1.2s)
      if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
      setSaveStatus('saving');

      autosaveTimeoutRef.current = setTimeout(async () => {
        if (!attemptId || attemptId.startsWith('att_local_')) {
          setSaveStatus('saved');
          return;
        }

        try {
          const res = await apiAutosaveAttempt(attemptId, {
            answers: newAnswers,
            currentIndex: newCurrentIndex,
            flaggedQuestionIds: Array.from(newFlagged),
            clientVersion: version,
          });

          if (res && res.success) {
            setSaveStatus('saved');
            if (res.data?.version) setVersion(res.data.version);
          } else {
            setSaveStatus('offline');
          }
        } catch (err) {
          console.warn('[AssessmentView] Autosave background notice:', err);
          setSaveStatus('offline');
        }
      }, 1200);
    },
    [attemptId, assessmentId, localKey, currentIndex, flagged, version]
  );

  /* ──────────────────────────────────────────────────────────────────────────
     4. Exam Lockdown Sync with Parent App — NO pause/exit while active
  ────────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (activeQuestionnaireId && setExamLockdown) {
      const activeQ = INDIVIDUAL_QUESTIONNAIRES.find(q => q.id === activeQuestionnaireId);
      setExamLockdown({
        active: true,
        sessionTitle: activeQ ? `${activeQ.name} Questionnaire` : 'Active Assessment Session',
        // onSaveAndExit is intentionally omitted — no pause allowed in strict mode
      });
    } else if (!activeQuestionnaireId && setExamLockdown) {
      setExamLockdown(null);
    }
  }, [activeQuestionnaireId, setExamLockdown]);

  /* ──────────────────────────────────────────────────────────────────────────
     5. Tab Switch / Focus Loss / Fullscreen Exit Integrity Monitor (3-Strike Rule)
  ────────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!activeQuestionnaireId) return;

    const recordViolation = (type, note) => {
      setFocusLostCount(prev => {
        const newCount = prev + 1;
        const remaining = Math.max(0, 3 - newCount);

        if (newCount >= 3) {
          setIntegrityWarning({
            type: 'CRITICAL_BREACH',
            severity: 'critical',
            message: `ACADEMIC INTEGRITY THRESHOLD EXCEEDED (Strike 3/3): Examination is terminating and submitting automatically.`,
            count: newCount,
          });
          // Submit immediately on 3rd violation
          setTimeout(() => {
            handleSingleSkillSubmit(activeQuestionnaireId, true);
          }, 400);
        } else {
          setIntegrityWarning({
            type,
            severity: newCount === 2 ? 'high' : 'medium',
            message: newCount === 2
              ? `CRITICAL WARNING (Strike 2/3): Focus or fullscreen lost! 1 more violation will immediately submit your examination.`
              : `Academic Integrity Warning (Strike 1/3): You navigated away or exited focus. ${remaining} warnings remaining before auto-submission.`,
            count: newCount,
          });
        }

        if (attemptId && !attemptId.startsWith('att_local_')) {
          apiLogIntegrityEvent(attemptId, {
            type,
            note: `${note} (Strike #${newCount}) during Questionnaire #${activeQuestionnaireId}`,
          }).then(res => {
            if (res && res.autoSubmitted) {
              handleSingleSkillSubmit(activeQuestionnaireId, true);
            }
          }).catch(() => {});
        }

        return newCount;
      });
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordViolation('FOCUS_LOST', 'Window or browser tab focus lost');
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && activeQuestionnaireId) {
        setIsFullscreen(false);
        recordViolation('FULLSCREEN_EXIT', 'Exited fullscreen examination mode');
      } else if (document.fullscreenElement) {
        setIsFullscreen(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [activeQuestionnaireId, attemptId]); // eslint-disable-line

  /* ──────────────────────────────────────────────────────────────────────────
     6. Fullscreen Focus Mode
  ────────────────────────────────────────────────────────────────────────── */
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.warn('Fullscreen request denied:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(() => {});
    }
  };

  /* ──────────────────────────────────────────────────────────────────────────
     7. Open or Resume Specific Individual Questionnaire
  ────────────────────────────────────────────────────────────────────────── */
  const handleOpenQuestionnaire = (qId) => {
    const qDef = INDIVIDUAL_QUESTIONNAIRES.find(q => q.id === qId);
    if (!qDef) return;

    // If the server gave us an immutable deadline, compute remaining from it.
    // Otherwise fall back to the admin-configured per-skill duration.
    if (deadlineAt) {
      const remaining = Math.max(0, Math.floor((new Date(deadlineAt).getTime() - Date.now()) / 1000));
      setSessionTimeLeft(remaining);
    } else {
      const durationMinutes = getSkillTimeLimit(qId);
      setSessionTimeLeft(durationMinutes * 60);
    }
    setIsTimeExpired(false);

    // Find first unanswered question within this questionnaire, or start at its beginning
    let targetIdx = qDef.startIndex;
    for (let i = qDef.startIndex; i < qDef.endIndex; i++) {
      const q = questionsList[i];
      if (q && answers[q.id] === undefined) {
        targetIdx = i;
        break;
      }
    }

    setCurrentIndex(targetIdx);
    setActiveQuestionnaireId(qId);
  };

  /* ── Strict Exam Mode Briefing Handshake ── */
  const handleRequestStartQuestionnaire = (qId) => {
    setPendingStartQId(qId);
    setShowExamBriefingModal(true);
  };

  const handleConfirmStartExam = () => {
    setShowExamBriefingModal(false);
    if (!pendingStartQId) return;

    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.warn('Fullscreen request note:', err);
      });
    }

    handleOpenQuestionnaire(pendingStartQId);
  };

  /* ── Submit Individual Skill Questionnaire (Strict Human-Centric Single Skill Grading) ── */
  const handleSingleSkillSubmit = (qId = activeQuestionnaireId, force = false) => {
    const qDef = INDIVIDUAL_QUESTIONNAIRES.find(q => q.id === qId);
    if (!qDef) return;

    const skillQuestions = questionsList.slice(qDef.startIndex, qDef.endIndex);
    const answeredInThisSkill = skillQuestions.filter(q => answers[q.id] !== undefined).length;

    // If not all questions answered and not forced by timeout or confirmation, show warning
    if (answeredInThisSkill < qDef.questionCount && !force) {
      setSkillSubmitTarget(qDef);
      setShowSkillSubmitWarningModal(true);
      return;
    }

    setShowSkillSubmitWarningModal(false);

    // Calculate single skill results
    const result = calculateSingleSkillResults(skillQuestions, answers, qDef);
    const timeLimitSeconds = getSkillTimeLimit(qId) * 60;
    const timeSpentSeconds = Math.max(1, timeLimitSeconds - sessionTimeLeft);
    const m = Math.floor(timeSpentSeconds / 60);
    const s = timeSpentSeconds % 60;
    const timeFormatted = `${m}m ${s}s`;

    const skillCode = qDef.name.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, '');
    const rollClean = (currentUser?.rollNo || 'GEN').replace(/[^a-zA-Z0-9]/g, '');
    const year = new Date().getFullYear();
    const certNumber = `MRU-ICCF-${skillCode}-${rollClean}-${year}`;

    const skillAttempt = {
      id: `att_skill_${qDef.id}_${Date.now()}`,
      userId: currentUserId,
      studentName: currentUser?.name || 'Student',
      rollNo: currentUser?.rollNo || '2024-CST-001',
      department: currentUser?.department || 'Computer Science & Technology',
      assessmentId: `${assessmentId}-skill-${qDef.id}`,
      assessmentName: `${qDef.name} Competency Assessment`,
      skillId: qDef.id,
      skillName: qDef.name,
      skillCode,
      overallScore: result.score,
      score: result.score,
      compositeScore: result.score,
      certificationStatus: result.certificationStatus,
      isCertified: result.isCertified,
      level: result.levelInfo.level,
      levelName: result.levelInfo.name,
      levelLabel: result.levelInfo.label,
      marks: result.levelInfo.marks,
      status: 'submitted',
      timestamp: new Date().toISOString(),
      timeSpentSeconds,
      timeTakenFormatted: timeFormatted,
      totalQuestions: qDef.questionCount,
      answeredCount: result.answeredCount,
      answers: { ...answers },
      competencyScores: result.competencyScores,
      strengths: result.strengths,
      developmentAreas: result.developmentAreas,
      certificate: {
        certificateNumber: certNumber,
        verificationHash: `vh_${Date.now()}_${qDef.id}`,
        skillName: qDef.name,
        issueDate: new Date().toISOString(),
      }
    };

    // Save locally & broadcast
    saveAttempt(skillAttempt);

    // Finalize on authoritative backend server
    if (attemptId && !attemptId.startsWith('att_local_')) {
      apiFinalizeAttempt(attemptId, {
        answers: { ...answers },
        timeSpentSeconds,
        timeTakenFormatted: timeFormatted,
      }).catch(err => console.warn('[AssessmentView] Finalize attempt notice:', err));
    }

    // Refresh attempts list
    setAllAttemptsList(getStoredAttempts());

    if (result.isCertified) {
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
    }

    // Show completion modal
    setCompletedSkillModalData(skillAttempt);
  };

  /* ── Launch Complete Assessment from the beginning or first unanswered ── */
  const handleStartCompleteAssessment = () => {
    let firstUnansweredIdx = 0;
    for (let i = 0; i < totalQuestions; i++) {
      const q = questionsList[i];
      if (q && answers[q.id] === undefined) {
        firstUnansweredIdx = i;
        break;
      }
    }
    const matchingQ = INDIVIDUAL_QUESTIONNAIRES.find(
      q => firstUnansweredIdx >= q.startIndex && firstUnansweredIdx < q.endIndex
    ) || INDIVIDUAL_QUESTIONNAIRES[0];

    setCurrentIndex(firstUnansweredIdx);
    setActiveQuestionnaireId(matchingQ.id);
  };

  /* ──────────────────────────────────────────────────────────────────────────
     8. Answer Selection & Navigation
  ────────────────────────────────────────────────────────────────────────── */
  const handleSelectAnswer = (qId, value) => {
    setAnswers(prev => {
      const updated = { ...prev, [qId]: value };
      triggerAutosave(updated, currentIndex, flagged);
      return updated;
    });
  };

  const handleNavigate = (nextIndex) => {
    if (nextIndex < 0 || nextIndex >= totalQuestions) return;
    setCurrentIndex(nextIndex);

    // Keep activeQuestionnaireId synchronized with current question index
    const matchingQ = INDIVIDUAL_QUESTIONNAIRES.find(
      q => nextIndex >= q.startIndex && nextIndex < q.endIndex
    );
    if (matchingQ && matchingQ.id !== activeQuestionnaireId) {
      setActiveQuestionnaireId(matchingQ.id);
    }

    triggerAutosave(answers, nextIndex, flagged);
  };

  const handleToggleFlag = (qId) => {
    setFlagged(prev => {
      const updated = new Set(prev);
      if (updated.has(qId)) updated.delete(qId);
      else updated.add(qId);
      triggerAutosave(answers, currentIndex, updated);
      return updated;
    });
  };

  /* ──────────────────────────────────────────────────────────────────────────
     9. Keyboard Shortcuts
  ────────────────────────────────────────────────────────────────────────── */
  const handleKeyDown = useCallback(
    (e) => {
      if (!activeQuestionnaireId) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const key = e.key;
      const q = questionsList[currentIndex];

      if (['1', '2', '3', '4', '5'].includes(key) && q) {
        handleSelectAnswer(q.id, Number(key));
      }
      if ((key === 'ArrowRight' || key === 'n') && currentIndex < totalQuestions - 1) {
        handleNavigate(currentIndex + 1);
      }
      if ((key === 'ArrowLeft' || key === 'p') && currentIndex > 0) {
        handleNavigate(currentIndex - 1);
      }
      if (key === 'f' && q) {
        handleToggleFlag(q.id);
      }
    },
    [activeQuestionnaireId, currentIndex, totalQuestions, questionsList, answers, flagged] // eslint-disable-line
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  /* ──────────────────────────────────────────────────────────────────────────
     10. Final Assessment Submission
  ────────────────────────────────────────────────────────────────────────── */
  const handleFinalAssessmentSubmit = async () => {
    setShowFinalSubmitModal(false);
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const scoringResult = calculateAttemptResults(questionsList, answers, COMPETENCIES_DATA);
      const totalTimeSpentSeconds = (75 * 60) - sessionTimeLeft;
      const m = Math.floor(totalTimeSpentSeconds / 60);
      const s = totalTimeSpentSeconds % 60;
      const timeFormatted = `${m}m ${s}s`;

      let finalAttemptResult = null;

      // Authoritative Backend Finalization
      if (attemptId && !attemptId.startsWith('att_local_')) {
        const apiRes = await apiFinalizeAttempt(attemptId, {
          answers,
          timeSpentSeconds: totalTimeSpentSeconds,
          timeTakenFormatted: timeFormatted,
        });

        if (apiRes && apiRes.success && apiRes.data?.attempt) {
          finalAttemptResult = apiRes.data.attempt;
          if (apiRes.data.certificate) {
            finalAttemptResult.certificate = apiRes.data.certificate;
          }
        }
      }

      // Offline / Local construct fallback
      if (!finalAttemptResult) {
        finalAttemptResult = {
          id: attemptId || `att_${Date.now()}`,
          userId: currentUserId,
          studentName: currentUser?.name || 'Student',
          rollNo: currentUser?.rollNo || '2024-CST-001',
          department: currentUser?.department || 'Manav Rachna Educational Institutions',
          assessmentId,
          assessmentName,
          overallScore: scoringResult.compositeScore,
          certificationStatus: scoringResult.certificationStatus,
          isCertified: scoringResult.isCertified,
          status: 'submitted',
          timestamp: new Date().toISOString(),
          timeSpentSeconds: totalTimeSpentSeconds,
          timeTakenFormatted: timeFormatted,
          totalQuestions,
          answers,
          competencyScores: scoringResult.competencyScores,
          strengths: scoringResult.strengths,
          developmentAreas: scoringResult.developmentAreas,
        };
      }

      // Always persist attempt locally to trigger concurrent live events across browser tabs
      saveAttempt(finalAttemptResult);

      // Cleanup local draft
      try {
        localStorage.removeItem(localKey);
      } catch (e) {}

      if (finalAttemptResult.isCertified) {
        confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
      }

      if (onCompleteAttempt) {
        onCompleteAttempt(finalAttemptResult);
      } else {
        setTimeout(() => setView('results'), 500);
      }
    } catch (err) {
      console.error('[AssessmentView] Final submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ──────────────────────────────────────────────────────────────────────────
     Helper Calculation & Presentation Values
  ────────────────────────────────────────────────────────────────────────── */
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = totalQuestions - answeredCount;
  const overallProgressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  // Group user attempts by skillId
  const userCompletedAttempts = allAttemptsList.filter(
    a => a.userId === currentUserId || (currentUser?.rollNo && a.rollNo === currentUser.rollNo)
  );
  const completedSkillsMap = {};
  userCompletedAttempts.forEach(a => {
    if (a.skillId) {
      if (!completedSkillsMap[a.skillId] || new Date(a.timestamp) > new Date(completedSkillsMap[a.skillId].timestamp)) {
        completedSkillsMap[a.skillId] = a;
      }
    }
  });

  // Track progress per individual questionnaire
  const questionnairesProgress = INDIVIDUAL_QUESTIONNAIRES.map(qDef => {
    const qList = questionsList.slice(qDef.startIndex, qDef.endIndex);
    const answeredInQ = qList.filter(q => answers[q.id] !== undefined).length;
    const pastAttempt = completedSkillsMap[qDef.id];
    const isCompleted = Boolean(pastAttempt) || answeredInQ === qDef.questionCount;
    const isInProgress = !isCompleted && answeredInQ > 0;
    const configuredTime = getSkillTimeLimit(qDef.id);
    return {
      ...qDef,
      answeredCount: answeredInQ,
      isCompleted,
      isInProgress,
      pastAttempt,
      configuredTime,
      progressPercent: Math.round((answeredInQ / qDef.questionCount) * 100)
    };
  });

  const completedQuestionnairesCount = questionnairesProgress.filter(q => q.isCompleted).length;
  const allQuestionnairesCompleted = completedQuestionnairesCount === INDIVIDUAL_QUESTIONNAIRES.length;

  const categoriesList = ['All', ...new Set(INDIVIDUAL_QUESTIONNAIRES.map(q => q.category))];
  const filteredQuestionnaires = selectedCategoryFilter === 'All'
    ? questionnairesProgress
    : questionnairesProgress.filter(q => q.category === selectedCategoryFilter);

  const formatTimer = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  // Quick fill tester helper
  const autoFillAll = (type = 'high') => {
    const filled = { ...answers };
    questionsList.forEach(q => {
      filled[q.id] = type === 'high' ? (q.isReverse ? 1 : 5) : (q.isReverse ? 5 : 1);
    });
    setAnswers(filled);
    triggerAutosave(filled, currentIndex, flagged);
  };

  if (isInitializing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
        <RefreshCw size={36} color="#8B1528" className="animate-spin" />
        <div style={{ fontWeight: 700, color: '#1C1917', fontSize: '1.1rem' }}>
          Loading Diagnostic Questionnaires...
        </div>
        <p style={{ color: '#78716C', fontSize: '0.85rem' }}>
          Synchronizing institutional criteria, 15 individual questionnaires, and answer records
        </p>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════════════════
     VIEW MODE 1: STUDENT PORTAL QUESTIONNAIRES HUB (when activeQuestionnaireId === null)
     Displays all 15 individual competency questionnaires without Part 1/2/3 division.
  ══════════════════════════════════════════════════════════════════════════ */
  if (!activeQuestionnaireId) {
    return (
      <div style={{ padding: '28px 0 80px 0', minHeight: 'calc(100vh - 72px)' }} className="animate-fade-in">
        <div className="container" style={{ maxWidth: '1180px', margin: '0 auto', padding: '0 20px' }}>

          {/* Admin / Faculty Preview Return Banner */}
          {userRole && userRole !== 'student' && (
            <div style={{
              backgroundColor: '#FFFBEB',
              borderRadius: '16px',
              padding: '14px 20px',
              border: '1px solid #FDE68A',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: '#D97706'
                }} />
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#92400E' }}>
                    Assessment Preview Mode ({userRole === 'faculty' || userRole === 'dept_head' ? 'Faculty' : 'Admin'} Console)
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#B45309' }}>
                    You are previewing all 15 modular competency questionnaires as presented in the student portal.
                  </div>
                </div>
              </div>
              <button
                onClick={() => setView(userRole === 'faculty' || userRole === 'dept_head' ? 'faculty' : 'admin')}
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.84rem', fontWeight: 700, backgroundColor: '#FFFFFF' }}
              >
                ← Return to {userRole === 'faculty' || userRole === 'dept_head' ? 'Faculty Portal' : 'Admin Console'}
              </button>
            </div>
          )}

          {/* ── Offline Banner ── */}
          {!isOnline && (
            <div style={{
              backgroundColor: '#FFFBEB', border: '1px solid #FDE68A',
              borderRadius: '14px', padding: '12px 20px', marginBottom: '20px',
              display: 'flex', alignItems: 'center', gap: '10px'
            }}>
              <WifiOff size={18} color="#D97706" />
              <span style={{ fontSize: '0.86rem', fontWeight: 600, color: '#92400E' }}>
                Offline Mode: Your questionnaire progress is safely cached locally and will sync once connected.
              </span>
            </div>
          )}

          {/* ── Institutional Hero Briefing Card ── */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            border: '1px solid #ECE7DF',
            boxShadow: '0 4px 20px rgba(139, 21, 40, 0.04)',
            padding: '36px 36px 32px 36px',
            marginBottom: '28px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Top Accent Bar */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '5px',
              background: 'linear-gradient(90deg, #8B1528 0%, #D4AF37 50%, #8B1528 100%)'
            }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
              <div style={{ maxWidth: '780px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <span style={{
                    backgroundColor: '#FDF2F4',
                    color: '#8B1528',
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <Award size={13} /> Official University Diagnostic Assessment
                  </span>
                  <span style={{ color: '#64748B', fontSize: '0.8rem', fontWeight: 600 }}>
                    15 Individual Diagnostic Questionnaires
                  </span>
                </div>

                <h1 style={{
                  fontSize: '1.85rem',
                  fontWeight: 800,
                  color: '#1C1917',
                  lineHeight: 1.25,
                  marginBottom: '12px',
                  fontFamily: 'var(--font-sans)'
                }}>
                  Human-Centric Competency Framework (ICCF)
                </h1>

                <p style={{
                  fontSize: '0.95rem',
                  color: '#57534E',
                  lineHeight: 1.6,
                  marginBottom: '20px'
                }}>
                  Welcome to the Manav Rachna diagnostic assessment portal. The framework evaluates 
                  <strong> 15 core human competencies</strong> across leadership, empathy, ethical reasoning, and teamwork.
                  Each competency is evaluated through its own <strong>individual questionnaire of 10 diagnostic items</strong> (150 items total).
                  You may complete the questionnaires individually in any order, or take the complete evaluation continuously.
                </p>

                {/* Criteria Pillars */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                  gap: '12px',
                  paddingTop: '6px'
                }}>
                  <div style={{ padding: '12px 14px', borderRadius: '12px', backgroundColor: '#FAF8F5', border: '1px solid #ECE7DF' }}>
                    <div style={{ fontSize: '0.72rem', color: '#78716C', fontWeight: 700, textTransform: 'uppercase' }}>Scope &amp; Modules</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1C1917', marginTop: '2px' }}>15 Questionnaires</div>
                    <div style={{ fontSize: '0.72rem', color: '#8B1528', fontWeight: 600 }}>10 Items Each • 150 Total</div>
                  </div>

                  <div style={{ padding: '12px 14px', borderRadius: '12px', backgroundColor: '#FAF8F5', border: '1px solid #ECE7DF' }}>
                    <div style={{ fontSize: '0.72rem', color: '#78716C', fontWeight: 700, textTransform: 'uppercase' }}>Passing Benchmark</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>65.00% Score</div>
                    <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>Official Standard</div>
                  </div>

                  <div style={{ padding: '12px 14px', borderRadius: '12px', backgroundColor: '#FAF8F5', border: '1px solid #ECE7DF' }}>
                    <div style={{ fontSize: '0.72rem', color: '#78716C', fontWeight: 700, textTransform: 'uppercase' }}>Flexibility</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1C1917', marginTop: '2px' }}>Individual Flow</div>
                    <div style={{ fontSize: '0.72rem', color: '#D97706', fontWeight: 600 }}>Take In Any Sequence</div>
                  </div>

                  <div style={{ padding: '12px 14px', borderRadius: '12px', backgroundColor: '#FAF8F5', border: '1px solid #ECE7DF' }}>
                    <div style={{ fontSize: '0.72rem', color: '#78716C', fontWeight: 700, textTransform: 'uppercase' }}>Integrity &amp; State</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1C1917', marginTop: '2px' }}>Live Autosave</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Pause &amp; Resume Anytime</div>
                  </div>
                </div>
              </div>

              {/* Progress Summary Card */}
              <div style={{
                backgroundColor: '#FAF8F5',
                borderRadius: '20px',
                padding: '24px 28px',
                border: '1px solid #ECE7DF',
                textAlign: 'center',
                minWidth: '230px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#78716C', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Questionnaires Completed
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#8B1528', lineHeight: 1 }}>
                  {completedQuestionnairesCount} <span style={{ fontSize: '1.25rem', color: '#A8A29E', fontWeight: 600 }}>/ 15</span>
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1C1917', marginTop: '6px' }}>
                  {answeredCount} of {totalQuestions} Items Answered ({overallProgressPercent}%)
                </div>

                <button
                  type="button"
                  onClick={handleStartCompleteAssessment}
                  className="btn-primary"
                  style={{
                    marginTop: '16px',
                    width: '100%',
                    padding: '10px 16px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Play size={14} />
                  <span>{answeredCount > 0 ? 'Resume Assessment' : 'Take Complete Assessment'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── Overall Cumulative Progress Bar ── */}
          <div style={{ marginBottom: '28px', backgroundColor: '#FFFFFF', padding: '18px 24px', borderRadius: '16px', border: '1px solid #ECE7DF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1C1917' }}>
                Cumulative Assessment Progress
              </span>
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#8B1528' }}>
                {answeredCount} / {totalQuestions} Items Answered ({overallProgressPercent}%)
              </span>
            </div>
            <div style={{ height: '10px', backgroundColor: '#F1F5F9', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{
                width: `${overallProgressPercent}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #8B1528 0%, #D4AF37 100%)',
                borderRadius: '9999px',
                transition: 'width 0.4s ease'
              }} />
            </div>
          </div>

          {/* ── Ready to Finalize Banner ── */}
          {answeredCount >= totalQuestions && (
            <div style={{
              backgroundColor: '#ECFDF5',
              border: '2px solid #10B981',
              borderRadius: '20px',
              padding: '24px 30px',
              marginBottom: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
              boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.15)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  backgroundColor: '#D1FAE5', color: '#059669',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <CheckCircle2 size={30} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#065F46', margin: 0 }}>
                    All 15 Questionnaires Completed!
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: '#047857', margin: '4px 0 0 0' }}>
                    All 150 items across all 15 competencies have been answered. You can now finalize your evaluation to compute your institutional scorecard and issue your official certificate.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowFinalSubmitModal(true)}
                className="btn-primary"
                style={{
                  backgroundColor: '#059669',
                  borderColor: '#047857',
                  padding: '13px 28px',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  boxShadow: '0 4px 14px rgba(5, 150, 105, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Award size={18} />
                <span>Finalize Assessment &amp; View Certificate</span>
              </button>
            </div>
          )}

          {/* ── Section Title & Category Filter ── */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
            marginBottom: '18px'
          }}>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1C1917', margin: 0 }}>
                Individual Competency Questionnaires
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#78716C', margin: '4px 0 0 0' }}>
                Select any individual questionnaire to start or resume. All questionnaires are open and self-paced.
              </p>
            </div>

            {/* Category Pills Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {categoriesList.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategoryFilter(cat)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '9999px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    border: selectedCategoryFilter === cat ? '1.5px solid #8B1528' : '1px solid #ECE7DF',
                    backgroundColor: selectedCategoryFilter === cat ? '#FDF2F4' : '#FFFFFF',
                    color: selectedCategoryFilter === cat ? '#8B1528' : '#57534E',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* ── 15 Individual Questionnaire Cards Grid ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '18px'
          }}>
            {filteredQuestionnaires.map((q) => {
              const isCompleted = q.isCompleted;
              const isInProgress = q.isInProgress;

              return (
                <div
                  key={q.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '18px',
                    border: isCompleted
                      ? '1.5px solid #BBF7D0'
                      : isInProgress
                      ? '1.5px solid #FDE68A'
                      : '1px solid #ECE7DF',
                    padding: '22px 24px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '16px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div>
                    {/* Header tags */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: '6px',
                          backgroundColor: '#FAF8F5',
                          border: '1px solid #ECE7DF',
                          color: '#78716C',
                          textTransform: 'uppercase'
                        }}>
                          {q.category}
                        </span>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#FEF3C7',
                          border: '1px solid #FDE68A',
                          color: '#92400E',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <Clock size={11} /> {q.configuredTime} Mins • 10 Items
                        </span>
                      </div>

                      {/* Status Badge */}
                      {q.pastAttempt ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          backgroundColor: q.pastAttempt.isCertified ? '#DCFCE7' : '#FEF3C7',
                          color: q.pastAttempt.isCertified ? '#16A34A' : '#B45309',
                          padding: '3px 10px', borderRadius: '9999px',
                          fontSize: '0.72rem', fontWeight: 700
                        }}>
                          <CheckCircle2 size={12} /> {q.pastAttempt.overallScore}% ({q.pastAttempt.level || 'L' + (getCompetencyLevel(q.pastAttempt.overallScore).marks + 1)})
                        </span>
                      ) : isCompleted ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          backgroundColor: '#DCFCE7', color: '#16A34A',
                          padding: '3px 9px', borderRadius: '9999px',
                          fontSize: '0.72rem', fontWeight: 700
                        }}>
                          <CheckCircle2 size={12} /> 10/10 Answered
                        </span>
                      ) : isInProgress ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          backgroundColor: '#FEF3C7', color: '#B45309',
                          padding: '3px 9px', borderRadius: '9999px',
                          fontSize: '0.72rem', fontWeight: 700
                        }}>
                          <Clock size={12} /> In Progress
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          backgroundColor: '#F1F5F9', color: '#64748B',
                          padding: '3px 9px', borderRadius: '9999px',
                          fontSize: '0.72rem', fontWeight: 700
                        }}>
                          Ready
                        </span>
                      )}
                    </div>

                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1C1917', margin: '0 0 6px 0' }}>
                      {q.id}. {q.name} Questionnaire
                    </h3>

                    <p style={{ fontSize: '0.84rem', color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                      {q.description}
                    </p>
                  </div>

                  {/* Progress & Action Bottom Bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '0.76rem', color: '#78716C', fontWeight: 600 }}>
                      <span>Progress</span>
                      <strong style={{ color: isCompleted ? '#16A34A' : '#1C1917' }}>
                        {q.answeredCount} / {q.questionCount} Answered
                      </strong>
                    </div>

                    <div style={{ height: '6px', backgroundColor: '#F1F5F9', borderRadius: '9999px', overflow: 'hidden', marginBottom: '14px' }}>
                      <div style={{
                        width: `${q.progressPercent}%`,
                        height: '100%',
                        backgroundColor: isCompleted ? '#16A34A' : '#8B1528',
                        borderRadius: '9999px',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>

                    {q.pastAttempt ? (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {q.pastAttempt.isCertified && (
                          <button
                            type="button"
                            onClick={() => {
                              if (onCompleteAttempt) onCompleteAttempt(q.pastAttempt, 'certificate');
                              else setView('certificate');
                            }}
                            className="btn-primary"
                            style={{ flex: '1 1 auto', padding: '9px 12px', fontSize: '0.8rem', gap: '5px', backgroundColor: '#8B1528' }}
                          >
                            <Award size={13} />
                            <span>Certificate</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (onCompleteAttempt) onCompleteAttempt(q.pastAttempt, 'results');
                            else setView('results');
                          }}
                          className="btn-secondary"
                          style={{ flex: '1 1 auto', padding: '9px 12px', fontSize: '0.8rem', gap: '5px' }}
                        >
                          <FileText size={13} />
                          <span>Scorecard</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRequestStartQuestionnaire(q.id)}
                          className="btn-secondary"
                          style={{ padding: '9px 12px', fontSize: '0.8rem', color: '#B45309' }}
                          title="Re-attempt this questionnaire"
                        >
                          <RotateCcw size={13} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => handleRequestStartQuestionnaire(q.id)}
                          className="btn-primary"
                          style={{
                            flex: 1,
                            padding: '9px 16px',
                            fontSize: '0.84rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                        >
                          <Play size={14} />
                          <span>{isInProgress ? `Resume (${q.answeredCount}/10)` : 'Start Questionnaire'}</span>
                        </button>
                        {q.answeredCount > 0 && (
                          <button
                            type="button"
                            onClick={() => handleSingleSkillSubmit(q.id)}
                            className="btn-secondary"
                            style={{ padding: '9px 12px', fontSize: '0.82rem', color: '#15803D', borderColor: '#86EFAC' }}
                            title={`Submit ${q.name} Questionnaire with current answers`}
                          >
                            <Award size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* ── Final Submission Confirmation Modal ── */}
        {showFinalSubmitModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px' }}>
            <div className="animate-pop" style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', maxWidth: '480px', width: '100%', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
              <div style={{ width: 56, height: 56, borderRadius: '16px', backgroundColor: '#FDF2F4', color: '#8B1528', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                <Award size={30} />
              </div>

              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1C1917', textAlign: 'center', marginBottom: '8px' }}>
                Finalize &amp; Submit Assessment
              </h3>

              <p style={{ color: '#64748B', fontSize: '0.88rem', textAlign: 'center', lineHeight: 1.5, marginBottom: '20px' }}>
                You have answered <strong>{answeredCount} of {totalQuestions} questions</strong> across all 15 competency questionnaires. Once submitted, your scores will be graded against the official institutional standard.
              </p>

              {unansweredCount > 0 && (
                <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <AlertCircle size={20} color="#D97706" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '0.82rem', color: '#92400E', fontWeight: 600 }}>
                    Notice: {unansweredCount} questions are currently unanswered.
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowFinalSubmitModal(false)}
                  className="btn-secondary"
                  style={{ padding: '10px 18px', fontSize: '0.88rem' }}
                >
                  Return to Review
                </button>
                <button
                  type="button"
                  onClick={handleFinalAssessmentSubmit}
                  disabled={isSubmitting}
                  className="btn-primary"
                  style={{ padding: '10px 24px', backgroundColor: '#059669', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  {isSubmitting && <RefreshCw size={14} className="animate-spin" />}
                  <span>{isSubmitting ? 'Grading 15 Dimensions...' : 'Confirm & View Results'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════════════════
     VIEW MODE 2: ACTIVE QUESTIONNAIRE PLAYER (when activeQuestionnaireId !== null)
     Clean individual questionnaire player with direct question switching and smooth rollover.
  ══════════════════════════════════════════════════════════════════════════ */
  const activeQDef = INDIVIDUAL_QUESTIONNAIRES.find(q => q.id === activeQuestionnaireId) || INDIVIDUAL_QUESTIONNAIRES[0];
  const currentQ = questionsList[currentIndex] || questionsList[activeQDef.startIndex];

  const currentQNumberInModule = (currentIndex - activeQDef.startIndex) + 1;
  const answeredInActiveQ = questionsList
    .slice(activeQDef.startIndex, activeQDef.endIndex)
    .filter(q => answers[q.id] !== undefined).length;
  const qProgressPct = Math.round((answeredInActiveQ / activeQDef.questionCount) * 100);

  const timeUrgent = sessionTimeLeft < 300;
  const timeWarning = sessionTimeLeft < 600 && !timeUrgent;

  return (
    <div style={{ padding: '20px 0 80px 0', minHeight: 'calc(100vh - 72px)' }} className="animate-fade-in">
      <div className="container" style={{ maxWidth: '1180px', margin: '0 auto', padding: '0 20px' }}>

        {/* ── Offline Banner ── */}
        {!isOnline && (
          <div style={{
            backgroundColor: '#FFFBEB', border: '1px solid #FDE68A',
            borderRadius: '14px', padding: '12px 20px', marginBottom: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <WifiOff size={18} color="#D97706" />
              <span style={{ fontSize: '0.86rem', fontWeight: 600, color: '#92400E' }}>
                Offline Mode: Answers safely stored in local memory. Will auto-sync to server on reconnection.
              </span>
            </div>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', backgroundColor: '#FEF3C7', color: '#B45309' }}>
              Draft Saved Locally
            </span>
          </div>
        )}

        {/* ── Integrity Notice Toast ── */}
        {integrityWarning && (
          <div style={{
            backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE',
            borderRadius: '14px', padding: '12px 20px', marginBottom: '16px',
            display: 'flex', alignItems: 'center', gap: '12px'
          }}>
            <ShieldAlert size={18} color="#2563EB" />
            <span style={{ fontSize: '0.86rem', fontWeight: 600, color: '#1E40AF' }}>
              {integrityWarning.message}
            </span>
          </div>
        )}

        {/* ── Active Questionnaire Header Bar ── */}
        <div style={{
          backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '16px 24px',
          border: '1px solid #ECE7DF', boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '16px', marginBottom: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
              {/* Strict Exam Mode Locked Notice */}
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5',
                color: '#DC2626', fontSize: '0.74rem', fontWeight: 800,
                padding: '3px 9px', borderRadius: '6px'
              }}>
                <Lock size={12} /> Strict Exam Mode Locked
              </span>
              <span style={{ color: '#D1D5DB' }}>&gt;</span>
              <span style={{
                backgroundColor: '#FDF2F4', color: '#8B1528',
                padding: '2px 8px', borderRadius: '6px',
                fontSize: '0.74rem', fontWeight: 700
              }}>
                {activeQDef.category}
              </span>
              <span style={{ color: '#D1D5DB' }}>&gt;</span>
              <span style={{ color: '#6B7280', fontSize: '0.82rem', fontWeight: 600 }}>
                Item {currentQNumberInModule} of {activeQDef.questionCount} (Overall #{currentIndex + 1} of {totalQuestions})
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1C1917', margin: 0 }}>
                {activeQDef.id}. {activeQDef.name} Questionnaire
              </h2>

              {/* Quick Questionnaire Switcher Dropdown */}
              <select
                value={activeQuestionnaireId}
                onChange={(e) => handleOpenQuestionnaire(Number(e.target.value))}
                style={{
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#8B1528',
                  backgroundColor: '#FAF8F5',
                  border: '1px solid #ECE7DF',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {INDIVIDUAL_QUESTIONNAIRES.map(q => (
                  <option key={q.id} value={q.id}>
                    Jump to: {q.id}. {q.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Autosave Status Pill */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', borderRadius: '9999px',
              backgroundColor: saveStatus === 'saved' ? '#F0FDF4' : saveStatus === 'saving' ? '#FFFBEB' : '#FEF2F2',
              border: `1px solid ${saveStatus === 'saved' ? '#BBF7D0' : saveStatus === 'saving' ? '#FDE68A' : '#FECACA'}`,
              fontSize: '0.74rem', fontWeight: 600,
              color: saveStatus === 'saved' ? '#15803D' : saveStatus === 'saving' ? '#B45309' : '#DC2626'
            }}>
              {saveStatus === 'saved' && <Check size={12} color="#16A34A" />}
              {saveStatus === 'saving' && <RefreshCw size={12} color="#D97706" className="animate-spin" />}
              {saveStatus === 'offline' && <WifiOff size={12} color="#DC2626" />}
              <span>
                {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving...' : 'Saved Locally'}
              </span>
            </div>

            {/* Quick Test Fill (High Score) */}
            <button
              type="button"
              onClick={() => autoFillAll('high')}
              className="btn-secondary"
              style={{ padding: '6px 10px', fontSize: '0.73rem', gap: '4px' }}
              title="Quick test fill all questions"
            >
              <Zap size={12} color="#16A34A" /> Pass All
            </button>

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.73rem', gap: '5px' }}
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              <span>{isFullscreen ? 'Exit Focus' : 'Focus'}</span>
            </button>

            {/* Keyboard Shortcuts */}
            <button
              type="button"
              onClick={() => setShowKeyboardHelp(true)}
              className="btn-secondary"
              style={{ padding: '6px 10px', fontSize: '0.73rem', gap: '4px' }}
            >
              <Keyboard size={13} /> Keys
            </button>

            {/* Assessment Countdown Timer */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              backgroundColor: timeUrgent ? '#FEE2E2' : timeWarning ? '#FEF3C7' : '#FAF8F5',
              border: `1px solid ${timeUrgent ? '#FCA5A5' : timeWarning ? '#FDE68A' : '#ECE7DF'}`,
              borderRadius: '9999px', padding: '8px 16px',
              color: timeUrgent ? '#DC2626' : timeWarning ? '#B45309' : '#8B1528',
              fontWeight: 700, fontSize: '0.95rem'
            }}>
              <Clock size={16} />
              <span>{formatTimer(sessionTimeLeft)}</span>
            </div>

            {/* Academic Integrity Strike Tracker */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '9999px',
                backgroundColor: focusLostCount === 0 ? '#F0FDF4' : focusLostCount === 1 ? '#FEF3C7' : '#FEE2E2',
                border: `1px solid ${focusLostCount === 0 ? '#BBF7D0' : focusLostCount === 1 ? '#FDE68A' : '#FCA5A5'}`,
                color: focusLostCount === 0 ? '#15803D' : focusLostCount === 1 ? '#B45309' : '#DC2626',
                fontWeight: 800,
                fontSize: '0.82rem'
              }}
              title="Academic Integrity: 3 tab switches or focus drops triggers immediate auto-submission."
            >
              <ShieldAlert size={14} />
              <span>Integrity: {focusLostCount}/3 Strikes</span>
            </div>
          </div>
        </div>

        {/* ── Active Questionnaire Progress Bar ── */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px', fontSize: '0.82rem', color: '#6B7280', fontWeight: 600 }}>
            <span>{activeQDef.name} Questionnaire Progress</span>
            <span style={{ color: '#8B1528', fontWeight: 700 }}>
              {answeredInActiveQ} / {activeQDef.questionCount} answered ({qProgressPct}%)
            </span>
          </div>
          <div style={{ height: '8px', backgroundColor: '#E5E7EB', borderRadius: '9999px', overflow: 'hidden' }}>
            <div style={{ width: `${qProgressPct}%`, height: '100%', backgroundColor: '#8B1528', borderRadius: '9999px', transition: 'width 0.35s ease' }} />
          </div>
        </div>

        {/* ── Examination Layout ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', alignItems: 'start' }} className="assessment-layout">
          
          {/* ── Left Column: Active Question & Likert Scale ── */}
          <div>
            <div className="mr-card" style={{ padding: '36px 32px', marginBottom: '20px', backgroundColor: '#FFFFFF' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <span style={{
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  color: '#8B1528',
                  backgroundColor: '#FDF2F4',
                  padding: '4px 12px',
                  borderRadius: '9999px'
                }}>
                  {activeQDef.name} • Item #{currentQNumberInModule} of 10
                </span>

                <button
                  type="button"
                  onClick={() => handleToggleFlag(currentQ?.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: '9999px',
                    border: flagged.has(currentQ?.id) ? '1.5px solid #DC2626' : '1px solid #D1D5DB',
                    backgroundColor: flagged.has(currentQ?.id) ? '#FEF2F2' : 'transparent',
                    color: flagged.has(currentQ?.id) ? '#DC2626' : '#6B7280',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Flag size={14} fill={flagged.has(currentQ?.id) ? '#DC2626' : 'none'} />
                  <span>{flagged.has(currentQ?.id) ? 'Flagged for Review' : 'Flag Question'}</span>
                </button>
              </div>

              {/* Diagnostic Question Statement */}
              <div style={{ fontSize: '1.28rem', fontWeight: 700, color: '#1C1917', lineHeight: 1.5, marginBottom: '28px', minHeight: '64px' }}>
                "{currentQ?.text}"
              </div>

              {/* Likert Scale (5 options) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {LIKERT.map(option => {
                  const isSelected = answers[currentQ?.id] === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelectAnswer(currentQ?.id, option.value)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 20px',
                        borderRadius: '14px',
                        border: isSelected ? `2px solid ${option.color}` : '1.5px solid #E5E7EB',
                        backgroundColor: isSelected ? option.bg : '#FAF8F5',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          border: isSelected ? `7px solid ${option.color}` : '2px solid #9CA3AF',
                          backgroundColor: '#FFFFFF',
                          flexShrink: 0
                        }} />
                        <span style={{ fontSize: '0.96rem', fontWeight: isSelected ? 800 : 600, color: isSelected ? '#1C1917' : '#4B5563' }}>
                          {option.label}
                        </span>
                      </div>

                      <span style={{ fontSize: '0.74rem', fontWeight: 700, color: option.color, textTransform: 'uppercase' }}>
                        [{option.value}] {option.short}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Navigation Buttons ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => handleNavigate(currentIndex - 1)}
                disabled={currentIndex === activeQDef.startIndex}
                className="btn-secondary"
                style={{ padding: '11px 22px', fontSize: '0.9rem', gap: '8px', opacity: currentIndex === activeQDef.startIndex ? 0.4 : 1 }}
              >
                <ChevronLeft size={16} />
                <span>Previous Question</span>
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                {/* Submit Individual Skill Questionnaire Button */}
                <button
                  type="button"
                  onClick={() => handleSingleSkillSubmit(activeQuestionnaireId)}
                  className="btn-secondary"
                  style={{
                    padding: '11px 20px',
                    fontSize: '0.9rem',
                    color: answeredInActiveQ === activeQDef.questionCount ? '#15803D' : '#8B1528',
                    borderColor: answeredInActiveQ === activeQDef.questionCount ? '#86EFAC' : '#8B1528',
                    backgroundColor: answeredInActiveQ === activeQDef.questionCount ? '#F0FDF4' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Award size={16} />
                  <span>Submit {activeQDef.name} Questionnaire ({answeredInActiveQ}/{activeQDef.questionCount})</span>
                </button>

                {/* Next Question / Finalize Skill Assessment Button */}
                {currentIndex < activeQDef.endIndex - 1 ? (
                  <button
                    type="button"
                    onClick={() => handleNavigate(currentIndex + 1)}
                    className="btn-primary"
                    style={{ padding: '11px 24px', fontSize: '0.9rem', gap: '8px' }}
                  >
                    <span>Next Question</span>
                    <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSingleSkillSubmit(activeQuestionnaireId)}
                    className="btn-primary"
                    style={{ padding: '11px 26px', fontSize: '0.9rem', backgroundColor: '#059669', gap: '8px' }}
                  >
                    <span>Submit {activeQDef.name} Assessment</span>
                    <CheckCircle2 size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Right Column: Question Navigator Palette ── */}
          <div className="mr-card" style={{ padding: '22px', position: 'sticky', top: '88px', backgroundColor: '#FFFFFF' }}>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#1C1917', marginBottom: '12px' }}>
              Questionnaire Navigator
            </h3>

            {/* Active Questionnaire Selection Tabs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', maxHeight: '220px', overflowY: 'auto' }}>
              {INDIVIDUAL_QUESTIONNAIRES.map(q => {
                const qItems = questionsList.slice(q.startIndex, q.endIndex);
                const answeredCountInThisQ = qItems.filter(item => answers[item.id] !== undefined).length;
                const isSelectedQ = q.id === activeQuestionnaireId;

                return (
                  <div
                    key={q.id}
                    onClick={() => handleOpenQuestionnaire(q.id)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '10px',
                      fontSize: '0.8rem',
                      fontWeight: isSelectedQ ? 800 : 600,
                      cursor: 'pointer',
                      border: isSelectedQ ? '1.5px solid #8B1528' : '1px solid #ECE7DF',
                      backgroundColor: isSelectedQ ? '#FDF2F4' : '#FAF8F5',
                      color: isSelectedQ ? '#8B1528' : '#44403C',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>{q.id}. {q.name}</span>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: answeredCountInThisQ === 10 ? '#DCFCE7' : '#FFFFFF',
                      color: answeredCountInThisQ === 10 ? '#15803D' : '#78716C'
                    }}>
                      {answeredCountInThisQ}/10
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Question Bubbles for Active Questionnaire */}
            <div style={{ borderTop: '1px solid #F1EFEA', paddingTop: '14px', marginBottom: '16px' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#78716C', marginBottom: '10px', textTransform: 'uppercase' }}>
                {activeQDef.name} Questions (1–10)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                {questionsList.slice(activeQDef.startIndex, activeQDef.endIndex).map((q, idx) => {
                  const globalIdx = activeQDef.startIndex + idx;
                  const isCurrent = globalIdx === currentIndex;
                  const isAnswered = answers[q.id] !== undefined;
                  const isFlagged = flagged.has(q.id);

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => handleNavigate(globalIdx)}
                      style={{
                        height: '38px',
                        borderRadius: '8px',
                        border: isCurrent
                          ? '2px solid #8B1528'
                          : isFlagged
                          ? '2px solid #DC2626'
                          : '1px solid #D1D5DB',
                        backgroundColor: isCurrent
                          ? '#FDF2F4'
                          : isAnswered
                          ? '#DCFCE7'
                          : '#FFFFFF',
                        color: isCurrent
                          ? '#8B1528'
                          : isAnswered
                          ? '#15803D'
                          : '#4B5563',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative'
                      }}
                    >
                      <span>{idx + 1}</span>
                      {isFlagged && (
                        <div style={{
                          position: 'absolute', top: 2, right: 2,
                          width: 6, height: 6, borderRadius: '50%',
                          backgroundColor: '#DC2626'
                        }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Palette Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.74rem', color: '#6B7280', borderTop: '1px solid #F1EFEA', paddingTop: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: 12, height: 12, borderRadius: '3px', backgroundColor: '#DCFCE7', border: '1px solid #86EFAC' }} />
                <span>Answered ({answeredCount})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: 12, height: 12, borderRadius: '3px', backgroundColor: '#FFFFFF', border: '1px solid #D1D5DB' }} />
                <span>Unanswered ({unansweredCount})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: 12, height: 12, borderRadius: '3px', backgroundColor: '#FEF2F2', border: '1.5px solid #DC2626' }} />
                <span>Flagged for Review ({flagged.size})</span>
              </div>
            </div>

            {flagged.size > 0 && (
              <button
                type="button"
                onClick={() => setShowFlaggedReview(true)}
                className="btn-secondary"
                style={{ width: '100%', marginTop: '14px', padding: '8px', fontSize: '0.8rem', color: '#DC2626' }}
              >
                Review Flagged ({flagged.size})
              </button>
            )}
          </div>
        </div>

      </div>

      {/* ── Flagged Questions Review Modal ── */}
      {showFlaggedReview && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px' }}>
          <div className="animate-pop" style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', maxWidth: '580px', width: '100%', padding: '28px', maxHeight: '80vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1C1917', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Flag size={20} color="#DC2626" fill="#DC2626" />
              <span>Flagged Questions ({flagged.size})</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {Array.from(flagged).map(qId => {
                const idx = questionsList.findIndex(item => item.id === qId);
                const q = questionsList[idx];
                const ans = answers[qId];
                const ansLabel = ans ? LIKERT.find(l => l.value === ans)?.label : 'Not answered yet';
                return (
                  <div
                    key={qId}
                    style={{ padding: '12px 16px', borderRadius: '12px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', cursor: 'pointer' }}
                    onClick={() => { setShowFlaggedReview(false); handleNavigate(idx); }}
                  >
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#DC2626', marginBottom: '4px' }}>
                      Question #{idx + 1} • {q?.skillName}
                    </div>
                    <div style={{ fontSize: '0.88rem', color: '#1C1917', fontWeight: 600, marginBottom: '4px', lineHeight: 1.4 }}>
                      "{q?.text}"
                    </div>
                    <div style={{ fontSize: '0.76rem', color: ans ? '#2563EB' : '#9CA3AF' }}>
                      Current selection: {ansLabel}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowFlaggedReview(false)}
                className="btn-secondary"
                style={{ padding: '8px 18px', fontSize: '0.85rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Accessible Keyboard Help Modal ── */}
      {showKeyboardHelp && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px' }}>
          <div className="animate-pop" style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', maxWidth: '420px', width: '100%', padding: '32px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1C1917', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Keyboard size={20} color="#8B1528" /> Accessible Keyboard Controls
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {[
                { key: '1 – 5', desc: 'Select Likert response (SD to SA)' },
                { key: '→ / N', desc: 'Navigate to next question' },
                { key: '← / P', desc: 'Navigate to previous question' },
                { key: 'F', desc: 'Toggle flag for review on active item' },
              ].map(({ key, desc }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', backgroundColor: '#FAF8F5', border: '1px solid #ECE7DF' }}>
                  <span style={{ fontSize: '0.88rem', color: '#1C1917', fontWeight: 600 }}>{desc}</span>
                  <kbd style={{ backgroundColor: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: '6px', padding: '3px 8px', fontSize: '0.78rem', fontWeight: 700, color: '#8B1528', fontFamily: 'monospace' }}>
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowKeyboardHelp(false)}
              className="btn-primary"
              style={{ width: '100%', padding: '10px' }}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* ── Strict Exam Mode Pre-Exam Instructions & Lockdown Briefing Modal ── */}
      {showExamBriefingModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.82)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px'
        }}>
          <div className="animate-pop" style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            maxWidth: '560px',
            width: '100%',
            padding: '36px 32px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            border: '2px solid #8B1528'
          }}>
            <div style={{
              width: 60,
              height: 60,
              borderRadius: '20px',
              backgroundColor: '#FDF2F4',
              color: '#8B1528',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              border: '2px solid #FCA5A5'
            }}>
              <ShieldCheck size={32} />
            </div>

            <h3 style={{
              fontSize: '1.4rem',
              fontWeight: 800,
              color: '#1C1917',
              textAlign: 'center',
              marginBottom: '6px'
            }}>
              Strict Examination Mode Instructions
            </h3>

            <p style={{
              fontSize: '0.88rem',
              color: '#64748B',
              textAlign: 'center',
              marginBottom: '22px',
              lineHeight: 1.5
            }}>
              Please read the mandatory institutional integrity protocol before starting. Complete examination lockdown will be activated upon entering.
            </p>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              backgroundColor: '#FAF8F5',
              padding: '18px 20px',
              borderRadius: '16px',
              border: '1px solid #ECE7DF',
              marginBottom: '24px',
              fontSize: '0.86rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  backgroundColor: '#DC2626', color: '#FFF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '0.76rem', flexShrink: 0, marginTop: '2px'
                }}>!</div>
                <div>
                  <strong style={{ color: '#1C1917' }}>Strict 3-Strike Violation Rule:</strong>
                  <div style={{ color: '#4B5563', marginTop: '2px' }}>
                    Tab switching, minimizing the browser, or losing window focus is strictly tracked. If <strong>3 warnings</strong> are registered, your examination will be <strong>automatically terminated and submitted immediately</strong>.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  backgroundColor: '#8B1528', color: '#FFF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '0.76rem', flexShrink: 0, marginTop: '2px'
                }}>2</div>
                <div>
                  <strong style={{ color: '#1C1917' }}>Continuous Fullscreen Enforcement:</strong>
                  <div style={{ color: '#4B5563', marginTop: '2px' }}>
                    The exam runs in Fullscreen Focus Mode. Exiting fullscreen counts towards the 3-strike integrity warning limit.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  backgroundColor: '#8B1528', color: '#FFF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '0.76rem', flexShrink: 0, marginTop: '2px'
                }}>3</div>
                <div>
                  <strong style={{ color: '#1C1917' }}>Server-Controlled Immutable Timer:</strong>
                  <div style={{ color: '#4B5563', marginTop: '2px' }}>
                    The timer cannot be paused, stopped, or extended. Refreshing the browser or reconnecting will restore your active session with the exact same server deadline.
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setShowExamBriefingModal(false);
                  setPendingStartQId(null);
                }}
                className="btn-secondary"
                style={{ padding: '11px 20px', fontSize: '0.88rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmStartExam}
                className="btn-primary"
                style={{
                  padding: '11px 24px',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  backgroundColor: '#8B1528',
                  borderColor: '#8B1528',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>I Understand &amp; Enter Exam</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Final Submission Confirmation Modal ── */}
      {showFinalSubmitModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px' }}>
          <div className="animate-pop" style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', maxWidth: '480px', width: '100%', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ width: 56, height: 56, borderRadius: '16px', backgroundColor: '#FDF2F4', color: '#8B1528', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <Award size={30} />
            </div>

            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1C1917', textAlign: 'center', marginBottom: '8px' }}>
              Finalize Assessment
            </h3>

            <p style={{ color: '#64748B', fontSize: '0.88rem', textAlign: 'center', lineHeight: 1.5, marginBottom: '20px' }}>
              You have completed <strong>{answeredCount} of {totalQuestions} questions</strong>. Would you like to submit your answers for official scoring and certificate generation?
            </p>

            {unansweredCount > 0 && (
              <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertCircle size={20} color="#D97706" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.82rem', color: '#92400E', fontWeight: 600 }}>
                  Notice: {unansweredCount} questions remain unanswered.
                </span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowFinalSubmitModal(false)}
                className="btn-secondary"
                style={{ padding: '10px 18px', fontSize: '0.88rem' }}
              >
                Keep Reviewing
              </button>
              <button
                type="button"
                onClick={handleFinalAssessmentSubmit}
                disabled={isSubmitting}
                className="btn-primary"
                style={{ padding: '10px 24px', backgroundColor: '#059669', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {isSubmitting && <RefreshCw size={14} className="animate-spin" />}
                <span>{isSubmitting ? 'Grading 15 Dimensions...' : 'Confirm & View Results'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Single Skill Submission Warning Modal (Unanswered Questions) ── */}
      {showSkillSubmitWarningModal && skillSubmitTarget && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px' }}>
          <div className="animate-pop" style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', maxWidth: '480px', width: '100%', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ width: 56, height: 56, borderRadius: '16px', backgroundColor: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <AlertCircle size={30} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1C1917', textAlign: 'center', marginBottom: '8px' }}>
              Submit {skillSubmitTarget.name} Questionnaire?
            </h3>

            {(() => {
              const skillQs = questionsList.slice(skillSubmitTarget.startIndex, skillSubmitTarget.endIndex);
              const answered = skillQs.filter(q => answers[q.id] !== undefined).length;
              const unans = skillSubmitTarget.questionCount - answered;
              return (
                <div>
                  <p style={{ color: '#64748B', fontSize: '0.88rem', textAlign: 'center', lineHeight: 1.5, marginBottom: '16px' }}>
                    You have answered <strong>{answered} of {skillSubmitTarget.questionCount} questions</strong> for {skillSubmitTarget.name}.
                  </p>
                  <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <AlertCircle size={20} color="#DC2626" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '0.82rem', color: '#991B1B', fontWeight: 600 }}>
                      Warning: The {unans} unanswered question{unans > 1 ? 's' : ''} will receive <strong>0 marks (0%)</strong>, which will lower your proficiency score.
                    </span>
                  </div>
                </div>
              );
            })()}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowSkillSubmitWarningModal(false)}
                className="btn-secondary"
                style={{ padding: '10px 18px', fontSize: '0.88rem' }}
              >
                Keep Answering
              </button>
              <button
                type="button"
                onClick={() => handleSingleSkillSubmit(skillSubmitTarget.id, true)}
                className="btn-primary"
                style={{ padding: '10px 22px', backgroundColor: '#DC2626', borderColor: '#B91C1C', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <span>Submit with Current Answers</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Single Skill Completion & Celebratory Modal ── */}
      {completedSkillModalData && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px' }}>
          <div className="animate-pop" style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', maxWidth: '540px', width: '100%', padding: '36px', boxShadow: '0 25px 60px -15px rgba(0,0,0,0.3)', textAlign: 'center' }}>
            <div style={{
              width: 68,
              height: 68,
              borderRadius: '20px',
              backgroundColor: completedSkillModalData.isCertified ? '#DCFCE7' : '#FEF3C7',
              color: completedSkillModalData.isCertified ? '#16A34A' : '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              {completedSkillModalData.isCertified ? <Award size={36} /> : <AlertCircle size={36} />}
            </div>

            <div style={{
              display: 'inline-block',
              padding: '3px 12px',
              borderRadius: '9999px',
              fontSize: '0.74rem',
              fontWeight: 700,
              backgroundColor: completedSkillModalData.isCertified ? '#DCFCE7' : '#FEF3C7',
              color: completedSkillModalData.isCertified ? '#15803D' : '#B45309',
              marginBottom: '10px'
            }}>
              {completedSkillModalData.isCertified ? '✓ Passed & Certified' : '⚠ Threshold Not Met (<65%)'}
            </div>

            <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1C1917', marginBottom: '6px' }}>
              {completedSkillModalData.skillName} Assessment Completed!
            </h3>

            <p style={{ color: '#64748B', fontSize: '0.88rem', margin: '0 auto 20px auto', maxWidth: '440px' }}>
              Your answers have been evaluated under the Human-Centric Competency Framework (ICCF).
            </p>

            {/* Score & Distinction Display Box */}
            <div style={{
              backgroundColor: '#FAF8F5',
              border: '1.5px solid #ECE7DF',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '24px'
            }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: completedSkillModalData.isCertified ? '#16A34A' : '#D97706', lineHeight: 1 }}>
                {completedSkillModalData.overallScore}%
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1C1917', marginTop: '6px' }}>
                {completedSkillModalData.levelLabel || completedSkillModalData.levelName}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#78716C', marginTop: '4px' }}>
                Performance Marks: {completedSkillModalData.marks !== undefined ? completedSkillModalData.marks : getCompetencyLevel(completedSkillModalData.overallScore).marks} / 4 • Time Taken: {completedSkillModalData.timeTakenFormatted}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {completedSkillModalData.isCertified ? (
                <button
                  type="button"
                  onClick={() => {
                    const att = completedSkillModalData;
                    setCompletedSkillModalData(null);
                    if (onCompleteAttempt) onCompleteAttempt(att, 'certificate');
                    else setView('certificate');
                  }}
                  className="btn-primary"
                  style={{ width: '100%', padding: '12px', fontSize: '0.92rem', gap: '8px', backgroundColor: '#8B1528' }}
                >
                  <Award size={18} />
                  <span>View &amp; Download {completedSkillModalData.skillName} Certificate</span>
                  <ArrowRight size={16} />
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  const att = completedSkillModalData;
                  setCompletedSkillModalData(null);
                  if (onCompleteAttempt) onCompleteAttempt(att, 'results');
                  else setView('results');
                }}
                className={completedSkillModalData.isCertified ? 'btn-secondary' : 'btn-primary'}
                style={{ width: '100%', padding: '12px', fontSize: '0.92rem', gap: '8px' }}
              >
                <FileText size={18} />
                <span>View Detailed Scorecard &amp; Analytics</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCompletedSkillModalData(null);
                  setActiveQuestionnaireId(null);
                }}
                className="btn-secondary"
                style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }}
              >
                Return to Questionnaires Hub
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
