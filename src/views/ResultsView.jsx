import React, { useState, useEffect } from 'react';
import {
  Download, Award, ArrowUpRight, CheckCircle, FileText, Sparkles,
  ArrowRight, TrendingUp, AlertTriangle, Lightbulb, History,
  CheckCircle2, Clock, RotateCcw, BarChart2, Target, ChevronRight,
  ExternalLink
} from 'lucide-react';
import ScoreGauge from '../components/ScoreGauge';
import { COMPETENCIES_DATA } from '../data/assessmentData';
import { getStoredAttempts } from '../lib/storage';
import { CERTIFICATION_THRESHOLD, getCompetencyLevel } from '../lib/scoring';

/* ── Animated bar width helper ─────────────────────────────────────────── */
function AnimatedBar({ pct, color }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 80);
    return () => clearTimeout(t);
  }, [pct]);
  return (
    <div style={{ height: 7, backgroundColor: '#F1F5F9', borderRadius: '9999px', overflow: 'hidden' }}>
      <div style={{ width: `${width}%`, height: '100%', backgroundColor: color, borderRadius: '9999px', transition: 'width 0.9s cubic-bezier(0.16,1,0.3,1)' }} />
    </div>
  );
}

/* ── Dynamic recommendations generator ────────────────────────────────── */
function generateRecommendations(competencyScores) {
  if (!competencyScores || competencyScores.length === 0) return [];
  const sorted = [...competencyScores].sort((a, b) => a.score - b.score);
  const recs = [];

  sorted.slice(0, 3).forEach((c, i) => {
    const priority = i === 0 ? 'High' : i === 1 ? 'Medium' : 'Low';
    const tagColor = i === 0 ? '#DC2626' : i === 1 ? '#D97706' : '#2563EB';
    const tagBg   = i === 0 ? '#FEE2E2' : i === 1 ? '#FEF3C7' : '#DBEAFE';

    const templates = {
      'Communication':        'Enroll in the Faculty Oral Communication clinic. Practice structured storytelling and adaptive framing via peer-led case study sessions.',
      'Planning & Organizing':'Work through the Project Timeline Simulation: plan a 4-week deliverable across stakeholders using SMART milestones and retrospectives.',
      'Professionalism':      'Attend the Workplace Decorum workshop series. Shadow a senior colleague for two weeks and log observations in a reflective journal.',
      'Resource Management':  'Complete the Agile Resource Allocation lab: simulate budget balancing and waste-reduction scenarios across three sprints.',
      'Building Trust':       'Participate in peer feedback circles. Commit to three transparency challenges: share a blocker publicly and resolve it visibly.',
      'Collaboration & Teamwork':'Join the Cross-Departmental Project Challenge. Work with peers from 3 different departments to co-deliver a shared objective.',
      'Conflict Resolution':  'Take the Constructive Mediation module. Practice de-escalation scripts with a partner using the DEAR MAN framework.',
      'Emotional Intelligence':'Complete the 21-Day EQ challenge: daily emotion logging, identifying triggers and recording regulated responses.',
      'Empathy':              'Engage in the Perspective-Taking Lab — read three first-person case studies from underrepresented groups and write a response memo.',
      'Inclusion':            'Audit a team or group project for equity gaps. Document findings and present two actionable inclusion improvements.',
      'Ethics':               'Review the ICCF Ethics Charter. Complete two ethical-dilemma simulations and justify decisions with moral reasoning frameworks.',
      'Accountability':       'Implement a weekly public commitment tracker: post one goal, update progress, and reflect on outcomes every Friday.',
      'Lifelong Learning':    'Commit to one new micro-skill per fortnight. Log learning, application, and outcome in your ICCF development journal.',
      'Resilience':           'Use the ABCDE cognitive reframing model on a recent setback. Identify beliefs, consequences, and create a dispute + energizing plan.',
      'Self-Management':      'Design a 30-day discipline experiment: define one habit, track compliance daily, and report on behavioral shifts at the end.',
    };

    const action = templates[c.name] || `Dedicate structured practice to ${c.name}. Seek mentorship and review peer benchmarks for focused improvement strategies.`;

    recs.push({
      priority,
      tagColor,
      tagBg,
      competency: c.name,
      score: c.score,
      univAvg: c.univAvg || 72,
      gap: (c.univAvg || 72) - c.score,
      action,
      level: getCompetencyLevel(c.score)
    });
  });

  return recs;
}

