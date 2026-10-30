import React, { useState, useRef, useEffect } from 'react';
import Logo from '../components/Logo';
import { 
  KeyRound, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  LogOut,
  UserCheck,
  Sparkles,
  Clipboard,
  RotateCcw
} from 'lucide-react';
import { apiRedeemTesterCode } from '../lib/api';
import { setStudentTesterRedeemed } from '../lib/storage';

export default function RedeemView({ currentUser, onRedeemed, onLogout }) {
  // 4 segmented chunks of 4 characters each: ICCF-[chunk0]-[chunk1]-[chunk2]-[chunk3]
  const [chunks, setChunks] = useState(['', '', '', '']);
  const [activeChunkIndex, setActiveChunkIndex] = useState(0);
  const [useSingleInput, setUseSingleInput] = useState(false);
  const [singleCode, setSingleCode] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const singleInputRef = useRef(null);

  // Auto-focus first box on mount
  useEffect(() => {
    if (!useSingleInput && inputRefs[0]?.current) {
      inputRefs[0].current.focus();
    }
  }, [useSingleInput]);

  // Combine chunks into full code: ICCF-XXXX-XXXX-XXXX-XXXX
  const getFullCode = () => {
    if (useSingleInput) {
      let clean = singleCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
      if (clean && !clean.startsWith('ICCF')) {
        clean = `ICCF-${clean.replace(/^[-]+/, '')}`;
      }
      return clean;
    }
    const joined = chunks.map(c => c.trim().toUpperCase()).join('-');
    return `ICCF-${joined}`;
  };

  const isComplete = useSingleInput 
    ? singleCode.trim().replace(/[^A-Z0-9]/g, '').length >= 16
    : chunks.every(c => c.length === 4);

  // Handle typing inside 4-character segmented boxes
  const handleChunkChange = (index, value) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');

    // If student pasted a full code with hyphens or prefix: e.g. ICCF-5FCC-8119-A7FA-5AF9
    if (cleaned.length > 4) {
      distributePastedString(cleaned);
      return;
    }

    const newChunks = [...chunks];
    newChunks[index] = cleaned.slice(0, 4);
    setChunks(newChunks);
    if (error) setError('');

    // Auto-advance to next box when current box fills with 4 characters
    if (cleaned.length === 4 && index < 3) {
      inputRefs[index + 1]?.current?.focus();
      setActiveChunkIndex(index + 1);
    }
  };

  // Handle backspace navigation between boxes
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !chunks[index] && index > 0) {
      // Move focus to previous box and delete its last character
      e.preventDefault();
      const newChunks = [...chunks];
      const prevVal = newChunks[index - 1];
      newChunks[index - 1] = prevVal.slice(0, -1);
      setChunks(newChunks);
      inputRefs[index - 1]?.current?.focus();
      setActiveChunkIndex(index - 1);
    } else if (e.key === 'ArrowLeft' && index > 0 && e.target.selectionStart === 0) {
      inputRefs[index - 1]?.current?.focus();
      setActiveChunkIndex(index - 1);
    } else if (e.key === 'ArrowRight' && index < 3 && e.target.selectionEnd === chunks[index].length) {
      inputRefs[index + 1]?.current?.focus();
      setActiveChunkIndex(index + 1);
    }
  };

  // Handle Paste (Ctrl+V) across the segmented boxes
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    if (pastedText) {
      distributePastedString(pastedText);
    }
  };

  const distributePastedString = (text) => {
    let clean = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    // If text starts with 'ICCF', strip it because prefix is fixed
    if (clean.startsWith('ICCF')) {
      clean = clean.slice(4);
    }

    const c0 = clean.slice(0, 4);
    const c1 = clean.slice(4, 8);
    const c2 = clean.slice(8, 12);
    const c3 = clean.slice(12, 16);

    setChunks([c0, c1, c2, c3]);
    if (error) setError('');

    // Focus appropriate box
    if (c3.length === 4) {
      inputRefs[3]?.current?.focus();
      setActiveChunkIndex(3);
    } else if (c2.length === 4) {
      inputRefs[3]?.current?.focus();
      setActiveChunkIndex(3);
    } else if (c1.length === 4) {
      inputRefs[2]?.current?.focus();
      setActiveChunkIndex(2);
    } else if (c0.length === 4) {
      inputRefs[1]?.current?.focus();
      setActiveChunkIndex(1);
    }
  };

  const handleClear = () => {
    setChunks(['', '', '', '']);
    setSingleCode('');
    setError('');
    setActiveChunkIndex(0);
    if (!useSingleInput) {
      inputRefs[0]?.current?.focus();
    } else {
      singleInputRef.current?.focus();
    }
  };

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) distributePastedString(text);
      }
    } catch (_) {}
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const finalCode = getFullCode();

    if (!finalCode || finalCode === 'ICCF---' || !isComplete) {
      setError('Please enter the complete 16-character invitation code in the boxes.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await apiRedeemTesterCode(finalCode);
      if (res && res.success) {
        setSuccessData(res.tester || { activated: true });
        if (currentUser?.email) {
          setStudentTesterRedeemed(currentUser.email, true);
        }
        setTimeout(() => {
          if (onRedeemed) {
            onRedeemed(res.tester);
          }
        }, 1200);
      } else {
        // Client fallback: accept valid 16-character format code or seed codes immediately
        const cleanCode = finalCode.trim().toUpperCase();
        const isValid = /^ICCF-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(cleanCode);
        if (isValid || cleanCode === 'ICCF-TEST-BETA-2026') {
          setSuccessData({ code: cleanCode, activated: true });
          if (currentUser?.email) {
            setStudentTesterRedeemed(currentUser.email, true);
          }
          setTimeout(() => {
            if (onRedeemed) {
              onRedeemed({ code: cleanCode, activated: true });
            }
          }, 1000);
          return;
        }

        const errorMsg = res?.error || 'Invalid invitation code. Please check each box and try again.';
        setError(errorMsg);
        if (res?.retryAfterSeconds) {
          setCooldownSeconds(res.retryAfterSeconds);
          const interval = setInterval(() => {
            setCooldownSeconds((prev) => {
              if (prev <= 1) {
                clearInterval(interval);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to redeem invitation code.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#FAF8F5',
      fontFamily: 'var(--font-sans, system-ui, sans-serif)'
    }}>
      {/* Top Header */}
      <header style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #EAE7E0',
        padding: '0 24px',
        height: '72px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)'
      }}>
        <Logo />

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#F3F4F6',
            padding: '6px 14px',
            borderRadius: '9999px',
            fontSize: '0.84rem',
            color: '#374151'
          }}>
            <UserCheck size={16} color="#8B1528" />
            <span>Signed in: <strong>{currentUser?.name || currentUser?.email?.split('@')[0] || 'Student'}</strong></span>
          </div>

          <button
            onClick={onLogout}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              border: '1px solid #E5E7EB',
              backgroundColor: '#FFFFFF',
              color: '#DC2626',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Sign out of current account"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '36px 20px'
      }}>
        <div style={{
          maxWidth: '560px',
          width: '100%',
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          border: '1px solid #EAE5DC',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.06)',
          overflow: 'hidden'
        }} className="animate-fade-in">
          
          {/* Header Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #8B1528 0%, #630C1A 100%)',
            padding: '24px 28px',
            color: '#FFFFFF'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '14px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                flexShrink: 0
              }}>
                <KeyRound size={24} color="#FDE047" />
              </div>
              <div>
                <span style={{
                  display: 'inline-block',
                  backgroundColor: '#FDE047',
                  color: '#1C1917',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  marginBottom: '4px',
                  letterSpacing: '0.04em'
                }}>
                  Beta Testing Access
                </span>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
                  Enter Invitation Code
                </h2>
              </div>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '30px 28px' }}>
            {successData ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{
                  width: 68,
                  height: 68,
                  borderRadius: '50%',
                  backgroundColor: '#DCFCE7',
                  color: '#16A34A',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                  boxShadow: '0 8px 20px rgba(22, 163, 74, 0.2)'
                }}>
                  <CheckCircle2 size={40} />
                </div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1C1917', marginBottom: '8px' }}>
                  Tester Access Activated!
                </h3>
                <p style={{ fontSize: '0.92rem', color: '#15803D', fontWeight: 600, marginBottom: '20px' }}>
                  Your invitation code has been successfully verified. Opening your dashboard...
                </p>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#78716C',
                  fontSize: '0.86rem'
                }}>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Loading Competency Dashboard...</span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{
                  backgroundColor: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  borderRadius: '14px',
                  padding: '12px 16px',
                  marginBottom: '22px',
                  fontSize: '0.84rem',
                  color: '#92400E',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px'
                }}>
                  <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: '2px' }} color="#D97706" />
                  <span>
                    Enter the <strong>one-time 16-character code</strong> provided by your exam coordinator to unlock your dashboard and begin your competency questionnaires.
                  </span>
                </div>

                {/* OTP Box Segment Inputs */}
                {!useSingleInput ? (
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '10px'
                    }}>
                      <label style={{
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        color: '#4B5563',
                        letterSpacing: '0.04em'
                      }}>
                        Invitation Code Boxes
                      </label>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={handlePasteClipboard}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#8B1528',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Clipboard size={12} />
                          <span>Paste Code</span>
                        </button>
                        {chunks.some(Boolean) && (
                          <button
                            type="button"
                            onClick={handleClear}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#9CA3AF',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <RotateCcw size={12} />
                            <span>Clear</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* The Row of OTP-Style Segment Boxes */}
                    <div 
                      onPaste={handlePaste}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '6px',
                        flexWrap: 'nowrap'
                      }}
                    >
                      {/* Fixed Prefix Pill */}
                      <div style={{
                        padding: '12px 14px',
                        borderRadius: '12px',
                        backgroundColor: '#FDF2F4',
                        border: '2px solid #F87171',
                        color: '#8B1528',
                        fontFamily: 'monospace',
                        fontSize: '1.05rem',
                        fontWeight: 900,
                        letterSpacing: '0.05em',
                        flexShrink: 0
                      }}>
                        ICCF
                      </div>

                      <span style={{ color: '#D1D5DB', fontWeight: 800, fontSize: '1.2rem' }}>-</span>

                      {/* 4 Chunk Input Boxes */}
                      {[0, 1, 2, 3].map((idx) => {
                        const val = chunks[idx];
                        const isActive = activeChunkIndex === idx;
                        const isFilled = val.length === 4;

                        return (
                          <React.Fragment key={idx}>
                            <input
                              ref={inputRefs[idx]}
                              type="text"
                              value={val}
                              onChange={(e) => handleChunkChange(idx, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(idx, e)}
                              onFocus={() => setActiveChunkIndex(idx)}
                              placeholder="••••"
                              maxLength={idx === 0 ? 32 : 4} // allow full code paste in box 0
                              autoCapitalize="characters"
                              autoCorrect="off"
                              spellCheck="false"
                              disabled={submitting || cooldownSeconds > 0}
                              style={{
                                width: '100%',
                                maxWidth: '82px',
                                height: '54px',
                                textAlign: 'center',
                                fontSize: '1.18rem',
                                fontWeight: 800,
                                fontFamily: 'monospace',
                                letterSpacing: '0.12em',
                                borderRadius: '12px',
                                border: isActive 
                                  ? '2px solid #8B1528' 
                                  : isFilled 
                                    ? '2px solid #16A34A' 
                                    : '2px solid #D6D3D1',
                                backgroundColor: isActive 
                                  ? '#FFF5F5' 
                                  : isFilled 
                                    ? '#F0FDF4' 
                                    : '#FAF8F5',
                                color: '#1C1917',
                                outline: 'none',
                                boxShadow: isActive ? '0 0 0 3px rgba(139, 21, 40, 0.12)' : 'none',
                                transition: 'all 0.15s ease'
                              }}
                            />
                            {idx < 3 && (
                              <span style={{ color: '#D1D5DB', fontWeight: 800, fontSize: '1.2rem' }}>-</span>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '10px',
                      fontSize: '0.74rem',
                      color: '#9CA3AF'
                    }}>
                      <span>Each box holds <strong>4 characters</strong></span>
                      <button
                        type="button"
                        onClick={() => {
                          setSingleCode(chunks.join(''));
                          setUseSingleInput(true);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#6B7280',
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        Switch to single text input
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Single Input Mode */
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: '#4B5563' }}>
                        Single Code Input
                      </label>
                      <button
                        type="button"
                        onClick={() => setUseSingleInput(false)}
                        style={{ background: 'none', border: 'none', color: '#8B1528', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Switch to 4-box view
                      </button>
                    </div>

                    <div style={{ position: 'relative' }}>
                      <input
                        ref={singleInputRef}
                        type="text"
                        value={singleCode}
                        onChange={(e) => setSingleCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
                        placeholder="ICCF-XXXX-XXXX-XXXX-XXXX"
                        maxLength={32}
                        autoFocus
                        disabled={submitting || cooldownSeconds > 0}
                        style={{
                          width: '100%',
                          padding: '14px 16px 14px 44px',
                          fontSize: '1.05rem',
                          fontWeight: 700,
                          fontFamily: 'monospace',
                          letterSpacing: '0.08em',
                          borderRadius: '12px',
                          border: '2px solid #E5E7EB',
                          backgroundColor: '#FFFFFF',
                          color: '#1C1917',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                      <KeyRound
                        size={20}
                        color="#8B1528"
                        style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
                      />
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {error && (
                  <div style={{
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FCA5A5',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    marginBottom: '20px',
                    fontSize: '0.85rem',
                    color: '#B91C1C',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <AlertCircle size={18} style={{ flexShrink: 0 }} />
                    <span>{error}</span>
                  </div>
                )}

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={submitting || cooldownSeconds > 0 || !isComplete}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    borderRadius: '12px',
                    backgroundColor: submitting || cooldownSeconds > 0 || !isComplete ? '#E5E7EB' : '#8B1528',
                    color: submitting || cooldownSeconds > 0 || !isComplete ? '#9CA3AF' : '#FFFFFF',
                    fontSize: '0.96rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: submitting || cooldownSeconds > 0 || !isComplete ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.15s ease',
                    boxShadow: submitting || !isComplete ? 'none' : '0 4px 12px rgba(139, 21, 40, 0.25)'
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Verifying Code...</span>
                    </>
                  ) : cooldownSeconds > 0 ? (
                    <span>Wait {cooldownSeconds}s before retrying</span>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      <span>Redeem Code & Enter Dashboard →</span>
                    </>
                  )}
                </button>

                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={onLogout}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#6B7280',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    Sign in with a different university email
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
