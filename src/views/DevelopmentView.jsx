import React, { useState, useMemo, useEffect } from 'react';
import {
  Target, CheckCircle, ExternalLink, BookOpen, Check, ArrowRight,
  X, FileText, Clock, Video, Award, Sparkles, Zap, TrendingUp,
  RotateCcw, Star
} from 'lucide-react';

/* ── Persist progress per user ──────────────────────────────────────────── */
const PROGRESS_KEY = 'mr_iccf_dev_progress_v1';

function loadProgress(userId) {
  try {
    const all = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
    return all[userId] || {};
  } catch { return {}; }
}

function saveProgress(userId, progress) {
  try {
    const all = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
    all[userId] = progress;
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
  } catch {}
}

/* ── Resource catalogue keyed by competency name ────────────────────────── */
const RESOURCES = {
  'Communication':         [
    { type: 'Video',    title: 'Structured Storytelling',     duration: '18 min', url: '#' },
    { type: 'Exercise', title: 'Active Listening Lab',         duration: '30 min', url: '#' },
    { type: 'Article',  title: 'Clarity Framework — PREP',     duration: '10 min', url: '#' },
  ],
  'Planning & Organizing': [
    { type: 'Template', title: 'SMART Goals Worksheet',        duration: '20 min', url: '#' },
    { type: 'Video',    title: 'OKR Planning in Practice',     duration: '22 min', url: '#' },
    { type: 'Exercise', title: 'Priority Matrix Drill',         duration: '25 min', url: '#' },
  ],
  'Emotional Intelligence':[
    { type: 'Article',  title: '21-Day EQ Challenge',          duration: '15 min', url: '#' },
    { type: 'Video',    title: 'Emotion Regulation Techniques',duration: '20 min', url: '#' },
    { type: 'Exercise', title: 'Trigger Mapping Exercise',      duration: '30 min', url: '#' },
  ],
  'Conflict Resolution':   [
    { type: 'Video',    title: 'DEAR MAN Framework',           duration: '14 min', url: '#' },
    { type: 'Exercise', title: 'De-escalation Role Play',       duration: '40 min', url: '#' },
    { type: 'Article',  title: 'Constructive Mediation Guide',  duration: '12 min', url: '#' },
  ],
  'Resilience': [
    { type: 'Article',  title: 'ABCDE Reframing Model',        duration: '15 min', url: '#' },
    { type: 'Video',    title: 'Building Grit — Angela Duckworth',duration:'18 min',url:'#'},
    { type: 'Exercise', title: 'Setback-to-Strategy Journal',   duration: '30 min', url: '#' },
  ],
};

const DEFAULT_RESOURCES = [
  { type: 'Video',    title: 'Foundational Concepts Micro-Lecture', duration: '15 min', url: '#' },
  { type: 'Exercise', title: 'Scenario Simulation Lab',              duration: '45 min', url: '#' },
  { type: 'Article',  title: 'Best-Practice Reference Guide',        duration: '20 min', url: '#' },
];

function getResources(competencyName) {
  return RESOURCES[competencyName] || DEFAULT_RESOURCES;
}

/* ── Resource type meta ────────────────────────────────────────────────── */
function resourceMeta(type) {
  switch (type) {
    case 'Video':    return { Icon: Video,    color: '#8B1528', bg: '#FDF2F4' };
    case 'Article':  return { Icon: BookOpen, color: '#2563EB', bg: '#EFF6FF' };
    case 'Template': return { Icon: FileText, color: '#0D9488', bg: '#CCFBF1' };
    case 'Exercise': return { Icon: Target,   color: '#D97706', bg: '#FEF3C7' };
    default:         return { Icon: Sparkles, color: '#7C3AED', bg: '#F3E8FF' };
  }
}