export default function ResultsView({ setView, currentUser, activeAttempt, setActiveAttempt, userRole }) {
  const [activeTab, setActiveTab] = useState('scores');
  const [sortCol, setSortCol] = useState('score');
  const [sortDir, setSortDir] = useState('desc');

  const allAttempts = getStoredAttempts();
  const currentUserId = currentUser?.uid || currentUser?.id;
  const isStudentRole = userRole === 'student' || (!userRole && currentUser?.role === 'student');
  const userAttempts = (isStudentRole && currentUserId)
    ? allAttempts.filter(a => a.userId === currentUserId || a.rollNo === currentUser?.rollNo)
    : allAttempts;

  const attempt = activeAttempt || userAttempts[0] || null;
  const overallScore = attempt ? Math.round(Number(attempt.overallScore) || 0) : 0;
  const isCertified = Boolean(attempt && overallScore >= CERTIFICATION_THRESHOLD);
  const levelInfo = attempt ? getCompetencyLevel(overallScore) : null;

  const competencyScores = attempt?.competencyScores || [];
  const sorted = [...competencyScores].sort((a, b) => b.score - a.score);
  const strengths = attempt?.strengths || sorted.slice(0, 3);
  const developmentAreas = attempt?.developmentAreas || [...competencyScores].sort((a, b) => a.score - b.score).slice(0, 3);
  const recommendations = generateRecommendations(competencyScores);

  // Sort for scores table
  const displayScores = [...competencyScores].sort((a, b) => {
    const aVal = sortCol === 'variance' ? (a.score - (a.univAvg || 72)) : a[sortCol] ?? a.score;
    const bVal = sortCol === 'variance' ? (b.score - (b.univAvg || 72)) : b[sortCol] ?? b.score;
    return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
  });

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const tabs = [
    { id: 'scores',          label: `All Scores (${competencyScores.length})` },
    { id: 'strengths',       label: `Strengths (${strengths.length})` },
    { id: 'dev_areas',       label: `Focus Areas (${developmentAreas.length})` },
    { id: 'recommendations', label: 'Action Plan' },
    { id: 'history',         label: `History (${userAttempts.length})` },
  ];

  if (!attempt) {
    return (
      <div style={{ padding: '40px 0 60px 0' }} className="animate-fade-in">
        <div className="container">
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '56px 32px', border: '1px solid #ECE7DF', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '20px', backgroundColor: '#FDF2F4', color: '#8B1528', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Award size={36} />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1C1917', marginBottom: '8px' }}>No Assessment Results Found</h2>
            <p style={{ color: '#78716C', maxWidth: '500px', margin: '0 auto 24px', fontSize: '0.95rem', lineHeight: 1.6 }}>
              Complete an assessment to see your detailed scorecard and competency breakdown.
            </p>
            <button onClick={() => setView('assessment')} className="btn-primary" style={{ padding: '12px 28px', fontSize: '0.95rem' }}>
              Take Assessment Now <ArrowRight size={16} style={{ marginLeft: 8, verticalAlign: 'middle' }} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 0 60px 0' }} className="animate-fade-in">
      <div className="container">

        {/* Admin/Faculty Inspector Return Banner */}
        {!isStudentRole && (
          <div style={{
            backgroundColor: '#F8FAFC',
            borderRadius: '16px',
            padding: '12px 20px',
            border: '1px solid #E2E8F0',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#0284C7'
              }} />
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#334155' }}>
                Scorecard Inspection Mode: Reviewing candidate record for {attempt?.studentName || 'Student'} ({attempt?.rollNo || 'N/A'})
              </span>
            </div>
            <button
              onClick={() => setView(userRole === 'faculty' || userRole === 'dept_head' ? 'faculty' : 'admin')}
              className="btn-secondary"
              style={{ padding: '6px 14px', fontSize: '0.82rem', fontWeight: 700 }}
            >
              ← Return to {userRole === 'faculty' || userRole === 'dept_head' ? 'Faculty Portal' : 'Admin Console'}
            </button>
          </div>
        )}

        {/* ── Top Banner ───────────────────────────────────────────────── */}
        <div style={{
          backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '24px 32px',
          border: '1px solid #ECE7DF', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.04)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '20px', marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: 52, height: 52, borderRadius: '16px', backgroundColor: isCertified ? '#DCFCE7' : '#FEF3C7', color: isCertified ? '#16A34A' : '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {isCertified ? <Award size={28} /> : <AlertTriangle size={28} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1C1917', lineHeight: 1.2 }}>
                  {attempt.assessmentName || (attempt.skillName ? `${attempt.skillName} Competency Assessment` : 'Human-Centric Skills Assessment')}
                </h1>
                <span style={{
                  padding: '3px 12px', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: 700,
                  backgroundColor: isCertified ? '#DCFCE7' : '#FEF3C7',
                  color: isCertified ? '#15803D' : '#B45309',
                  border: `1px solid ${isCertified ? '#86EFAC' : '#FDE68A'}`
                }}>
                  {isCertified ? '✓ Certified (Passed)' : `⚠ Threshold Not Met (<${CERTIFICATION_THRESHOLD}%)`}
                </span>

                {userAttempts.length > 1 && (
                  <select
                    value={attempt?.id || ''}
                    onChange={(e) => {
                      const match = userAttempts.find(a => a.id === e.target.value);
                      if (match && setActiveAttempt) setActiveAttempt(match);
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: '#8B1528',
                      backgroundColor: '#FAF8F5',
                      border: '1.5px solid #E2D9C8',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {userAttempts.map((att, i) => (
                      <option key={att.id || i} value={att.id}>
                        Switch Scorecard: {att.skillName ? `${att.skillName} (${att.overallScore}%)` : (att.assessmentName || `Attempt #${userAttempts.length - i}`)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <p style={{ color: '#78716C', fontSize: '0.88rem', marginTop: '4px' }}>
                <strong>{attempt?.studentName || currentUser?.name}</strong> ({attempt?.rollNo || currentUser?.rollNo || 'N/A'}) •{' '}
                {new Date(attempt.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {isCertified && (
              <button
                onClick={() => {
                  const certId = attempt?.certificate?.certificateNumber || `MRU-ICCF-${attempt?.rollNo || currentUser?.rollNo || 'GEN'}-${new Date(attempt.timestamp).getFullYear()}`;
                  const verifyUrl = `${window.location.origin}/?verify=${encodeURIComponent(certId)}`;
                  const title = encodeURIComponent(`Institutional Competency Certification (ICCF) - ${levelInfo?.level || 'Proficient'}`);
                  const org = encodeURIComponent('Manav Rachna Educational Institutions');
                  const date = new Date(attempt.timestamp);
                  const url = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${title}&organizationName=${org}&issueYear=${date.getFullYear()}&issueMonth=${date.getMonth() + 1}&certUrl=${encodeURIComponent(verifyUrl)}&certId=${encodeURIComponent(certId)}`;
                  window.open(url, '_blank', 'noopener,noreferrer');
                }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  padding: '9px 16px', borderRadius: '10px',
                  backgroundColor: '#0A66C2', color: '#FFFFFF', fontWeight: 700,
                  fontSize: '0.88rem', border: 'none', cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(10, 102, 194, 0.25)'
                }}
              >
                <ExternalLink size={15} />
                <span>Add to LinkedIn</span>
              </button>
            )}
            <button onClick={() => window.print()} className="btn-secondary" style={{ padding: '9px 18px', fontSize: '0.88rem' }}>
              <Download size={15} /> <span>Export PDF</span>
            </button>
            {isCertified ? (
              <button onClick={() => setView('certificate')} className="btn-primary" style={{ padding: '9px 22px', fontSize: '0.88rem' }}>
                <Award size={15} /> <span>View & Download Certificate</span> <ArrowRight size={15} />
              </button>
            ) : (
              <button onClick={() => setView('assessment')} className="btn-primary" style={{ padding: '9px 22px', fontSize: '0.88rem', backgroundColor: '#D97706' }}>
                <RotateCcw size={15} /> <span>Re-take</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Score Overview ────────────────────────────────────────────── */}
        <div className="mr-card" style={{ padding: '32px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <ScoreGauge score={overallScore} level={levelInfo?.level} size={160} />
            {levelInfo?.marks !== undefined && (
              <span style={{ marginTop: '8px', fontSize: '0.78rem', fontWeight: 700, padding: '2px 10px', borderRadius: '9999px', backgroundColor: levelInfo.bg, color: levelInfo.color }}>
                Performance Marks: {levelInfo.marks} / 4
              </span>
            )}
          </div>
          <div style={{ backgroundColor: '#FAF8F5', borderRadius: '16px', padding: '20px 24px', border: '1px solid #EAE5DC', flex: '1 1 300px', minWidth: 260 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1C1917', marginBottom: '14px', borderBottom: '1px solid #EAE5DC', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Scoring Breakdown</span>
              <span style={{ fontSize: '0.78rem', color: '#8B1528' }}>{levelInfo?.label}</span>
            </div>
            {levelInfo?.descriptor && (
              <p style={{ fontSize: '0.80rem', color: '#57534E', lineHeight: 1.5, marginBottom: '14px', fontStyle: 'italic', backgroundColor: '#FFFFFF', padding: '10px 12px', borderRadius: '10px', border: '1px solid #EAE5DC' }}>
                "{levelInfo.descriptor}"
              </p>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem' }}>
              {[
                { label: 'Evaluated Dimensions', value: attempt.skillName ? `1 Human-Centric Dimension: ${attempt.skillName}` : '15 Human-Centric Skills' },
                { label: 'Time Taken',           value: attempt.timeTakenFormatted || '—' },
                { label: 'Pass Threshold',        value: `${CERTIFICATION_THRESHOLD.toFixed(2)}%`, highlight: '#16A34A' },
                { label: 'Certification Status',  value: isCertified ? 'Passed (Certificate Issued)' : 'Uncertified', highlight: isCertified ? '#16A34A' : '#DC2626' },
                { label: 'Total Items',           value: `${attempt.totalQuestions || '10'}` },
                { label: 'Verification ID',       value: attempt.certificate?.certificateNumber || `MRU-ICCF-${attempt.skillCode ? attempt.skillCode + '-' : ''}${currentUser?.rollNo || attempt?.rollNo || 'GEN'}-${new Date(attempt.timestamp).getFullYear()}`, mono: true },
              ].map(({ label, value, highlight, mono }) => (
                <div key={label} style={label === 'Verification ID' ? { gridColumn: 'span 2' } : {}}>
                  <span style={{ color: '#78716C', display: 'block', fontSize: '0.75rem' }}>{label}</span>
                  <strong style={{ color: highlight || '#1C1917', fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Tab Navigation ────────────────────────────────────────────── */}
        <div style={{ display: 'flex', borderBottom: '1px solid #EAE7E0', marginBottom: '24px', gap: '4px', overflowX: 'auto' }}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                padding: '12px 18px', fontSize: '0.88rem', fontWeight: isActive ? 800 : 600,
                color: isActive ? '#8B1528' : '#78716C',
                borderBottom: isActive ? '3px solid #8B1528' : '3px solid transparent',
                background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s ease'
              }}>
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Tab: All Competency Scores ────────────────────────────────── */}
        {activeTab === 'scores' && (
          <div className="mr-card" style={{ padding: '24px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #EAE7E0', color: '#78716C', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  {[
                    { col: 'name',     label: 'Competency' },
                    { col: 'score',    label: 'Score' },
                    { col: 'level',    label: 'Level' },
                    { col: null,       label: 'Progress' },
                    { col: 'univAvg',  label: 'Benchmark' },
                    { col: 'variance', label: 'Variance' },
                  ].map(({ col, label }) => (
                    <th key={label} style={{ padding: '12px 16px', cursor: col ? 'pointer' : 'default', userSelect: 'none' }}
                      onClick={() => col && toggleSort(col)}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {label}
                        {sortCol === col && <span style={{ fontSize: '0.65rem' }}>{sortDir === 'desc' ? '▼' : '▲'}</span>}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayScores.map(c => {
                  const variance = c.score - (c.univAvg || 72);
                  const isPos = variance >= 0;
                  const lv = c.level || getCompetencyLevel(c.score).level;
                  const barColor = c.score >= 80 ? '#16A34A' : c.score >= 65 ? '#2563EB' : '#EA580C';
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid #F1EFEA', fontSize: '0.88rem' }}>
                      <td style={{ padding: '13px 16px', fontWeight: 700, color: '#1C1917', whiteSpace: 'nowrap' }}>{c.name}</td>
                      <td style={{ padding: '13px 16px', fontWeight: 800, color: '#8B1528' }}>{c.score}%</td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: '6px', fontSize: '0.73rem', fontWeight: 700,
                          backgroundColor: lv === 'L5' ? '#DCFCE7' : lv === 'L4' ? '#DBEAFE' : lv === 'L3' ? '#FEF3C7' : '#FEE2E2',
                          color: lv === 'L5' ? '#15803D' : lv === 'L4' ? '#1D4ED8' : lv === 'L3' ? '#B45309' : '#B91C1C'
                        }}>{lv}</span>
                      </td>
                      <td style={{ padding: '13px 16px', width: 160, minWidth: 120 }}>
                        <AnimatedBar pct={c.score} color={barColor} />
                      </td>
                      <td style={{ padding: '13px 16px', color: '#64748B' }}>{c.univAvg || 72}%</td>
                      <td style={{ padding: '13px 16px', fontWeight: 700, color: isPos ? '#16A34A' : '#DC2626' }}>
                        {isPos ? `+${variance}%` : `${variance}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Tab: Strengths ────────────────────────────────────────────── */}
        {activeTab === 'strengths' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {strengths.map((item, idx) => (
              <div key={item.id} className="mr-card animate-slide-up" style={{ padding: '28px', animationDelay: `${idx * 80}ms` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <span style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#DCFCE7', color: '#15803D', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    #{idx + 1}
                  </span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#15803D' }}>{item.score}%</span>
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1C1917', marginBottom: '8px' }}>{item.name}</h3>
                <AnimatedBar pct={item.score} color="#16A34A" />
                <p style={{ fontSize: '0.82rem', color: '#64748B', lineHeight: 1.5, marginTop: '10px' }}>
                  {item.score >= (item.univAvg || 72)
                    ? `Surpassing institutional benchmark by +${item.score - (item.univAvg || 72)}%.`
                    : `${(item.univAvg || 72) - item.score}% below benchmark. Still a relative strength.`}
                </p>
                <div style={{ marginTop: '12px', fontSize: '0.78rem', fontWeight: 600, color: '#16A34A', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <TrendingUp size={13} /> Level: {getCompetencyLevel(item.score).name}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Tab: Development / Focus Areas ───────────────────────────── */}
        {activeTab === 'dev_areas' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {developmentAreas.map((item, idx) => (
              <div key={item.id} className="mr-card animate-slide-up" style={{ padding: '28px', animationDelay: `${idx * 80}ms` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <span style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#FFEDD5', color: '#C2410C', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    #{idx + 1}
                  </span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#C2410C' }}>{item.score}%</span>
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1C1917', marginBottom: '8px' }}>{item.name}</h3>
                <AnimatedBar pct={item.score} color="#EA580C" />
                <p style={{ fontSize: '0.82rem', color: '#64748B', lineHeight: 1.5, marginTop: '10px' }}>
                  {(item.univAvg || 72) - item.score > 0
                    ? `${(item.univAvg || 72) - item.score}% below university benchmark. Prioritized for growth.`
                    : 'Above benchmark. Maintain and refine this dimension.'}
                </p>
                <button onClick={() => setView('development')} className="btn-secondary" style={{ width: '100%', fontSize: '0.8rem', padding: '8px', marginTop: '14px' }}>
                  View Learning Modules
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Tab: Action Plan (Dynamic recommendations) ────────────────── */}
        {activeTab === 'recommendations' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {recommendations.map((rec, idx) => (
              <div key={idx} className="mr-card animate-slide-up" style={{ padding: '24px 28px', animationDelay: `${idx * 100}ms` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '12px', backgroundColor: rec.tagBg, color: rec.tagColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1rem', flexShrink: 0 }}>
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1C1917' }}>{rec.competency}</h3>
                      <span style={{ padding: '2px 10px', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 700, backgroundColor: rec.tagBg, color: rec.tagColor }}>
                        {rec.priority} Priority
                      </span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#8B1528' }}>Score: {rec.score}%</span>
                      {rec.gap > 0 && <span style={{ fontSize: '0.78rem', color: '#DC2626' }}>Gap: −{rec.gap}% vs. benchmark</span>}
                    </div>
                    <div style={{ height: 6, backgroundColor: '#F1F5F9', borderRadius: '9999px', overflow: 'hidden', marginBottom: '12px' }}>
                      <AnimatedBar pct={rec.score} color={rec.tagColor} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '14px 16px', borderRadius: '12px', backgroundColor: '#FAF8F5', border: '1px solid #ECE7DF' }}>
                      <Lightbulb size={18} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
                      <p style={{ fontSize: '0.88rem', color: '#44403C', lineHeight: 1.6 }}>{rec.action}</p>
                    </div>
                    <div style={{ marginTop: '14px', display: 'flex', gap: '10px' }}>
                      <button onClick={() => setView('development')} className="btn-primary" style={{ fontSize: '0.82rem', padding: '8px 18px' }}>
                        Open Roadmap <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {recommendations.length === 0 && (
              <div className="mr-card" style={{ padding: '40px', textAlign: 'center', color: '#78716C' }}>
                <Sparkles size={32} color="#8B1528" style={{ margin: '0 auto 12px' }} />
                <p>Complete an assessment to generate your personalized action plan.</p>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Attempt History ──────────────────────────────────────── */}
        {activeTab === 'history' && (
          <div className="mr-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1C1917' }}>All Assessment Attempts</h3>
              <button onClick={() => setView('assessment')} className="btn-primary" style={{ fontSize: '0.82rem', padding: '7px 16px' }}>
                Take New Assessment
              </button>
            </div>
            {userAttempts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: '#78716C' }}>No attempts yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {userAttempts.map((att, idx) => {
                  const isCurrent = (activeAttempt?.id || userAttempts[0]?.id) === att.id;
                  const attCertified = (Number(att.overallScore) || 0) >= CERTIFICATION_THRESHOLD;
                  const prevAtt = userAttempts[idx + 1];
                  const delta = prevAtt ? Math.round(Number(att.overallScore)) - Math.round(Number(prevAtt.overallScore)) : null;

                  return (
                    <div key={att.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '16px 20px', borderRadius: '14px',
                      border: isCurrent ? '2px solid #8B1528' : '1px solid #EAE5DC',
                      backgroundColor: isCurrent ? '#FDF2F4' : '#FFFFFF',
                      flexWrap: 'wrap', gap: '12px'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#1C1917' }}>{att.assessmentName}</span>
                          <span style={{ fontSize: '0.73rem', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px', backgroundColor: attCertified ? '#DCFCE7' : '#FEF3C7', color: attCertified ? '#15803D' : '#B45309' }}>
                            {attCertified ? 'Passed' : 'Needs Improvement'}
                          </span>
                          {isCurrent && <span style={{ fontSize: '0.7rem', color: '#8B1528', fontWeight: 700 }}>(Active)</span>}
                          {delta !== null && (
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: delta >= 0 ? '#16A34A' : '#DC2626' }}>
                              {delta >= 0 ? `▲ +${delta}%` : `▼ ${delta}%`}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#78716C', marginTop: '3px' }}>
                          {new Date(att.timestamp).toLocaleString()} • {att.timeTakenFormatted || '—'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: attCertified ? '#16A34A' : '#D97706' }}>{Math.round(Number(att.overallScore))}%</div>
                          <div style={{ fontSize: '0.7rem', color: '#78716C' }}>Composite</div>
                        </div>
                        {!isCurrent && setActiveAttempt && (
                          <button onClick={() => setActiveAttempt(att)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
                            Load
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
