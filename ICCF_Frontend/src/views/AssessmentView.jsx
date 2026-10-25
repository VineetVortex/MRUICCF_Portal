import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Clock, Flag, AlertCircle, ChevronLeft, ChevronRight, Check,
  Sparkles, Send, HelpCircle, CheckCircle2, Zap, Info, Keyboard,
  RotateCcw, BookOpen
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { COMPETENCIES_DATA } from '../data/assessmentData';
import { getStoredQuestions, saveAttempt } from '../lib/storage';
import { calculateAttemptResults, CERTIFICATION_THRESHOLD } from '../lib/scoring';

const AUTOSAVE_KEY = 'mr_iccf_autosave_v1';

/* ── Likert definitions ─────────────────────────────────────────────────── */
const LIKERT = [
  { value: 1, label: 'Strongly Disagree', short: 'SD', color: '#DC2626', bg: '#FEE2E2' },
  { value: 2, label: 'Disagree',          short: 'D',  color: '#EA580C', bg: '#FFEDD5' },
  { value: 3, label: 'Neutral',           short: 'N',  color: '#D97706', bg: '#FEF3C7' },
  { value: 4, label: 'Agree',             short: 'A',  color: '#2563EB', bg: '#DBEAFE' },
  { value: 5, label: 'Strongly Agree',    short: 'SA', color: '#16A34A', bg: '#DCFCE7' },
];

