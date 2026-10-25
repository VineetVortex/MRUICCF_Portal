import React from 'react';

export default function Logo({ size = 'normal', show30Years = true, onClick }) {
  const isSmall = size === 'small';

  return (
    <div 
      className="logo-container"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSmall ? '10px' : '16px',
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none'
      }}
    >
      {/* Manav Rachna Tree/Human Icon + Wordmark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isSmall ? '10px' : '14px' }}>
        <img 
          src="/assets/manav_rachna_logo.png" 
          alt="Manav Rachna Emblem" 
          style={{
            width: isSmall ? '38px' : '54px',
            height: isSmall ? '38px' : '54px',
            objectFit: 'contain',
            display: 'block',
            flexShrink: 0
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{
            fontSize: isSmall ? '1.15rem' : '1.45rem',
            fontWeight: 'bold',
            letterSpacing: '0.03em',
            color: '#B9222B',
            lineHeight: 1.05,
            fontFamily: 'Arial, Helvetica, sans-serif',
            display: 'flex',
            alignItems: 'baseline',
            gap: '5px'
          }}>
            <span>MANAV</span>
            <span>RACHNA</span>
          </div>
          <div style={{
            fontSize: isSmall ? '0.68rem' : '0.82rem',
            fontWeight: 'bold',
            color: '#1E7E34',
            letterSpacing: '0.05em',
            marginTop: '2px',
            fontStyle: 'italic',
            lineHeight: 1,
            fontFamily: 'Arial, Helvetica, sans-serif'
          }}>
            vidyanatarikshal
          </div>
        </div>
      </div>

      {show30Years && (
        <>
          <div style={{
            width: '1px',
            height: isSmall ? '24px' : '32px',
            backgroundColor: '#E7E5E4'
          }} />

          {/* 30 Years Emblem */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '2px 8px',
            borderRadius: '6px',
            background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
            border: '1px solid #FDE68A'
          }}>
            <div style={{
              fontSize: isSmall ? '1.1rem' : '1.35rem',
              fontWeight: 900,
              color: '#B45309',
              lineHeight: 1,
              fontFamily: 'var(--font-display, serif)'
            }}>
              30
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              lineHeight: 1
            }}>
              <span style={{
                fontSize: isSmall ? '0.55rem' : '0.62rem',
                fontWeight: 800,
                color: '#92400E',
                textTransform: 'uppercase',
                letterSpacing: '0.06em'
              }}>
                Years
              </span>
              <span style={{
                fontSize: isSmall ? '0.45rem' : '0.52rem',
                color: '#B45309',
                fontWeight: 600,
                whiteSpace: 'nowrap'
              }}>
                1997 - 2027
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