export default function DevelopmentView({ setView, currentUser, activeAttempt }) {
  const userId = currentUser?.uid || currentUser?.id || 'guest';

  /* ── Build plans from attempt ─────────────────────────────────────────── */
  const initialPlans = useMemo(() => {
    if (!activeAttempt) return [];
    let areas = [];
    if (activeAttempt.developmentAreas?.length > 0) {
      areas = activeAttempt.developmentAreas.slice(0, 5);
    } else if (activeAttempt.competencyScores?.length > 0) {
      areas = [...activeAttempt.competencyScores]
        .sort((a, b) => a.score - b.score)
        .slice(0, 5)
        .map(c => ({ name: c.name, score: c.score, tip: c.description || '' }));
    }
    if (areas.length === 0) return [];

    return areas.map((area, idx) => {
      const curScore = Math.round(Number(area.score) || 55);
      const targetScore = Math.min(95, Math.max(75, curScore + 22));
      return {
        id: `plan_${idx}`,
        competency: area.name,
        currentScore: curScore,
        targetScore,
        priority: idx === 0 ? 'Critical' : idx === 1 ? 'High' : 'Medium',
        items: [
          { id: `item_${idx}_0`, title: `Foundations of ${area.name}`, type: 'Concept Review', estimatedTime: '25 mins', description: area.tip || 'Study core behavioural principles and real-world workplace scenarios.' },
          { id: `item_${idx}_1`, title: `Scenario Simulation: ${area.name}`, type: 'Interactive Lab', estimatedTime: '45 mins', description: 'Apply high-judgement decision making to a case study under simulated constraints.' },
          { id: `item_${idx}_2`, title: 'Self-Audit & Reflection Journal', type: 'Reflective Log', estimatedTime: '30 mins', description: 'Document two recent projects where you applied these competencies and note areas for iteration.' },
        ]
      };
    });
  }, [activeAttempt]);

  /* ── Persisted completion state ──────────────────────────────────────── */
  const [completed, setCompleted] = useState(() => loadProgress(userId));
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedResource, setSelectedResource] = useState(null); // { competency, type }
  const [expandedPlan, setExpandedPlan] = useState(null);

  useEffect(() => { saveProgress(userId, completed); }, [completed, userId]);

  const toggleItem = (itemId) => {
    setCompleted(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const resetPlan = (plan) => {
    setCompleted(prev => {
      const next = { ...prev };
      plan.items.forEach(i => delete next[i.id]);
      return next;
    });
  };

  /* ── XP system ───────────────────────────────────────────────────────── */
  const totalItems = initialPlans.reduce((acc, p) => acc + p.items.length, 0);
  const completedCount = initialPlans.reduce((acc, p) => acc + p.items.filter(i => completed[i.id]).length, 0);
  const xpPct = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;
  const xpLevel = xpPct >= 80 ? 'Expert' : xpPct >= 50 ? 'Intermediate' : xpPct >= 25 ? 'Developing' : 'Beginner';

  /* ── Filtered plans ──────────────────────────────────────────────────── */
  const filteredPlans = initialPlans.filter(p => {
    const done = p.items.filter(i => completed[i.id]).length;
    if (activeFilter === 'all')       return true;
    if (activeFilter === 'focus')     return p.priority === 'Critical' || p.priority === 'High';
    if (activeFilter === 'progress')  return done > 0 && done < p.items.length;
    if (activeFilter === 'completed') return done === p.items.length;
    return true;
  });

  /* ── Empty state ─────────────────────────────────────────────────────── */
  if (!activeAttempt || initialPlans.length === 0) {
    return (
      <div style={{ padding: '24px 0 60px 0' }} className="animate-fade-in">
        <div className="container">
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '56px 32px', border: '1px solid #ECE7DF', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '20px', backgroundColor: '#FDF2F4', color: '#8B1528', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Target size={36} />
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1C1917', marginBottom: '8px' }}>No Development Roadmap Generated</h3>
            <p style={{ color: '#78716C', maxWidth: '520px', margin: '0 auto 24px', fontSize: '0.95rem', lineHeight: 1.6 }}>
              Complete your first institutional competency assessment to unlock your personalised learning roadmap.
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
    <div style={{ padding: '24px 0 80px 0' }} className="animate-fade-in">
      <div className="container">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1C1917', lineHeight: 1.2 }}>Your Development Plan</h1>
          <p style={{ color: '#78716C', fontSize: '0.92rem', marginTop: '4px' }}>
            Personalised recommendations based on your latest assessment results. Progress is saved automatically.
          </p>
        </div>

        {/* ── XP / Completion Bar ───────────────────────────────────────── */}
        <div className="mr-card" style={{ padding: '22px 28px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ width: 48, height: 48, borderRadius: '14px', backgroundColor: '#FDF2F4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B1528', flexShrink: 0 }}>
            <Star size={26} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px' }}>
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1C1917' }}>
                Roadmap Progress — <span style={{ color: '#8B1528' }}>{xpLevel}</span>
              </span>
              <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#8B1528' }}>{completedCount}/{totalItems} tasks ({xpPct}%)</span>
            </div>
            <div style={{ height: 10, backgroundColor: '#F1EFEA', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{ width: `${xpPct}%`, height: '100%', background: 'linear-gradient(90deg, #8B1528 0%, #D97706 100%)', borderRadius: '9999px', transition: 'width 0.8s ease' }} />
            </div>
          </div>
          {xpPct === 100 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 18px', borderRadius: '9999px', backgroundColor: '#DCFCE7', color: '#15803D', fontWeight: 700, fontSize: '0.88rem', border: '1px solid #86EFAC' }}>
              <Award size={16} /> Roadmap Complete!
            </div>
          )}
        </div>

        {/* ── Filter Pills ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {[
            { id: 'all',       label: `All (${initialPlans.length})` },
            { id: 'focus',     label: 'Critical / High Priority' },
            { id: 'progress',  label: 'In Progress' },
            { id: 'completed', label: 'Completed' },
          ].map(f => {
            const isActive = activeFilter === f.id;
            return (
              <button key={f.id} onClick={() => setActiveFilter(f.id)} style={{
                padding: '7px 18px', borderRadius: '9999px', fontSize: '0.85rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#8B1528' : '#57534E',
                backgroundColor: isActive ? '#FDF2F4' : '#FFFFFF',
                border: isActive ? '1px solid #F8D7DA' : '1px solid #EAE5DC',
                cursor: 'pointer', transition: 'all 0.15s ease'
              }}>
                {f.label}
              </button>
            );
          })}
        </div>

        {/* ── Plan Cards ────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredPlans.map((plan, planIdx) => {
            const done = plan.items.filter(i => completed[i.id]).length;
            const progress = Math.round((done / plan.items.length) * 100);
            const isExpanded = expandedPlan === plan.id;

            const priorityColors = {
              Critical: { color: '#B91C1C', bg: '#FEE2E2' },
              High:     { color: '#C2410C', bg: '#FFEDD5' },
              Medium:   { color: '#B45309', bg: '#FEF3C7' },
            };
            const pc = priorityColors[plan.priority] || priorityColors.Medium;

            return (
              <div key={plan.id} className="mr-card animate-slide-up" style={{ padding: '24px 28px', animationDelay: `${planIdx * 80}ms` }}>
                {/* Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                    <div style={{ width: 42, height: 42, borderRadius: '12px', backgroundColor: pc.bg, color: pc.color, fontWeight: 800, fontSize: '1.15rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {planIdx + 1}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1C1917' }}>{plan.competency}</h3>
                        <span style={{ padding: '2px 10px', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 700, backgroundColor: pc.bg, color: pc.color }}>
                          {plan.priority} Priority
                        </span>
                        {done === plan.items.length && (
                          <span style={{ padding: '2px 10px', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 700, backgroundColor: '#DCFCE7', color: '#15803D', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Check size={11} /> Complete
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#78716C', marginTop: '3px' }}>
                        Current: <strong style={{ color: pc.color }}>{plan.currentScore}%</strong>
                        &nbsp;→&nbsp;Target: <strong style={{ color: '#16A34A' }}>{plan.targetScore}%</strong>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button onClick={() => resetPlan(plan)} title="Reset progress for this competency" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '4px' }}>
                      <RotateCcw size={15} />
                    </button>
                    <button onClick={() => setSelectedResource({ competency: plan.competency })} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
                      Resources
                    </button>
                    <button onClick={() => setExpandedPlan(isExpanded ? null : plan.id)} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem', color: '#8B1528' }}>
                      {isExpanded ? 'Collapse' : 'Expand'}
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', marginBottom: '5px' }}>
                    <span>Roadmap Progress</span>
                    <span>{done}/{plan.items.length} tasks done</span>
                  </div>
                  <div style={{ height: 7, backgroundColor: '#F1EFEA', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ width: `${progress}%`, height: '100%', backgroundColor: progress === 100 ? '#16A34A' : '#8B1528', borderRadius: '9999px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>

                {/* Task items (always visible) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {plan.items.map(item => {
                    const isDone = !!completed[item.id];
                    return (
                      <div key={item.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 16px', borderRadius: '12px',
                        backgroundColor: isDone ? '#F0FDF4' : '#FAF8F5',
                        border: isDone ? '1px solid #86EFAC' : '1px solid #ECE7DF',
                        flexWrap: 'wrap', gap: '10px',
                        transition: 'all 0.2s ease'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <button type="button" onClick={() => toggleItem(item.id)} style={{
                            width: 24, height: 24, borderRadius: '7px',
                            border: isDone ? '2px solid #16A34A' : '2px solid #CBD5E1',
                            backgroundColor: isDone ? '#16A34A' : '#FFFFFF',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', padding: 0, flexShrink: 0,
                            transition: 'all 0.15s ease'
                          }}>
                            {isDone && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                          </button>
                          <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: isDone ? '#94A3B8' : '#1C1917', textDecoration: isDone ? 'line-through' : 'none' }}>
                              {item.title}
                            </div>
                            {isExpanded && (
                              <div style={{ fontSize: '0.78rem', color: '#78716C', marginTop: '2px', maxWidth: 500 }}>
                                {item.description}
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748B', backgroundColor: '#F1EFEA', padding: '3px 8px', borderRadius: '6px' }}>
                            {item.estimatedTime}
                          </span>
                          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#8B1528', backgroundColor: '#FDF2F4', padding: '3px 8px', borderRadius: '6px' }}>
                            {item.type}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {filteredPlans.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#78716C', backgroundColor: '#FFFFFF', borderRadius: '20px', border: '1px solid #ECE7DF' }}>
              No plans match the selected filter.
            </div>
          )}
        </div>
      </div>

      {/* ── Resources Modal ──────────────────────────────────────────────── */}
      {selectedResource && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' }}>
          <div className="animate-pop" style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', maxWidth: '520px', width: '100%', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', position: 'relative', maxHeight: '85vh', overflowY: 'auto' }}>
            <button onClick={() => setSelectedResource(null)} style={{ position: 'absolute', top: 20, right: 20, color: '#9CA3AF', border: 'none', background: 'transparent', cursor: 'pointer' }}>
              <X size={20} />
            </button>

            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8B1528', textTransform: 'uppercase', marginBottom: '6px' }}>
              {selectedResource.competency} • Learning Resources
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1C1917', marginBottom: '20px' }}>
              Curated Materials
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {getResources(selectedResource.competency).map((res, i) => {
                const { Icon, color, bg } = resourceMeta(res.type);
                return (
                  <a key={i} href={res.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '14px', backgroundColor: '#FAF8F5', border: '1px solid #ECE7DF', cursor: 'pointer', transition: 'all 0.15s ease' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = '#8B1528'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = '#ECE7DF'}>
                      <div style={{ width: 40, height: 40, borderRadius: '12px', backgroundColor: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={18} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1C1917' }}>{res.title}</div>
                        <div style={{ fontSize: '0.75rem', color: '#78716C', marginTop: '2px', display: 'flex', gap: '10px' }}>
                          <span>{res.type}</span>
                          <span>•</span>
                          <span>{res.duration}</span>
                        </div>
                      </div>
                      <ExternalLink size={15} color="#9CA3AF" />
                    </div>
                  </a>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedResource(null)} className="btn-primary" style={{ padding: '10px 24px' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
