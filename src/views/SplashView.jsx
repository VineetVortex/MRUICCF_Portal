import React, { useState, useEffect } from 'react';
import Logo from '../components/Logo';
import { ArrowRight } from 'lucide-react';

export default function SplashView({ setView }) {
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        const step = Math.floor(Math.random() * 8) + 4;
        return Math.min(prev + step, 100);
      });
    }, 180);

    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FAF7F2',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative'
    }}>
      {/* Container card matching the middle splash tile */}
      <div style={{
        maxWidth: '560px',
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: '24px',
        padding: '36px 32px',
        boxShadow: '0 20px 40px -10px rgba(139, 21, 40, 0.08)',
        border: '1px solid #ECE7DF',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: '24px'
      }}>
        {/* Logo */}
        <Logo size="normal" show30Years={true} />

        {/* Architectural Campus Sketch */}
        <div style={{
          width: '100%',
          borderRadius: '16px',
          overflow: 'hidden',
          border: '1px solid #EAE5DC',
          backgroundColor: '#FBF9F5'
        }}>
          <img
            src="/assets/mr_campus_sketch.jpg"
            alt="Manav Rachna Campus Sketch"
            style={{
              width: '100%',
              height: '240px',
              objectFit: 'cover',
              filter: 'sepia(0.2) contrast(1.05)'
            }}
          />
        </div>

        {/* Progress Bar & Status */}
        <div style={{ width: '100%', maxWidth: '420px', marginTop: '4px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
            fontSize: '0.88rem',
            color: '#57534E',
            fontWeight: 500
          }}>
            <span>Preparing your experience...</span>
            <span style={{ fontWeight: 700, color: '#8B1528' }}>{progress}%</span>
          </div>

          <div style={{
            width: '100%',
            height: '8px',
            backgroundColor: '#F3EFE9',
            borderRadius: '9999px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              backgroundColor: '#8B1528',
              borderRadius: '9999px',
              transition: 'width 0.2s ease-out'
            }} />
          </div>
        </div>

        {/* Quote */}
        <div style={{
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          color: '#78716C',
          fontSize: '0.95rem'
        }}>
          “Building People. Building a Better Tomorrow.”
        </div>

        {/* Action button if ready or skip */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
          <button
            onClick={() => setView('dashboard')}
            className="btn-primary"
            style={{ padding: '10px 24px', fontSize: '0.9rem' }}
          >
            <span>{progress === 100 ? 'Enter Dashboard' : 'Skip & Enter'}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
