import React, { useEffect, useState } from 'react';
import { ShieldCheck, AlertTriangle, Sparkles } from 'lucide-react';
import { CERTIFICATION_THRESHOLD, getCompetencyLevel } from '../lib/scoring';

export default function ScoreGauge({ score = 78, level, size = 150 }) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    let start = null;
    const duration = 1000;
    const target = Math.min(100, Math.max(0, Number(score) || 0));

    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(eased * target));
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }, [score]);

  const levelInfo = level ? { label: level } : getCompetencyLevel(score);
  const isCertified = score >= CERTIFICATION_THRESHOLD;

  // Dynamic color palette based on performance tier
  const getTheme = () => {
    if (score >= 85) {
      return {
        start: '#059669',
        end: '#10B981',
        text: '#065F46',
        badgeBg: '#059669',
        badgeText: '#FFFFFF',
        statusColor: '#059669',
        statusText: 'EXEMPLARY CERTIFIED',
        desc: 'Exceptional proficiency across human-centric skills and institutional benchmarks.'
      };
    }
    if (score >= 70) {
      return {
        start: '#0D9488',
        end: '#14B8A6',
        text: '#0F766E',
        badgeBg: '#0D9488',
        badgeText: '#FFFFFF',
        statusColor: '#0F766E',
        statusText: 'CERTIFIED PROFICIENT',
        desc: 'Strong competency demonstrated across core behavioral dimensions.'
      };
    }
    if (score >= CERTIFICATION_THRESHOLD) {
      return {
        start: '#2563EB',
        end: '#3B82F6',
        text: '#1D4ED8',
        badgeBg: '#2563EB',
        badgeText: '#FFFFFF',
        statusColor: '#2563EB',
        statusText: 'ICCF CERTIFIED',
        desc: 'Meets official institutional certification criteria with room for advanced mastery.'
      };
    }
    if (score >= 40) {
      return {
        start: '#D97706',
        end: '#F59E0B',
        text: '#B45309',
        badgeBg: '#FEF3C7',
        badgeText: '#92400E',
        statusColor: '#D97706',
        statusText: 'DEVELOPMENT IN PROGRESS',
        desc: 'Below institutional threshold (55%). Complete targeted roadmaps to re-attempt.'
      };
    }
    return {
      start: '#DC2626',
      end: '#EF4444',
      text: '#B91C1C',
      badgeBg: '#FEE2E2',
      badgeText: '#991B1B',
      statusColor: '#DC2626',
      statusText: 'CRITICAL GROWTH NEEDED',
      desc: 'Immediate skill development required. Follow step-by-step learning modules.'
    };
  };

  const theme = getTheme();
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
      {/* Circular Animated Gauge */}
      <div style={{ position: 'relative', width: `${size}px`, height: `${size}px`, flexShrink: 0 }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background circle track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#F1F5F9"
            strokeWidth={strokeWidth}
          />
          {/* Active score gradient ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#scoreGradient-${score})`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.2s linear' }}
          />
          <defs>
            <linearGradient id={`scoreGradient-${score}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={theme.start} />
              <stop offset="100%" stopColor={theme.end} />
            </linearGradient>
          </defs>
        </svg>

        {/* Center Score Text */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1
        }}>
          <span style={{
            fontSize: size > 130 ? '2.5rem' : '2rem',
            fontWeight: 800,
            color: theme.text,
            letterSpacing: '-0.02em',
            fontFamily: 'var(--font-sans)'
          }}>
            {animatedScore}%
          </span>
          <span style={{ fontSize: '0.68rem', color: '#94A3B8', fontWeight: 600, marginTop: '2px' }}>
            Composite
          </span>
        </div>
      </div>

      {/* Description & Badge */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Performance Level
        </div>

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          backgroundColor: theme.badgeBg,
          color: theme.badgeText,
          borderRadius: '9999px',
          fontWeight: 700,
          fontSize: '0.92rem',
          boxShadow: isCertified ? '0 4px 12px rgba(0, 0, 0, 0.08)' : 'none',
          width: 'fit-content'
        }}>
          {isCertified ? <Sparkles size={14} /> : <AlertTriangle size={14} />}
          <span>{levelInfo.label || levelInfo.level || 'Evaluated'}</span>
        </div>

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          color: theme.statusColor,
          fontWeight: 800,
          fontSize: '0.85rem',
          letterSpacing: '0.03em',
          marginTop: '2px'
        }}>
          {isCertified ? <ShieldCheck size={18} /> : <AlertTriangle size={18} />}
          <span>{theme.statusText}</span>
        </div>

        <p style={{ fontSize: '0.85rem', color: '#64748B', maxWidth: '300px', lineHeight: 1.5, margin: 0 }}>
          {theme.desc}
        </p>
      </div>
    </div>
  );
}
