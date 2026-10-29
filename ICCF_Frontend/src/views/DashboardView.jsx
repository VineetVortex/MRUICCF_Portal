import React, { useState, useEffect, useRef } from 'react';
import {
  ClipboardList, CheckCircle2, Award, Target, ArrowRight,
  Calendar, Clock, ChevronRight, TrendingUp, AlertCircle,
  RotateCcw, History, FileCheck, Sparkles, BookOpen, X, Info,
  Zap, Sun, Moon, Sunset, ExternalLink, MessageSquare, KeyRound
} from 'lucide-react';
import RadarChart from '../components/RadarChart';
import BetaFeedbackModal from '../components/BetaFeedbackModal';
import TesterRedemptionModal from '../components/TesterRedemptionModal';
import { apiGetTesterAccessStatus } from '../lib/api';
import { COMPETENCIES_DATA } from '../data/assessmentData';
import { getStoredAttempts, getStoredAssessments } from '../lib/storage';
import { CERTIFICATION_THRESHOLD, getCompetencyLevel } from '../lib/scoring';

/* ── Animated counter hook ───────────────────────────────────────────────── */
function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === null || target === undefined) return;
    let start = null;
    const num = Number(target);
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * num));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return value;
}

/* ── Live greeting ───────────────────────────────────────────────────────── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good morning', Icon: Sun, color: '#D97706' };
  if (h < 17) return { text: 'Good afternoon', Icon: Sunset, color: '#EA580C' };
  return { text: 'Good evening', Icon: Moon, color: '#6366F1' };
}

/* ── Tiny sparkline SVG ──────────────────────────────────────────────────── */
function Sparkline({ values, color = '#8B1528', width = 100, height = 32 }) {
  if (!values || values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* last dot */}
      {(() => {
        const last = values[values.length - 1];
        const x = width;
        const y = height - ((last - min) / range) * (height - 4) - 2;
        return <circle cx={x} cy={y} r="3" fill={color} />;
      })()}
    </svg>
  );
}

