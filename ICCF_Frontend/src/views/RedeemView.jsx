import React, { useState } from 'react';
import Logo from '../components/Logo';
import { 
  KeyRound, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  LogOut,
  UserCheck,
  Sparkles
} from 'lucide-react';
import { apiRedeemTesterCode } from '../lib/api';
import { setStudentTesterRedeemed } from '../lib/storage';

export default function RedeemView({ currentUser, onRedeemed, onLogout }) {
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const handleCodeChange = (e) => {
    // Auto-uppercase and clean whitespace / hyphens format
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    setCode(val);
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanCode = code.trim();
    if (!cleanCode) {
      setError('Please enter your one-time tester invitation code.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await apiRedeemTesterCode(cleanCode);
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
        const errorMsg = res?.error || 'Invalid invitation code. Please check and try again.';
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
          maxWidth: '520px',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(255, 255, 255, 0.25)'
              }}>
                <KeyRound size={22} color="#FDE047" />
              </div>
              <div>
                <span style={{
                  display: 'inline-block',
                  backgroundColor: '#FDE047',
                  color: '#1C1917',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  marginBottom: '4px'
                }}>
                  Beta Testing Access
                </span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
                  Redeem Invitation Code
                </h2>
              </div>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '28px' }}>
            {successData ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  backgroundColor: '#DCFCE7',
                  color: '#16A34A',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px'
                }}>
                  <CheckCircle2 size={36} />
                </div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1C1917', marginBottom: '8px' }}>
                  Tester Access Activated!
                </h3>
                <p style={{ fontSize: '0.9rem', color: '#65A30D', fontWeight: 600, marginBottom: '20px' }}>
                  Your invitation code has been successfully verified. Opening your dashboard...
                </p>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#78716C',
                  fontSize: '0.84rem'
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
                  borderRadius: '12px',
                  padding: '12px 16px',
                  marginBottom: '20px',
                  fontSize: '0.84rem',
                  color: '#92400E',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px'
                }}>
                  <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: '2px' }} color="#D97706" />
                  <span>
                    To access the examination dashboard and questionnaires, please enter the <strong>single-use invitation code</strong> provided by your exam coordinator or department lead.
                  </span>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#4B5563',
                    marginBottom: '8px',
                    letterSpacing: '0.04em'
                  }}>
                    One-Time Invitation Code
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={code}
                      onChange={handleCodeChange}
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
                        border: error ? '2px solid #EF4444' : '2px solid #E5E7EB',
                        backgroundColor: '#FFFFFF',
                        color: '#1C1917',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <KeyRound
                      size={20}
                      color="#8B1528"
                      style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)'
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '0.74rem', color: '#9CA3AF', display: 'block', marginTop: '6px' }}>
                    Standard format: <strong style={{ color: '#6B7280' }}>ICCF-XXXX-XXXX-XXXX-XXXX</strong> (Case-insensitive)
                  </span>
                </div>

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

                <button
                  type="submit"
                  disabled={submitting || cooldownSeconds > 0 || !code.trim()}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    borderRadius: '12px',
                    backgroundColor: submitting || cooldownSeconds > 0 || !code.trim() ? '#E5E7EB' : '#8B1528',
                    color: submitting || cooldownSeconds > 0 || !code.trim() ? '#9CA3AF' : '#FFFFFF',
                    fontSize: '0.96rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: submitting || cooldownSeconds > 0 || !code.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.15s ease',
                    boxShadow: submitting || !code.trim() ? 'none' : '0 4px 12px rgba(139, 21, 40, 0.25)'
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Verifying Cryptographic Code...</span>
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