export default function AssessmentView({ setView, currentUser, activeAssessment, onCompleteAttempt }) {
  const allStored = getStoredQuestions();
  const approvedQuestions = allStored.filter(q => q.approvalStatus === 'approved');
  const questionsList = approvedQuestions.length > 0 ? approvedQuestions : allStored;
  const totalQuestions = questionsList.length;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState(() => {
    // Restore autosave first
    try {
      const saved = JSON.parse(localStorage.getItem(AUTOSAVE_KEY) || '{}');
      if (saved.assessmentId === (activeAssessment?.id || 'asmt-2026-core') && saved.answers) {
        return saved.answers;
      }
    } catch {}
    // Seed first 15 with realistic defaults
    const initial = {};
    for (let i = 0; i < Math.min(15, totalQuestions); i++) {
      const q = questionsList[i];
      if (q) initial[q.id] = q.isReverse ? 2 : 4;
    }
    return initial;
  });

  const [flagged, setFlagged] = useState(new Set());
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showFlaggedReview, setShowFlaggedReview] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [autosaveFlash, setAutosaveFlash] = useState(false);

  const timeLimitMinutes = activeAssessment?.timeLimit || 45;
  const initialSeconds = timeLimitMinutes * 60;
  const [timeLeft, setTimeLeft] = useState(initialSeconds);

  /* Countdown */
  useEffect(() => {
    const t = setInterval(() => setTimeLeft(p => (p > 0 ? p - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  /* Auto-submit when time runs out */
  useEffect(() => {
    if (timeLeft === 0) {
      handleSubmitAssessment();
    }
  }, [timeLeft]); // eslint-disable-line

  /* Autosave every 15 s */
  useEffect(() => {
    const t = setInterval(() => {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({
        assessmentId: activeAssessment?.id || 'asmt-2026-core',
        answers,
        savedAt: new Date().toISOString()
      }));
      setAutosaveFlash(true);
      setTimeout(() => setAutosaveFlash(false), 1200);
    }, 15000);
    return () => clearInterval(t);
  }, [answers, activeAssessment]);

  /* Keyboard shortcuts */
  const handleKeyDown = useCallback((e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const key = e.key;
    if (['1','2','3','4','5'].includes(key)) {
      const val = Number(key);
      const q = questionsList[currentIndex];
      if (q) setAnswers(p => ({ ...p, [q.id]: val }));
    }
    if (key === 'ArrowRight' || key === 'n') { if (currentIndex < totalQuestions - 1) setCurrentIndex(i => i + 1); }
    if (key === 'ArrowLeft' || key === 'p') { if (currentIndex > 0) setCurrentIndex(i => i - 1); }
    if (key === 'f') {
      const q = questionsList[currentIndex];
      if (q) setFlagged(prev => {
        const s = new Set(prev);
        s.has(q.id) ? s.delete(q.id) : s.add(q.id);
        return s;
      });
    }
  }, [currentIndex, questionsList, totalQuestions]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const currentQ = questionsList[currentIndex] || questionsList[0];
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = totalQuestions - answeredCount;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  const autoFillAll = (type = 'high') => {
    const filled = {};
    questionsList.forEach(q => {
      filled[q.id] = type === 'high' ? (q.isReverse ? 1 : 5)
                   : type === 'moderate' ? (q.isReverse ? 2 : 4)
                   : (q.isReverse ? 5 : 1);
    });
    setAnswers(filled);
  };

  const handleSubmitAssessment = () => {
    setShowSubmitModal(false);
    localStorage.removeItem(AUTOSAVE_KEY);

    const scoringResult = calculateAttemptResults(questionsList, answers, COMPETENCIES_DATA);
    const timeSpent = initialSeconds - timeLeft;

    const newAttempt = {
      id: `att_${Date.now()}`,
      userId: currentUser?.uid || currentUser?.id || `usr_guest_${Date.now()}`,
      studentName: currentUser?.name || 'Student',
      rollNo: currentUser?.rollNo || 'N/A',
      department: currentUser?.department || 'Manav Rachna Educational Institutions',
      assessmentId: activeAssessment?.id || 'asmt-2026-core',
      assessmentName: activeAssessment?.name || 'Human-Centric Skills Assessment 2026',
      overallScore: scoringResult.compositeScore,
      certificationStatus: scoringResult.certificationStatus,
      isCertified: scoringResult.isCertified,
      timestamp: new Date().toISOString(),
      timeSpentSeconds: timeSpent,
      timeTakenFormatted: `${Math.floor(timeSpent / 60)}m ${timeSpent % 60}s`,
      totalQuestions,
      answers,
      competencyScores: scoringResult.competencyScores,
      strengths: scoringResult.strengths,
      developmentAreas: scoringResult.developmentAreas
    };

    saveAttempt(newAttempt);

    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });

    if (onCompleteAttempt) onCompleteAttempt(newAttempt);
    else setTimeout(() => setView('results'), 500);
  };

  // Time urgency colors
  const timeUrgent = timeLeft < 300;
  const timeWarning = timeLeft < 900 && !timeUrgent;

  return (
    <div style={{ padding: '20px 0 80px 0', minHeight: 'calc(100vh - 72px)' }} className="animate-fade-in">
      <div className="container">

        {/* ── Top Header Card ────────────────────────────────────────────── */}
        <div style={{
          backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '16px 24px',
          border: '1px solid #ECE7DF', boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '16px', marginBottom: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <span style={{ color: '#8B1528', fontWeight: 700, fontSize: '0.85rem' }}>{currentQ?.skillName}</span>
              <span style={{ color: '#D1D5DB' }}>&gt;</span>
              <span style={{ color: '#6B7280', fontSize: '0.85rem', fontWeight: 600 }}>
                Question {currentIndex + 1} of {totalQuestions}
              </span>
              {currentQ?.isReverse && (
                <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '6px', backgroundColor: '#FEF3C7', color: '#B45309', fontWeight: 600 }}>
                  Reverse-Scored (6−X)
                </span>
              )}
              {/* Autosave indicator */}
              {autosaveFlash && (
                <span style={{ fontSize: '0.7rem', color: '#16A34A', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Check size={11} /> Autosaved
                </span>
              )}
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1C1917', fontFamily: 'var(--font-sans)' }}>
              {activeAssessment?.name || 'Human-Centric Skills Assessment 2026'}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Quick fill */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button type="button" onClick={() => autoFillAll('high')} className="btn-secondary" style={{ padding: '6px 10px', fontSize: '0.73rem', gap: '4px' }} title="Fill all — high scores">
                <Zap size={12} color="#16A34A" /> Pass
              </button>
              <button type="button" onClick={() => autoFillAll('low')} className="btn-secondary" style={{ padding: '6px 10px', fontSize: '0.73rem', gap: '4px' }} title="Fill all — low scores">
                <Zap size={12} color="#DC2626" /> Fail
              </button>
            </div>

            {/* Keyboard help */}
            <button type="button" onClick={() => setShowKeyboardHelp(true)} className="btn-secondary" style={{ padding: '6px 10px', fontSize: '0.73rem', gap: '4px' }} title="Keyboard shortcuts">
              <Keyboard size={13} /> Keys
            </button>

            {/* Timer */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              backgroundColor: timeUrgent ? '#FEE2E2' : timeWarning ? '#FEF3C7' : '#FAF8F5',
              border: `1px solid ${timeUrgent ? '#FCA5A5' : timeWarning ? '#FDE68A' : '#ECE7DF'}`,
              borderRadius: '9999px', padding: '8px 16px',
              color: timeUrgent ? '#DC2626' : timeWarning ? '#B45309' : '#8B1528',
              fontWeight: 700, fontSize: '0.95rem',
              animation: timeUrgent ? 'pulseGlow 1s infinite' : 'none'
            }}>
              <Clock size={16} />
              <span>{formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>

        {/* ── Progress Bar ───────────────────────────────────────────────── */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px', fontSize: '0.82rem', color: '#6B7280', fontWeight: 600 }}>
            <span>Overall Progress</span>
            <span style={{ color: '#8B1528', fontWeight: 700 }}>{answeredCount} / {totalQuestions} answered ({progressPercent}%)</span>
          </div>
          <div style={{ height: '8px', backgroundColor: '#E5E7EB', borderRadius: '9999px', overflow: 'hidden' }}>
            <div style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: '#8B1528', borderRadius: '9999px', transition: 'width 0.35s ease' }} />
          </div>
          {/* Competency progress markers */}
          <div style={{ display: 'flex', gap: '2px', marginTop: '6px', flexWrap: 'wrap' }}>
            {COMPETENCIES_DATA.map((comp, ci) => {
              const compQs = questionsList.filter(q => q.skillId === comp.id || q.skillName === comp.name);
              const done = compQs.filter(q => answers[q.id] !== undefined).length;
              const pct = compQs.length > 0 ? Math.round((done / compQs.length) * 100) : 0;
              return (
                <div key={comp.id} title={`${comp.name}: ${done}/${compQs.length}`} style={{ flex: 1, minWidth: 12 }}>
                  <div style={{ height: '4px', backgroundColor: '#F1F5F9', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', backgroundColor: pct === 100 ? '#16A34A' : '#8B1528', borderRadius: '2px', transition: 'width 0.3s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: '0.68rem', color: '#9CA3AF', marginTop: '3px' }}>
            Per-competency progress (15 bars)
          </div>
        </div>

        {/* ── Main Grid ─────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', alignItems: 'start' }} className="assessment-layout">

          {/* Question Card */}
          <div className="mr-card" style={{ padding: '36px 32px', minHeight: '460px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: '#8B1528', letterSpacing: '0.05em' }}>
                  Item #{currentIndex + 1}
                </span>
                <button
                  type="button"
                  onClick={() => setFlagged(prev => {
                    const s = new Set(prev);
                    s.has(currentQ.id) ? s.delete(currentQ.id) : s.add(currentQ.id);
                    return s;
                  })}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '6px 14px', borderRadius: '9999px',
                    border: flagged.has(currentQ.id) ? '1px solid #DC2626' : '1px solid #E5E7EB',
                    backgroundColor: flagged.has(currentQ.id) ? '#FEF2F2' : '#FFFFFF',
                    color: flagged.has(currentQ.id) ? '#DC2626' : '#6B7280',
                    fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  <Flag size={14} fill={flagged.has(currentQ.id) ? '#DC2626' : 'none'} />
                  <span>{flagged.has(currentQ.id) ? 'Flagged (F)' : 'Flag (F)'}</span>
                </button>
              </div>

              {/* Question */}
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1C1917', lineHeight: 1.55, marginBottom: '32px' }}>
                "{currentQ?.text}"
              </h3>

              {/* Likert options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {LIKERT.map(opt => {
                  const isSelected = answers[currentQ?.id] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAnswers(p => ({ ...p, [currentQ.id]: opt.value }))}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 20px', borderRadius: '14px',
                        border: isSelected ? `2px solid ${opt.color}` : '1px solid #ECE7DF',
                        backgroundColor: isSelected ? opt.bg : '#FFFFFF',
                        cursor: 'pointer', textAlign: 'left',
                        transition: 'all 0.15s ease',
                        transform: isSelected ? 'scale(1.01)' : 'scale(1)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          border: isSelected ? `2px solid ${opt.color}` : '2px solid #D1D5DB',
                          backgroundColor: isSelected ? opt.color : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.85rem', fontWeight: 700
                        }}>
                          {isSelected ? <Check size={16} color="#fff" /> : (
                            <span style={{ color: '#9CA3AF', fontSize: '0.72rem', fontWeight: 700 }}>{opt.value}</span>
                          )}
                        </div>
                        <div>
                          <span style={{ fontSize: '0.95rem', fontWeight: isSelected ? 700 : 500, color: isSelected ? opt.color : '#1C1917' }}>
                            {opt.label}
                          </span>
                          <div style={{ fontSize: '0.68rem', color: '#9CA3AF', marginTop: '1px' }}>
                            Press {opt.value} to select
                          </div>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isSelected ? opt.color : '#9CA3AF' }}>
                        {opt.short}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px', paddingTop: '20px', borderTop: '1px solid #F1EFEA', flexWrap: 'wrap', gap: '12px' }}>
              <button type="button" onClick={() => setCurrentIndex(i => Math.max(0, i - 1))} disabled={currentIndex === 0} className="btn-secondary" style={{ padding: '10px 20px', opacity: currentIndex === 0 ? 0.45 : 1, cursor: currentIndex === 0 ? 'not-allowed' : 'pointer' }}>
                <ChevronLeft size={16} /> <span>Previous</span>
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                {flagged.size > 0 && (
                  <button type="button" onClick={() => setShowFlaggedReview(true)} className="btn-secondary" style={{ padding: '10px 18px', fontSize: '0.85rem', color: '#DC2626', borderColor: '#FCA5A5' }}>
                    <Flag size={14} /> {flagged.size} Flagged
                  </button>
                )}
                {currentIndex < totalQuestions - 1 ? (
                  <button type="button" onClick={() => setCurrentIndex(i => i + 1)} className="btn-primary" style={{ padding: '10px 24px' }}>
                    <span>Next</span> <ChevronRight size={16} />
                  </button>
                ) : (
                  <button type="button" onClick={() => setShowSubmitModal(true)} className="btn-primary" style={{ padding: '10px 26px', backgroundColor: '#059669' }}>
                    <span>Finish &amp; Submit</span> <Send size={15} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Question Palette Sidebar */}
          <div className="mr-card assessment-sidebar" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1C1917' }}>Question Palette</h4>
              <span style={{ fontSize: '0.78rem', color: '#6B7280', fontWeight: 600 }}>{answeredCount}/{totalQuestions}</span>
            </div>

            {/* Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '5px', maxHeight: '380px', overflowY: 'auto', paddingRight: '2px', marginBottom: '14px' }}>
              {questionsList.map((q, idx) => {
                const isAnswered = answers[q.id] !== undefined;
                const isFlagged = flagged.has(q.id);
                const isCurrent = idx === currentIndex;

                let bg = '#F9FAFB', color = '#4B5563', border = '1px solid #E5E7EB';
                if (isCurrent) { bg = '#FDF2F4'; color = '#8B1528'; border = '2px solid #8B1528'; }
                else if (isFlagged) { bg = '#FEE2E2'; color = '#DC2626'; border = '1px solid #FCA5A5'; }
                else if (isAnswered) { bg = '#DCFCE7'; color = '#15803D'; border = '1px solid #86EFAC'; }

                return (
                  <button key={q.id} type="button" onClick={() => setCurrentIndex(idx)}
                    style={{ height: 32, borderRadius: '7px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: bg, color, border, cursor: 'pointer', transition: 'all 0.1s ease' }}>
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{ borderTop: '1px solid #F1EFEA', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.73rem', color: '#6B7280' }}>
              {[
                { dot: '#16A34A', label: `Answered (${answeredCount})` },
                { dot: '#E5E7EB', label: `Unanswered (${unansweredCount})` },
                { dot: '#DC2626', label: `Flagged (${flagged.size})` },
                { dot: '#8B1528', label: 'Current' },
              ].map(({ dot, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: dot, display: 'inline-block', flexShrink: 0 }} />
                  {label}
                </div>
              ))}
            </div>

            {/* Jump to unanswered */}
            {unansweredCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  const nextUnanswered = questionsList.findIndex((q, i) => i > currentIndex && answers[q.id] === undefined);
                  const first = nextUnanswered === -1 ? questionsList.findIndex(q => answers[q.id] === undefined) : nextUnanswered;
                  if (first !== -1) setCurrentIndex(first);
                }}
                className="btn-secondary"
                style={{ width: '100%', marginTop: '12px', padding: '8px', fontSize: '0.8rem' }}
              >
                Jump to Next Unanswered
              </button>
            )}

            {/* Submit shortcut */}
            <button type="button" onClick={() => setShowSubmitModal(true)} className="btn-primary" style={{ width: '100%', marginTop: '8px', padding: '10px', fontSize: '0.88rem', backgroundColor: '#059669' }}>
              <Send size={14} /> <span>Submit</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Submit Confirmation Modal ────────────────────────────────────── */}
      {showSubmitModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' }}>
          <div className="animate-pop" style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', maxWidth: '480px', width: '100%', padding: '36px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <CheckCircle2 size={34} />
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1C1917', marginBottom: '8px' }}>Submit Assessment?</h3>
            <p style={{ fontSize: '0.9rem', color: '#64748B', marginBottom: '8px', lineHeight: 1.5 }}>
              You have answered <strong>{answeredCount}</strong> of <strong>{totalQuestions}</strong> items.
            </p>
            {unansweredCount > 0 && (
              <div style={{ padding: '10px 16px', borderRadius: '10px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', marginBottom: '16px', fontSize: '0.85rem', color: '#B45309', fontWeight: 600 }}>
                ⚠ {unansweredCount} unanswered item{unansweredCount > 1 ? 's' : ''} will default to Neutral (3).
              </div>
            )}
            {flagged.size > 0 && (
              <div style={{ padding: '10px 16px', borderRadius: '10px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', marginBottom: '16px', fontSize: '0.85rem', color: '#B91C1C', fontWeight: 600 }}>
                🚩 {flagged.size} flagged item{flagged.size > 1 ? 's' : ''} not yet reviewed.
              </div>
            )}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => setShowSubmitModal(false)} className="btn-secondary" style={{ padding: '10px 22px' }}>
                Return to Test
              </button>
              {flagged.size > 0 && (
                <button type="button" onClick={() => { setShowSubmitModal(false); setShowFlaggedReview(true); }} className="btn-secondary" style={{ padding: '10px 20px', color: '#DC2626', borderColor: '#FCA5A5' }}>
                  Review Flagged
                </button>
              )}
              <button type="button" onClick={handleSubmitAssessment} className="btn-primary" style={{ padding: '10px 26px', backgroundColor: '#059669' }}>
                Confirm &amp; Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Flagged Review Modal ─────────────────────────────────────────── */}
      {showFlaggedReview && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' }}>
          <div className="animate-pop" style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', maxWidth: '520px', width: '100%', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', maxHeight: '80vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1C1917', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Flag size={18} color="#DC2626" /> Flagged Questions ({flagged.size})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {[...flagged].map(qId => {
                const q = questionsList.find(x => x.id === qId);
                if (!q) return null;
                const idx = questionsList.indexOf(q);
                const ans = answers[q.id];
                const ansLabel = LIKERT.find(l => l.value === ans)?.label || 'Unanswered';
                return (
                  <div key={qId} style={{ padding: '14px 16px', borderRadius: '12px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', cursor: 'pointer' }}
                    onClick={() => { setShowFlaggedReview(false); setCurrentIndex(idx); }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#DC2626', marginBottom: '4px' }}>
                      Q{idx + 1} • {q.skillName}
                    </div>
                    <div style={{ fontSize: '0.88rem', color: '#1C1917', fontWeight: 600, marginBottom: '4px', lineHeight: 1.4 }}>"{q.text}"</div>
                    <div style={{ fontSize: '0.78rem', color: ans ? '#2563EB' : '#9CA3AF' }}>
                      Current answer: {ansLabel}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowFlaggedReview(false)} className="btn-secondary" style={{ padding: '9px 18px', fontSize: '0.88rem' }}>Close</button>
              <button onClick={() => { setShowFlaggedReview(false); setShowSubmitModal(true); }} className="btn-primary" style={{ padding: '9px 20px', fontSize: '0.88rem', backgroundColor: '#059669' }}>
                Proceed to Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Keyboard Shortcuts Help ──────────────────────────────────────── */}
      {showKeyboardHelp && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' }}>
          <div className="animate-pop" style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', maxWidth: '420px', width: '100%', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1C1917', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Keyboard size={20} color="#8B1528" /> Keyboard Shortcuts
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {[
                { key: '1 – 5', desc: 'Select Likert answer' },
                { key: '→ / N', desc: 'Next question' },
                { key: '← / P', desc: 'Previous question' },
                { key: 'F', desc: 'Toggle flag on current question' },
              ].map(({ key, desc }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', backgroundColor: '#FAF8F5', border: '1px solid #ECE7DF' }}>
                  <span style={{ fontSize: '0.88rem', color: '#1C1917', fontWeight: 600 }}>{desc}</span>
                  <kbd style={{ padding: '3px 10px', borderRadius: '6px', backgroundColor: '#1C1917', color: '#FFFFFF', fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 700 }}>{key}</kbd>
                </div>
              ))}
            </div>
            <button onClick={() => setShowKeyboardHelp(false)} className="btn-primary" style={{ width: '100%', padding: '10px' }}>Got it</button>
          </div>
        </div>
      )}
    </div>
  );
}
