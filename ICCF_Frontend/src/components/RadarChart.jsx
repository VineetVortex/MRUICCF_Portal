import React, { useState } from 'react';
import { COMPETENCIES_DATA } from '../data/assessmentData';

export default function RadarChart({ data, size = 420 }) {
  const [hoveredSkill, setHoveredSkill] = useState(null);

  // Defensive normalization: radar chart requires full polygon dimensions (15 competencies)
  let chartData = data;
  if (!chartData || chartData.length < 3) {
    const scoreMap = {};
    if (Array.isArray(chartData)) {
      chartData.forEach(d => {
        if (d) scoreMap[d.id || d.name] = d.score;
      });
    }
    chartData = COMPETENCIES_DATA.map(c => ({
      id: c.id,
      name: c.name,
      univAvg: c.univAvg || 72,
      score: scoreMap[c.id] ?? (scoreMap[c.name] ?? 0)
    }));
  }

  const totalPoints = chartData.length;
  const center = size / 2;
  const radius = size * 0.36; // leave room for text labels
  const levels = [0.2, 0.4, 0.6, 0.8, 1.0];

  const getCoordinates = (value, index, maxVal = 100) => {
    const angle = (Math.PI * 2 / totalPoints) * index - Math.PI / 2;
    const r = (value / maxVal) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y, angle };
  };

  // Generate grid polygons
  const gridPolygons = levels.map((lvl) => {
    return chartData.map((_, i) => {
      const { x, y } = getCoordinates(lvl * 100, i);
      return `${x},${y}`;
    }).join(' ');
  });

  // Generate Student Polygon
  const studentPoints = chartData.map((item, i) => {
    const { x, y } = getCoordinates(item.score, i);
    return `${x},${y}`;
  }).join(' ');

  // Generate University Average Polygon
  const univPoints = chartData.map((item, i) => {
    const { x, y } = getCoordinates(item.univAvg || 70, i);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: `${size}px`, margin: '0 auto' }}>
      <svg 
        viewBox={`0 0 ${size} ${size}`} 
        style={{ width: '100%', height: 'auto', overflow: 'visible' }}
      >
        {/* Background Grid Circles / Polygons */}
        {gridPolygons.map((poly, idx) => (
          <polygon
            key={`grid-${idx}`}
            points={poly}
            fill={idx % 2 === 0 ? 'rgba(0, 0, 0, 0.015)' : 'none'}
            stroke="#E2E8F0"
            strokeWidth="1"
            strokeDasharray={idx === levels.length - 1 ? 'none' : '3 3'}
          />
        ))}

        {/* Axis spokes */}
        {chartData.map((item, i) => {
          const { x, y } = getCoordinates(100, i);
          return (
            <line
              key={`axis-${i}`}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="#E2E8F0"
              strokeWidth="1"
            />
          );
        })}

        {/* University Average Polygon (Cyan / Blue) */}
        <polygon
          points={univPoints}
          fill="rgba(56, 189, 248, 0.22)"
          stroke="#0284C7"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Student Score Polygon (Crimson / Red) */}
        <polygon
          points={studentPoints}
          fill="rgba(220, 38, 38, 0.25)"
          stroke="#DC2626"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Interactive Dots for Student */}
        {chartData.map((item, i) => {
          const { x, y } = getCoordinates(item.score, i);
          const isHovered = hoveredSkill?.name === item.name;
          return (
            <g 
              key={`pt-${i}`}
              onMouseEnter={() => setHoveredSkill(item)}
              onMouseLeave={() => setHoveredSkill(null)}
              style={{ cursor: 'pointer' }}
            >
              <circle
                cx={x}
                cy={y}
                r={isHovered ? 7 : 4.5}
                fill="#DC2626"
                stroke="#FFFFFF"
                strokeWidth="2"
                style={{ transition: 'all 0.15s ease' }}
              />
              {/* Invisible larger hit target */}
              <circle cx={x} cy={y} r="14" fill="transparent" />
            </g>
          );
        })}

        {/* Axis Labels */}
        {chartData.map((item, i) => {
          const angle = (Math.PI * 2 / totalPoints) * i - Math.PI / 2;
          const labelDist = radius + 22;
          const lx = center + labelDist * Math.cos(angle);
          const ly = center + labelDist * Math.sin(angle);
          
          let anchor = 'middle';
          if (Math.cos(angle) > 0.3) anchor = 'start';
          if (Math.cos(angle) < -0.3) anchor = 'end';

          // Shorten labels for clean display around the circle
          let shortName = item.name;
          if (shortName.length > 15) {
            shortName = shortName.split('&')[0].trim();
          }

          const isHovered = hoveredSkill?.name === item.name;

          return (
            <text
              key={`lbl-${i}`}
              x={lx}
              y={ly + 4}
              textAnchor={anchor}
              fontSize="10"
              fontWeight={isHovered ? "700" : "500"}
              fill={isHovered ? "#8B1528" : "#475569"}
              style={{ 
                cursor: 'pointer', 
                transition: 'all 0.15s ease',
                fontFamily: 'var(--font-sans)'
              }}
              onMouseEnter={() => setHoveredSkill(item)}
              onMouseLeave={() => setHoveredSkill(null)}
            >
              {shortName}
            </text>
          );
        })}
      </svg>

      {/* Hover Tooltip Card */}
      {hoveredSkill && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(28, 25, 23, 0.92)',
          color: '#FFFFFF',
          padding: '8px 14px',
          borderRadius: '10px',
          fontSize: '0.8rem',
          pointerEvents: 'none',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          zIndex: 10,
          textAlign: 'center',
          backdropFilter: 'blur(4px)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ fontWeight: 700, marginBottom: '2px', color: '#FED7AA' }}>
            {hoveredSkill.name}
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <span>Your: <strong style={{ color: '#F87171' }}>{hoveredSkill.score}%</strong></span>
            <span>Avg: <strong style={{ color: '#38BDF8' }}>{hoveredSkill.univAvg || 70}%</strong></span>
          </div>
        </div>
      )}

      {/* Legend below chart */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        marginTop: '8px',
        fontSize: '0.8rem',
        fontWeight: 600
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            display: 'inline-block',
            width: '14px',
            height: '3px',
            backgroundColor: '#DC2626',
            borderRadius: '2px'
          }} />
          <span style={{ color: '#DC2626' }}>Your Score</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            display: 'inline-block',
            width: '14px',
            height: '3px',
            backgroundColor: '#0284C7',
            borderRadius: '2px'
          }} />
          <span style={{ color: '#0284C7' }}>University Average</span>
        </div>
      </div>
    </div>
  );
}