export default function DashboardView({ setView, currentUser, userRole, activeAttempt, setActiveAttempt, setActiveAssessment }) {
  const [selectedCompetency, setSelectedCompetency] = useState(null);
  const [liveTime, setLiveTime] = useState(new Date());

  const attempts = getStoredAttempts();
  const currentUserId = currentUser?.uid || currentUser?.id;
  const userAttempts = currentUserId ? attempts.filter((a) => a.userId === currentUserId) : attempts;
  const latestAttempt = activeAttempt || userAttempts[0] || null;

  const overallScore = latestAttempt ? Math.round(Number(latestAttempt.overallScore)) : null;
  const isCertified = overallScore !== null && overallScore >= CERTIFICATION_THRESHOLD;
  const levelInfo = overallScore !== null ? getCompetencyLevel(overallScore) : null;

  // Authoritative 15-dimension competency aggregation across all attempts
  const competencyScoreMap = {};
  if (latestAttempt?.competencyScores && Array.isArray(latestAttempt.competencyScores)) {
    latestAttempt.competencyScores.forEach(cs => {
      if (cs.id !== undefined) competencyScoreMap[cs.id] = cs.score;
      if (cs.name) competencyScoreMap[cs.name] = cs.score;
    });
  }
  userAttempts.forEach(att => {
    if (att.skillId && typeof att.overallScore === 'number') {
      if (competencyScoreMap[att.skillId] === undefined) {
        competencyScoreMap[att.skillId] = Math.round(Number(att.overallScore));
      }
    }
    if (Array.isArray(att.competencyScores)) {
      att.competencyScores.forEach(cs => {
        if (cs.id && competencyScoreMap[cs.id] === undefined && typeof cs.score === 'number') {
          competencyScoreMap[cs.id] = Math.round(Number(cs.score));
        }
      });
    }
  });

  const competencyData = COMPETENCIES_DATA.map(c => ({
    id: c.id,
    name: c.name,
    univAvg: c.univAvg || 72,
    score: competencyScoreMap[c.id] ?? (competencyScoreMap[c.name] ?? 0)
  }));

  const attemptedCompetencies = competencyData.filter(c => competencyScoreMap[c.id] !== undefined || competencyScoreMap[c.name] !== undefined);
  const sortedByScore = [...(attemptedCompetencies.length > 0 ? attemptedCompetencies : competencyData)].sort((a, b) => b.score - a.score);
  const topStrengths = sortedByScore.filter(c => c.score >= 50).slice(0, 3);
  const developmentAreas = [...(attemptedCompetencies.length > 0 ? attemptedCompetencies : competencyData)].sort((a, b) => a.score - b.score).slice(0, 3);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [testerStatus, setTesterStatus] = useState(null);

  useEffect(() => {
    apiGetTesterAccessStatus().then(res => {
      if (res && (res.isTester || res.isAuthorizedTester)) {
        setTesterStatus(res.student || res);
      }
    }).catch(() => {});
  }, []);

  const availableAssessments = getStoredAssessments().filter(a => a.active);

  // Attempt score trend (oldest → newest)
  const scoreTrend = [...userAttempts].reverse().map(a => Math.round(Number(a.overallScore) || 0));

  // Animated counters
  const animScore = useCountUp(overallScore ?? 0);
  const animAttempts = useCountUp(userAttempts.length);

  // Live clock tick
  useEffect(() => {
    const t = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const greeting = getGreeting();
  const GIcon = greeting.Icon;

  const [activeSession, setActiveSession] = useState(null);

  // Check for in-progress session with authoritative deadline
  useEffect(() => {
    let mounted = true;
    async function checkActive() {
      try {
        const { apiGetActiveAttempt } = await import('../lib/api.js');
        const res = await apiGetActiveAttempt(currentUserId);
        if (mounted && res && res.success && res.data) {
          setActiveSession(res.data);
        }
      } catch (e) {
        console.warn('Check active attempt notice:', e);
      }
    }
    if (currentUserId) checkActive();
    return () => { mounted = false; };
  }, [currentUserId]);

  const fmt = (d) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const handleLinkedInShare = () => {
    const certId = latestAttempt?.certificate?.certificateNumber ||
      `MRU-ICCF-${currentUser?.rollNo || 'GEN'}-${new Date(latestAttempt?.timestamp || Date.now()).getFullYear()}-${(latestAttempt?.id || '01').slice(-4).toUpperCase()}`;
    const verifyUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/?verify=${encodeURIComponent(certId)}`
      : `https://verify.mru.edu.in/cert/${encodeURIComponent(certId)}`;
    const title = encodeURIComponent(`Institutional Competency Certification (ICCF) - ${levelInfo?.level || 'Proficient'}`);
    const org = encodeURIComponent('Manav Rachna Educational Institutions');
    const date = new Date(latestAttempt?.timestamp || Date.now());
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const url = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${title}&organizationName=${org}&issueYear=${year}&issueMonth=${month}&certUrl=${encodeURIComponent(verifyUrl)}&certId=${encodeURIComponent(certId)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div style={{ padding: '24px 0 80px 0' }} className="animate-fade-in">
      <div className="container">

        {/* ── Welcome Banner ───────────────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, #8B1528 0%, #6C0E1E 100%)',
          borderRadius: '24px',
          padding: '28px 32px',
          color: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          marginBottom: '24px',
          boxShadow: '0 8px 32px rgba(139, 21, 40, 0.28)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* decorative circles */}
          <div style={{ position: 'absolute', top: -40, right: 80, width: 160, height: 160, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.04)' }} />
          <div style={{ position: 'absolute', bottom: -30, right: 30, width: 100, height: 100, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.06)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative', zIndex: 1 }}>
            <div style={{ width: 52, height: 52, borderRadius: '16px', backgroundColor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GIcon size={26} color="#FDE68A" />
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#FDE68A', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{greeting.text}</span>
                <span>•</span>
                <span>{fmt(liveTime)}</span>
              </div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, lineHeight: 1.2, fontFamily: 'var(--font-sans)', margin: 0 }}>
                {currentUser?.name || 'Student'}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                {currentUser?.rollNo && (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(255,255,255,0.18)',
                    backdropFilter: 'blur(8px)',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em'
                  }}>
                    <span>Roll No: {currentUser.rollNo}</span>
                  </div>
                )}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  backdropFilter: 'blur(8px)',
                  fontSize: '0.78rem',
                  fontWeight: 700
                }}>
                  <span>Branch: {currentUser?.deptCode || 'CST'}</span>
                </div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  backdropFilter: 'blur(8px)',
                  fontSize: '0.78rem',
                  fontWeight: 600
                }}>
                  <span>Department: {currentUser?.department || 'Computer Science & Technology'}</span>
                </div>
                {(currentUser?.year || currentUser?.designation) && (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(255,255,255,0.12)',
                    fontSize: '0.76rem',
                    color: '#FEF3C7'
                  }}>
                    <span>{currentUser?.year || currentUser?.designation}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative', zIndex: 1, flexWrap: 'wrap' }}>
            {isCertified && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '9999px', backgroundColor: 'rgba(22,163,74,0.25)', border: '1px solid rgba(22,163,74,0.4)' }}>
                <CheckCircle2 size={15} color="#4ADE80" />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#4ADE80' }}>Certified</span>
              </div>
            )}
            <button
              onClick={() => setShowFeedbackModal(true)}
              style={{
                padding: '11px 18px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(255,255,255,0.18)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.85rem',
                border: '1px solid rgba(255,255,255,0.3)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backdropFilter: 'blur(8px)',
                transition: 'all 0.15s ease'
              }}
              title="Share feedback on exam and dashboard during Beta"
            >
              <MessageSquare size={14} />
              <span>Beta Feedback</span>
            </button>
            {testerStatus ? (
              <div style={{
                padding: '9px 16px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: '#FEF08A',
                fontWeight: 700,
                fontSize: '0.84rem',
                border: '1px solid rgba(255,255,255,0.35)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <Sparkles size={14} />
                <span>Tester: {testerStatus.rollNumber || 'Authorized'}</span>
              </div>
            ) : (
              <button
                onClick={() => setShowRedeemModal(true)}
                style={{
                  padding: '11px 18px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  border: '1px solid rgba(255,255,255,0.3)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backdropFilter: 'blur(8px)',
                  transition: 'all 0.15s ease'
                }}
                title="Redeem single-use tester invitation code"
              >
                <KeyRound size={14} />
                <span>Redeem Tester Code</span>
              </button>
            )}
            <button
              onClick={() => {
                if (setActiveAssessment && availableAssessments[0]) setActiveAssessment(availableAssessments[0]);
                setView('assessment');
              }}
              style={{
                padding: '11px 24px',
                borderRadius: '9999px',
                backgroundColor: '#FFFFFF',
                color: '#8B1528',
                fontWeight: 700,
                fontSize: '0.9rem',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}
            >
              <Zap size={15} />
              <span>Take Assessment</span>
            </button>
          </div>
        </div>

        {/* ── Active Examination Recovery Banner (Phase 2 & 4) ──────────── */}
        {activeSession && (
          <div className="animate-slide-up" style={{
            backgroundColor: '#FEF2F2', border: '2px solid #8B1528',
            borderRadius: '20px', padding: '20px 28px', marginBottom: '24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: '16px',
            boxShadow: '0 6px 20px rgba(139, 21, 40, 0.12)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: 48, height: 48, borderRadius: '12px', backgroundColor: '#8B1528', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Clock size={26} className="animate-pulse" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#8B1528', margin: 0 }}>
                    Active Examination Session in Progress!
                  </h3>
                  <span style={{ padding: '3px 10px', borderRadius: '9999px', fontSize: '0.74rem', fontWeight: 800, backgroundColor: '#FEE2E2', color: '#DC2626' }}>
                    {Math.floor(activeSession.remainingSeconds / 60)}m {activeSession.remainingSeconds % 60}s Remaining
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#4B5563', marginTop: '4px', margin: 0 }}>
                  You have an active timed attempt for <strong>{activeSession.assessmentName}</strong>. Your session is protected and ticking against the authoritative university server clock.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (setActiveAssessment) {
                  setActiveAssessment({
                    id: activeSession.assessmentId,
                    name: activeSession.assessmentName,
                    timeLimit: Math.ceil(activeSession.durationSeconds / 60)
                  });
                }
                setView('assessment');
              }}
              className="btn-primary"
              style={{
                padding: '12px 24px',
                fontSize: '0.92rem',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(139, 21, 40, 0.35)'
              }}
            >
              <Zap size={16} />
              <span>Resume Assessment Now</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* ── Certification Award Banner ────────────────────────────────── */}
        {isCertified && (
          <div className="animate-slide-up" style={{
            backgroundColor: '#F0FDF4', border: '1px solid #86EFAC',
            borderRadius: '20px', padding: '20px 28px', marginBottom: '24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: '16px',
            boxShadow: '0 4px 15px rgba(22, 163, 74, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: 46, height: 46, borderRadius: '12px', backgroundColor: '#DCFCE7', color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Award size={26} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#166534', margin: 0 }}>Official Institutional Certification Awarded!</h3>
                  <span style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 700, backgroundColor: '#BBF7D0', color: '#14532D' }}>
                    Passed ({overallScore}%)
                  </span>
                </div>
                <p style={{ fontSize: '0.84rem', color: '#15803D', marginTop: '3px' }}>
                  You satisfied the institutional certification standard (≥{CERTIFICATION_THRESHOLD}%). Your verified credential is ready.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button onClick={() => setView('certificate')} style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '11px 20px', borderRadius: '12px',
                backgroundColor: '#16A34A', color: '#FFFFFF', fontWeight: 700,
                fontSize: '0.88rem', border: 'none', cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)'
              }}>
                <FileCheck size={16} />
                <span>View &amp; Download Certificate</span>
              </button>
              <button onClick={handleLinkedInShare} style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '11px 18px', borderRadius: '12px',
                backgroundColor: '#0A66C2', color: '#FFFFFF', fontWeight: 700,
                fontSize: '0.88rem', border: 'none', cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(10, 102, 194, 0.25)'
              }}>
                <ExternalLink size={15} />
                <span>Add to LinkedIn</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Below-threshold banner ────────────────────────────────────── */}
        {latestAttempt && !isCertified && (
          <div style={{
            backgroundColor: '#FFFBEB', border: '1px solid #FDE68A',
            borderRadius: '20px', padding: '18px 24px', marginBottom: '24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <AlertCircle size={24} color="#D97706" style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ fontSize: '0.95rem', color: '#92400E' }}>
                  Certification In Progress ({overallScore}% achieved, {CERTIFICATION_THRESHOLD}% required)
                </strong>
                <p style={{ fontSize: '0.82rem', color: '#B45309', marginTop: '2px' }}>
                  Review your personalized development areas and re-take the assessment to achieve certification.
                </p>
              </div>
            </div>
            <button onClick={() => setView('development')} className="btn-secondary" style={{ padding: '8px 18px', fontSize: '0.82rem', gap: '6px' }}>
              <span>Explore Action Plan</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* ── 4 Stat Cards ─────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', marginBottom: '24px' }}>

          {/* Certification Status */}
          <div className="mr-card" style={{ padding: '22px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: 46, height: 46, borderRadius: '12px', backgroundColor: isCertified ? '#DCFCE7' : '#FEF3C7', color: isCertified ? '#15803D' : '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={24} />
            </div>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1C1917', lineHeight: 1.1 }}>
                {latestAttempt ? (isCertified ? 'Certified' : 'Not Certified') : 'Pending'}
              </div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#78716C', marginTop: '2px' }}>Threshold: {CERTIFICATION_THRESHOLD.toFixed(2)}%</div>
            </div>
          </div>

          {/* Total Attempts + sparkline */}
          <div className="mr-card" style={{ padding: '22px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: 46, height: 46, borderRadius: '12px', backgroundColor: '#F3E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7C3AED' }}>
              <History size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1C1917', lineHeight: 1.1 }}>{animAttempts}</div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#78716C', marginTop: '2px' }}>Completed Attempts</div>
            </div>
            {scoreTrend.length >= 2 && (
              <Sparkline values={scoreTrend} color="#7C3AED" width={60} height={28} />
            )}
          </div>

          {/* Composite Score */}
          <div className="mr-card" style={{ padding: '22px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: 46, height: 46, borderRadius: '12px', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706' }}>
              <Award size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1C1917', lineHeight: 1.1 }}>
                {overallScore !== null ? `${animScore}%` : '—'}
              </div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#78716C', marginTop: '2px' }}>
                {levelInfo ? `${levelInfo.level} — ${levelInfo.name}` : 'Awaiting baseline'}
              </div>
            </div>
          </div>

          {/* Evaluated Competencies */}
          <div className="mr-card" style={{ padding: '22px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: 46, height: 46, borderRadius: '12px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
              <Target size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1C1917', lineHeight: 1.1 }}>15</div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#78716C', marginTop: '2px' }}>Human-Centric Dimensions</div>
            </div>
          </div>
        </div>

        {/* ── Radar + Strengths/Development ────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          {/* Radar */}
          <div className="mr-card" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1C1917' }}>Your Competency Profile</h3>
                <p style={{ fontSize: '0.82rem', color: '#78716C', marginTop: '2px' }}>15 Dimensions relative to university cohorts</p>
              </div>
              <button onClick={() => setView('results')} style={{ fontSize: '0.82rem', fontWeight: 600, color: '#8B1528', display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer' }}>
                <span>Full Results</span>
                <ChevronRight size={14} />
              </button>
            </div>
            <RadarChart data={competencyData} size={420} />
          </div>

          {/* Strengths + Dev Areas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Strengths */}
            <div className="mr-card" style={{ padding: '26px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1C1917', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={18} color="#16A34A" />
                  <span>Top Strengths</span>
                </h3>
                <button onClick={() => setView('results')} style={{ fontSize: '0.82rem', fontWeight: 600, color: '#8B1528', background: 'none', border: 'none', cursor: 'pointer' }}>
                  View All &gt;
                </button>
              </div>
              {topStrengths.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: '#78716C', textAlign: 'center', padding: '12px 0' }}>Complete an assessment to see your strengths.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {topStrengths.map((item, index) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedCompetency(item)}
                      title="Click to inspect"
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '6px 8px', borderRadius: '10px', transition: 'background-color 0.15s ease' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F0FDF4'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: '#DCFCE7', color: '#15803D', fontWeight: 700, fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {index + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', fontWeight: 600, marginBottom: '4px' }}>
                          <span style={{ color: '#1E293B' }}>{item.name}</span>
                          <span style={{ color: '#15803D', fontWeight: 700 }}>{item.score}%</span>
                        </div>
                        <div style={{ height: '6px', backgroundColor: '#F1F5F9', borderRadius: '9999px', overflow: 'hidden' }}>
                          <div style={{ width: `${item.score}%`, height: '100%', backgroundColor: '#16A34A', borderRadius: '9999px', transition: 'width 0.8s ease' }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Development Areas */}
            <div className="mr-card" style={{ padding: '26px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1C1917', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={18} color="#EA580C" />
                  <span>Development Areas</span>
                </h3>
                <button onClick={() => setView('development')} style={{ fontSize: '0.82rem', fontWeight: 600, color: '#8B1528', background: 'none', border: 'none', cursor: 'pointer' }}>
                  View Plan &gt;
                </button>
              </div>
              {developmentAreas.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: '#78716C', textAlign: 'center', padding: '12px 0' }}>Complete an assessment to generate your roadmap.</p>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {developmentAreas.map((item, index) => {
                      const barColor = item.score < 63 ? '#DC2626' : '#EA580C';
                      const bgCircle = item.score < 63 ? '#FEE2E2' : '#FFEDD5';
                      const textCircle = item.score < 63 ? '#B91C1C' : '#C2410C';
                      return (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: bgCircle, color: textCircle, fontWeight: 700, fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {index + 1}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', fontWeight: 600, marginBottom: '4px' }}>
                              <span style={{ color: '#1E293B' }}>{item.name}</span>
                              <span style={{ color: textCircle, fontWeight: 700 }}>{item.score}%</span>
                            </div>
                            <div style={{ height: '6px', backgroundColor: '#F1F5F9', borderRadius: '9999px', overflow: 'hidden' }}>
                              <div style={{ width: `${item.score}%`, height: '100%', backgroundColor: barColor, borderRadius: '9999px', transition: 'width 0.8s ease' }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: '18px', textAlign: 'right' }}>
                    <button onClick={() => setView('development')} className="btn-secondary" style={{ padding: '8px 18px', fontSize: '0.82rem' }}>
                      Personalized Roadmap
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Quick Action Tiles ────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
          {[
            { label: 'Take Assessment', icon: ClipboardList, color: '#8B1528', bg: '#FDF2F4', view: 'assessment' },
            { label: 'My Results', icon: Award, color: '#2563EB', bg: '#EFF6FF', view: 'results' },
            { label: 'Development Plan', icon: BookOpen, color: '#D97706', bg: '#FEF3C7', view: 'development' },
            { label: 'My Certificate', icon: FileCheck, color: '#16A34A', bg: '#DCFCE7', view: 'certificate' },
          ].map(({ label, icon: Icon, color, bg, view }) => (
            <button
              key={view}
              onClick={() => setView(view)}
              style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '18px 20px', borderRadius: '16px',
                backgroundColor: '#FFFFFF', border: '1px solid #ECE7DF',
                cursor: 'pointer', textAlign: 'left',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                transition: 'all 0.18s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; }}
            >
              <div style={{ width: 40, height: 40, borderRadius: '12px', backgroundColor: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1C1917' }}>{label}</div>
              </div>
              <ChevronRight size={16} color="#9CA3AF" style={{ marginLeft: 'auto' }} />
            </button>
          ))}
        </div>

        {/* ── Assessment History ────────────────────────────────────────── */}
        <div className="mr-card" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1C1917', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={20} color="#8B1528" />
                <span>Your Assessment History</span>
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#78716C', marginTop: '2px' }}>
                Review past attempt reports and check your official certification status
              </p>
            </div>
            <button onClick={() => setView('assessment')} className="btn-primary" style={{ fontSize: '0.85rem', padding: '8px 18px' }}>
              Start New Attempt
            </button>
          </div>

          {userAttempts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#78716C', fontSize: '0.92rem' }}>
              No completed attempts yet. Click <strong>"Start New Attempt"</strong> to begin!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {userAttempts.map((att, idx) => {
                const attScore = Math.round(Number(att.overallScore) || 0);
                const attPassed = attScore >= CERTIFICATION_THRESHOLD;
                const isSelected = latestAttempt?.id === att.id;
                const prevAtt = userAttempts[idx + 1];
                const delta = prevAtt ? attScore - Math.round(Number(prevAtt.overallScore) || 0) : null;

                return (
                  <div
                    key={att.id}
                    onClick={() => {
                      if (setActiveAttempt) setActiveAttempt(att);
                      setView('results');
                    }}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '16px 20px', borderRadius: '14px',
                      border: isSelected ? '2px solid #8B1528' : '1px solid #ECE7DF',
                      backgroundColor: isSelected ? '#FDF2F4' : '#FAF8F5',
                      cursor: 'pointer', transition: 'all 0.15s ease',
                      flexWrap: 'wrap', gap: '12px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1C1917' }}>{att.assessmentName}</span>
                        <span style={{
                          padding: '3px 10px', borderRadius: '9999px',
                          fontSize: '0.74rem', fontWeight: 700,
                          backgroundColor: attPassed ? '#DCFCE7' : '#FEF3C7',
                          color: attPassed ? '#15803D' : '#B45309'
                        }}>
                          {attPassed ? '✓ Passed' : '⚠ Needs Improvement'}
                        </span>
                        {delta !== null && (
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: delta >= 0 ? '#16A34A' : '#DC2626' }}>
                            {delta >= 0 ? `▲ +${delta}%` : `▼ ${delta}%`}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#78716C', marginTop: '4px' }}>
                        {new Date(att.timestamp).toLocaleString()} • {att.timeTakenFormatted || '—'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.35rem', fontWeight: 800, color: attPassed ? '#16A34A' : '#D97706' }}>{attScore}%</div>
                        <div style={{ fontSize: '0.72rem', color: '#78716C' }}>Composite</div>
                      </div>
                      <ChevronRight size={18} color="#8B1528" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* ── Competency detail modal ───────────────────────────────────── */}
      {selectedCompetency && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' }}
          onClick={() => setSelectedCompetency(null)}>
          <div className="animate-pop" style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', maxWidth: '440px', width: '100%', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#8B1528', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Competency Detail</div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1C1917' }}>{selectedCompetency.name}</h3>
              </div>
              <button onClick={() => setSelectedCompetency(null)} style={{ color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            {/* Score pill */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {[
                { label: 'Your Score', value: `${selectedCompetency.score}%`, color: '#8B1528', bg: '#FDF2F4' },
                { label: 'Univ. Avg', value: `${selectedCompetency.univAvg || 72}%`, color: '#2563EB', bg: '#EFF6FF' },
                { label: 'Level', value: getCompetencyLevel(selectedCompetency.score).level, color: getCompetencyLevel(selectedCompetency.score).color, bg: getCompetencyLevel(selectedCompetency.score).bg },
              ].map(p => (
                <div key={p.label} style={{ flex: 1, minWidth: 90, padding: '12px', borderRadius: '12px', backgroundColor: p.bg, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: p.color }}>{p.value}</div>
                  <div style={{ fontSize: '0.72rem', color: '#78716C', fontWeight: 600, marginTop: '2px' }}>{p.label}</div>
                </div>
              ))}
            </div>

            {/* Bar */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600, color: '#6B7280', marginBottom: '6px' }}>
                <span>Score vs. Benchmark</span>
                <span style={{ color: selectedCompetency.score >= (selectedCompetency.univAvg || 72) ? '#16A34A' : '#DC2626' }}>
                  {selectedCompetency.score >= (selectedCompetency.univAvg || 72) ? `+${selectedCompetency.score - (selectedCompetency.univAvg || 72)}% above` : `${selectedCompetency.score - (selectedCompetency.univAvg || 72)}% below`}
                </span>
              </div>
              <div style={{ height: '8px', backgroundColor: '#F1F5F9', borderRadius: '9999px', overflow: 'hidden', position: 'relative' }}>
                <div style={{ width: `${selectedCompetency.score}%`, height: '100%', backgroundColor: '#8B1528', borderRadius: '9999px', transition: 'width 0.8s ease' }} />
                {/* benchmark marker */}
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${selectedCompetency.univAvg || 72}%`, width: 2, backgroundColor: '#2563EB' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setSelectedCompetency(null); setView('development'); }} className="btn-secondary" style={{ padding: '9px 18px', fontSize: '0.85rem' }}>
                View Roadmap
              </button>
              <button onClick={() => setSelectedCompetency(null)} className="btn-primary" style={{ padding: '9px 20px', fontSize: '0.85rem' }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Beta Test Feedback Modal ── */}
      <BetaFeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        currentUser={currentUser}
      />
      <TesterRedemptionModal
        isOpen={showRedeemModal}
        onClose={() => setShowRedeemModal(false)}
        userEmail={currentUser?.email}
        onSuccess={(t) => setTesterStatus(t)}
      />
    </div>
  );
}
