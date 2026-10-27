import React, { useState, useEffect } from 'react';
import Logo from '../components/Logo';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  AlertCircle, 
  Loader, 
  UserCheck, 
  GraduationCap, 
  Building2, 
  CheckCircle2,
  KeyRound,
  ArrowLeft,
  RotateCw,
  HelpCircle,
  ExternalLink,
  X
} from 'lucide-react';
import { BOOTSTRAP_ADMIN_EMAIL, USER_ROLES, setCurrentUser, isTesterAuthorized } from '../lib/storage';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { 
  resolveClientIdentity, 
  parseStudentEmail, 
  generateClientOtp,
  verifyClientOtp
} from '../lib/authResolver';
import {
  apiLoginUser,
  apiVerifyOtp,
  apiForgotPassword,
  apiResetPassword,
  subscribeAuth
} from '../lib/authClient';

/**
 * Robust fetch with timeout (2500ms max) to prevent form from hanging
 * if backend proxy is starting or unreachable.
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = 2500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}


const DEPARTMENTS = [
  { code: 'CST', name: 'Computer Science & Technology (CST)' },
  { code: 'ECE', name: 'Electronics & Communication (ECE)' },
  { code: 'ME', name: 'Mechanical Engineering (ME)' },
  { code: 'RAI', name: 'Robotics & Artificial Intelligence (RAI)' },
  { code: 'LAW', name: 'School of Law' },
  { code: 'MGT', name: 'School of Management' },
  { code: 'SCI', name: 'Applied Sciences & Humanities' },
];

const PROGRAMS = [
  'B.Tech (Computer Science)',
  'B.Tech (AI & ML)',
  'B.Tech (Electronics & Comm.)',
  'B.Tech (Mechanical)',
  'BCA',
  'BBA',
  'LL.B / B.A. LL.B',
  'B.Sc',
  'M.Tech',
  'MBA'
];

const ACADEMIC_YEARS = [
  '1st Year (Batch 2024-2028)',
  '2nd Year (Batch 2023-2027)',
  '3rd Year (Batch 2022-2026)',
  '4th Year (Batch 2021-2025)',
  'Postgraduate / Research'
];

export default function AuthView({ setView, setUserRole, setUserData }) {
  // Sign In State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Student OTP Verification Step
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [activeOtpDev, setActiveOtpDev] = useState('');
  const [resendTimer, setResendTimer] = useState(60);

  // Password Recovery State (Self-Service for existing accounts)
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotStep, setForgotStep] = useState('request'); // 'request' | 'reset'
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [isForgotLoading, setIsForgotLoading] = useState(false);

  // Google Workspace SSO State
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [googleModalError, setGoogleModalError] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // General Status
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Listen for session expiration events (30s access token / refresh cookie expiry)
  useEffect(() => {
    const unsubscribe = subscribeAuth((event, data) => {
      if (event === 'session_expired') {
        setError('Your session has expired. Please sign in again.');
      }
    });
    return unsubscribe;
  }, []);

  const isBootstrapAdmin = email.trim().toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();

  // Helper for applying user session
  const applyUserSession = (user) => {
    setCurrentUser(user);
    if (setUserData) setUserData(user);
    if (setUserRole) setUserRole(user.role);
    if (user.role === USER_ROLES.STUDENT) {
      setView('dashboard');
    } else if (user.role === USER_ROLES.FACULTY || user.role === USER_ROLES.DEPT_HEAD) {
      setView('faculty');
    } else {
      setView('admin');
    }
  };

  // Instant 1-click access for prototype demo accounts (Student, Faculty, Admin)
  const handleQuickDemoLogin = (p, e) => {
    if (e) e.stopPropagation();
    setEmail(p.email);
    setPassword(p.password);
    setError('');
    const resolved = resolveClientIdentity(p.email, p.name);
    if (p.name) resolved.name = p.name;
    // Attempt background API login to register on backend if server is active
    apiLoginUser({ email: p.email, isGoogleSso: true, name: p.name }).catch(() => {});
    applyUserSession(resolved);
  };

  // Listen for Supabase Google OAuth return session callback
  useEffect(() => {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      client.auth.getSession().then(({ data: { session }, error: sessErr }) => {
        if (session?.user?.email) {
          const userEmail = session.user.email;
          const identity = resolveClientIdentity(userEmail);
          if (session.user.user_metadata?.full_name) {
            identity.name = session.user.user_metadata.full_name;
          }
          applyUserSession(identity);
        }
      }).catch((e) => console.warn('[OAuth session check]:', e));

      const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
        if (session?.user?.email && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          const userEmail = session.user.email;
          const identity = resolveClientIdentity(userEmail);
          if (session.user.user_metadata?.full_name) {
            identity.name = session.user.user_metadata.full_name;
          }
          applyUserSession(identity);
        }
      });

      return () => {
        subscription?.unsubscribe();
      };
    }
  }, []);

  // Countdown timer for OTP resend
  useEffect(() => {
    let interval;
    if (isOtpStep && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isOtpStep, resendTimer]);

  // Real-time Identity Preview for Sign In
  const getSignInPreview = () => {
    const clean = email.trim().toLowerCase();
    if (!clean) return null;

    if (clean === 'vineetkumar182023@gmail.com') {
      return {
        type: 'admin',
        badge: '🛡️ Institutional Admin & Faculty Lead',
        desc: 'Central Administration & Academic Lead (Full Access)'
      };
    }

    if (clean.endsWith('@gmail.com') || clean.endsWith('@yahoo.com') || clean.endsWith('@outlook.com')) {
      return {
        type: 'warning',
        message: 'Personal email domain detected. Students use @mru.ac.in and Faculty use @mru.edu.in.'
      };
    }

    if (
      clean === 'iccf@mruadmin.edu.in' ||
      clean === BOOTSTRAP_ADMIN_EMAIL.toLowerCase() ||
      clean.endsWith('@mruadmin.edu.in') ||
      clean.startsWith('vc@') ||
      clean.startsWith('registrar@')
    ) {
      return {
        type: 'admin',
        badge: '🛡️ Institutional Administrator',
        desc: 'Central Administration & ICCF Core Team'
      };
    }

    const parsed = parseStudentEmail(clean);
    if (clean.endsWith('@mru.ac.in') || (parsed.isValidFormat && !clean.endsWith('@mru.edu.in'))) {
      return {
        type: 'student',
        badge: `🎓 Student Account${parsed.rollNo ? `: ${parsed.rollNo}` : ''}`,
        desc: `${parsed.department} • ${parsed.year} (Requires Email OTP)`
      };
    }

    if (clean.endsWith('@mru.edu.in')) {
      return {
        type: 'faculty',
        badge: '👨‍🏫 Faculty / Staff Account',
        desc: 'Academic Department & Moderation Panel (@mru.edu.in)'
      };
    }

    return null;
  };

  const previewInfo = getSignInPreview();

  // Handle Sign In submission (Step 1: Request Email OTP for All Roles)
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!email.trim()) {
      setError('Please enter your official university email address.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const isTester = isTesterAuthorized(cleanEmail);

    if (
      cleanEmail !== 'vineetkumar182023@gmail.com' &&
      cleanEmail !== 'vineetkr013@gmail.com' &&
      !cleanEmail.endsWith('@mru.ac.in') &&
      !cleanEmail.endsWith('.mru.ac.in') &&
      !cleanEmail.endsWith('@mru.edu.in') && 
      !cleanEmail.endsWith('@mruadmin.edu.in') &&
      !cleanEmail.includes('manavrachna.edu.in') && 
      cleanEmail !== BOOTSTRAP_ADMIN_EMAIL.toLowerCase() &&
      cleanEmail !== 'iccf@mruadmin.edu.in' &&
      cleanEmail !== 'admin.iccf@mru.edu.in' &&
      !isTester
    ) {
      setError('Please use your official university email (@mru.ac.in / @mru.edu.in) or an authorized tester email address.');
      return;
    }

    // Testing Mode Access Gating: Only emails in the authorized tester roster (or admin) can access
    if (!isTesterAuthorized(cleanEmail)) {
      setError(`Access Restricted: Testing mode is active. "${cleanEmail}" is not listed in the authorized tester roster. Please contact the administrator.`);
      return;
    }

    setIsLoading(true);

    try {
      const result = await apiLoginUser({ email: cleanEmail });
      
      if (result.requireOtp) {
        setIsOtpStep(true);
        setActiveOtpDev(result.devOtp || '');
        setResendTimer(60);
        setSuccessMessage(result.message || `A 6-digit verification code has been dispatched to ${cleanEmail}.`);
        setIsLoading(false);
        return;
      }

      if (result.success && (result.data?.user || result.user)) {
        const user = result.data?.user || result.user;
        setIsLoading(false);
        applyUserSession(user);
        return;
      }

      setError(result.error || 'Authentication failed. Please verify your email or contact IT Support.');
      setIsLoading(false);
    } catch (err) {
      console.warn('[Auth] Server login notice, attempting local OTP engine...', err);
      // Fallback for offline mode: generate client OTP for all roles
      try {
        const clientOtp = generateClientOtp(cleanEmail);
        setIsOtpStep(true);
        setActiveOtpDev(clientOtp);
        setResendTimer(60);
        setSuccessMessage(`Security OTP dispatched to ${cleanEmail}.`);
      } catch (e) {
        setError('Unable to authenticate with provided email. Please contact IT Support.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Handle OTP Verification Submission (Step 2: Authenticate & Enter Role Dashboard)
  const handleVerifyOtpSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    try {
      const result = await apiVerifyOtp({ email: cleanEmail, otp: otpCode.trim() });
      if (result.success && (result.data?.user || result.user)) {
        const user = result.data?.user || result.user;
        const role = (user.role || '').toLowerCase();
        const roleLabel = (role === 'core_team' || role === 'admin' || role === 'system_admin')
          ? 'Central Administration Portal'
          : (role === 'faculty' || role === 'dept_head' || role === 'hod' || role === 'dean')
            ? 'Faculty & Academic Portal'
            : 'Student Dashboard';
        setSuccessMessage(`OTP verified! Accessing ${roleLabel}...`);
        setIsLoading(false);
        applyUserSession(user);
        return;
      }

      setError(result.error || 'Invalid verification code. Please check your email.');
      setIsLoading(false);
    } catch (err) {
      const clientRes = verifyClientOtp(cleanEmail, otpCode.trim());
      if (clientRes.success && clientRes.user) {
        const user = clientRes.user;
        const role = (user.role || '').toLowerCase();
        const roleLabel = (role === 'core_team' || role === 'admin' || role === 'system_admin')
          ? 'Central Administration Portal'
          : (role === 'faculty' || role === 'dept_head' || role === 'hod' || role === 'dean')
            ? 'Faculty & Academic Portal'
            : 'Student Dashboard';
        setSuccessMessage(`OTP verified! Accessing ${roleLabel}...`);
        setIsLoading(false);
        applyUserSession(user);
      } else {
        setError(clientRes.error || 'Invalid OTP code. Please verify the code sent to your email.');
        setIsLoading(false);
      }
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    try {
      const res = await fetchWithTimeout(`${import.meta.env.VITE_API_URL || '/api'}/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail })
      }, 2500);

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setActiveOtpDev(data.devOtp || '');
          setResendTimer(60);
          setSuccessMessage('A fresh 6-digit OTP code has been dispatched to your email.');
          setIsLoading(false);
          return;
        }
      }
    } catch (err) {
      // Offline fallback
    }

    const newCode = generateClientOtp(cleanEmail);
    setActiveOtpDev(newCode);
    setResendTimer(60);
    setSuccessMessage('New verification code sent to your email.');
    setIsLoading(false);
  };

  // Open the interactive Google Workspace Account Chooser modal
  const handleGoogleSignIn = () => {
    setGoogleModalError('');
    setShowGoogleModal(true);
  };

  // Execute Google Workspace Sign-In: routes through OTP verification to protect security
  const executeGoogleSignIn = async (userEmail, userName) => {
    setIsGoogleLoading(true);
    setGoogleModalError('');

    const clean = (userEmail || '').trim().toLowerCase();
    if (!isTesterAuthorized(clean)) {
      setGoogleModalError(`Access Restricted: Testing mode is active. "${clean}" is not in the authorized testing roster.`);
      setIsGoogleLoading(false);
      return;
    }

    // Close Google modal and populate main login form to trigger OTP flow
    setShowGoogleModal(false);
    setIsGoogleLoading(false);
    setEmail(clean);

    // Trigger OTP request
    setIsLoading(true);
    try {
      const result = await apiLoginUser({ email: clean });
      setIsOtpStep(true);
      setResendTimer(60);
      setSuccessMessage(result.message || `A 6-digit verification code has been dispatched to ${clean}.`);
    } catch (err) {
      try {
        generateClientOtp(clean);
        setIsOtpStep(true);
        setResendTimer(60);
        setSuccessMessage(`Security OTP dispatched to ${clean}.`);
      } catch (e) {
        setError('Unable to authenticate with provided email.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Direct Supabase OAuth redirect trigger
  const handleDirectSupabaseGoogleOAuth = async () => {
    setIsGoogleLoading(true);
    setGoogleModalError('');
    try {
      const client = getSupabaseClient();
      if (client && isSupabaseConfigured()) {
        const { error: oauthError } = await client.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin,
            queryParams: {
              prompt: 'select_account'
            }
          }
        });
        if (oauthError) {
          console.warn('[Supabase Google OAuth notice]:', oauthError.message);
          setShowGoogleModal(true);
          setIsGoogleLoading(false);
        }
      } else {
        setShowGoogleModal(true);
        setIsGoogleLoading(false);
      }
    } catch (err) {
      console.warn('[Google OAuth catch]:', err);
      setShowGoogleModal(true);
      setIsGoogleLoading(false);
    }
  };

  // Handle Password Recovery Request
  const handleForgotPasswordRequest = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotMsg('');

    if (!forgotEmail.trim()) {
      setForgotError('Please enter your institutional email address.');
      return;
    }

    setIsForgotLoading(true);
    try {
      const res = await apiForgotPassword(forgotEmail.trim().toLowerCase());
      setForgotMsg(res.message || 'If your account is registered, recovery instructions have been sent.');
      setForgotStep('reset');
    } catch (err) {
      setForgotError(err.message || 'Unable to process recovery request.');
    } finally {
      setIsForgotLoading(false);
    }
  };

  // Handle Password Reset Submission
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotMsg('');

    if (!resetToken.trim() || !newPassword.trim()) {
      setForgotError('Please enter both the reset token and your new password.');
      return;
    }

    if (newPassword.length < 8) {
      setForgotError('New password must be at least 8 characters long.');
      return;
    }

    setIsForgotLoading(true);
    try {
      const res = await apiResetPassword({ token: resetToken.trim(), newPassword });
      if (res.success) {
        setSuccessMessage('Password successfully updated! Please sign in with your new password.');
        setShowForgotModal(false);
        setPassword('');
        setEmail(forgotEmail);
      } else {
        setForgotError(res.error || 'Failed to reset password. Please check the token.');
      }
    } catch (err) {
      setForgotError(err.message || 'Password reset failed.');
    } finally {
      setIsForgotLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FAF7F2',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        maxWidth: '1020px',
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: '28px',
        overflow: 'hidden',
        boxShadow: '0 20px 50px -10px rgba(139, 21, 40, 0.12)',
        border: '1px solid #ECE7DF',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))'
      }}>
        {/* Left Form Column */}
        <div style={{ padding: '36px 36px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Enhanced Top Navigation Bar: Back to Home */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            paddingBottom: '14px',
            borderBottom: '1px solid #F1ECE4'
          }}>
            <button
              type="button"
              onClick={() => setView('landing')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#57534E',
                backgroundColor: '#FAF8F5',
                border: '1px solid #E6E1D8',
                cursor: 'pointer',
                padding: '6px 14px',
                borderRadius: '9999px',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.borderColor = '#8B1528';
                e.currentTarget.style.color = '#8B1528';
                e.currentTarget.style.transform = 'translateX(-3px)';
                e.currentTarget.style.boxShadow = '0 3px 10px rgba(139, 21, 40, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FAF8F5';
                e.currentTarget.style.borderColor = '#E6E1D8';
                e.currentTarget.style.color = '#57534E';
                e.currentTarget.style.transform = 'translateX(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
              }}
            >
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: '#FFF5F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#8B1528'
              }}>
                <ArrowLeft size={13} strokeWidth={2.5} />
              </div>
              <span style={{ whiteSpace: 'nowrap' }}>Back to Home</span>
            </button>
          </div>

          {/* Logo with Unrestricted Space */}
          <div style={{ padding: '2px 0 2px 0' }}>
            <Logo size="normal" show30Years={true} onClick={() => setView('landing')} />
          </div>

          {/* Form Header */}
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 10px',
              borderRadius: '9999px',
              backgroundColor: '#FDF2F4',
              color: '#8B1528',
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: '10px'
            }}>
              <ShieldCheck size={13} color="#8B1528" />
              <span>Official Institutional Access</span>
            </div>
            <h2 style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#1C1917',
              fontFamily: 'var(--font-serif)',
              lineHeight: 1.2
            }}>
              {isOtpStep ? 'Verify Official Email OTP' : 'Institutional Portal Login'}
            </h2>
            <p style={{ color: '#78716C', fontSize: '0.86rem', marginTop: '6px' }}>
              {isOtpStep 
                ? 'Enter the 6-digit verification code dispatched to your registered email'
                : 'Sign in with your official university credentials (@mru.ac.in, @mru.edu.in, or authorized testing email)'}
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <div style={{
              padding: '11px 14px',
              borderRadius: '12px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              fontSize: '0.82rem',
              color: '#B91C1C',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div style={{
              padding: '11px 14px',
              borderRadius: '12px',
              backgroundColor: '#F0FDF4',
              border: '1px solid #BBF7D0',
              fontSize: '0.82rem',
              color: '#15803D',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircle2 size={16} color="#16A34A" style={{ flexShrink: 0 }} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 2: STUDENT OTP VERIFICATION VIEW                          */}
          {/* ============================================================== */}
          {isOtpStep && (
            <form onSubmit={handleVerifyOtpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                backgroundColor: '#FAF8F5',
                border: '1px solid #ECE7DF',
                borderRadius: '14px',
                padding: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <span style={{ fontSize: '0.74rem', color: '#78716C', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
                    Verification Code Sent To
                  </span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1C1917' }}>
                    {email}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => { setIsOtpStep(false); setOtpCode(''); setError(''); }}
                  style={{
                    fontSize: '0.75rem',
                    color: '#8B1528',
                    fontWeight: 600,
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Change Email
                </button>
              </div>




              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#44403C', marginBottom: '6px' }}>
                  Enter 6-Digit Email OTP *
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid #D6D3D1',
                  backgroundColor: '#FAF8F5'
                }}>
                  <KeyRound size={18} color="#78716C" />
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="• • • • • •"
                    required
                    autoFocus
                    style={{
                      flex: 1,
                      border: 'none',
                      outline: 'none',
                      backgroundColor: 'transparent',
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      letterSpacing: '0.35em',
                      color: '#1C1917'
                    }}
                  />
                </div>
              </div>

              {/* Verify OTP Button */}
              <button
                type="submit"
                className="btn-primary"
                disabled={isLoading || otpCode.length !== 6}
                style={{
                  width: '100%',
                  padding: '13px',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  marginTop: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: (isLoading || otpCode.length !== 6) ? 0.7 : 1,
                  cursor: (isLoading || otpCode.length !== 6) ? 'not-allowed' : 'pointer'
                }}
              >
                {isLoading ? (
                  <>
                    <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Verifying Code…</span>
                  </>
                ) : (
                  <>
                    <span>Verify OTP & Enter Portal</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              {/* Resend OTP & Back */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '8px',
                borderTop: '1px solid #ECE7DF',
                fontSize: '0.8rem'
              }}>
                <button
                  type="button"
                  onClick={() => { setIsOtpStep(false); setOtpCode(''); setError(''); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#78716C',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <ArrowLeft size={14} />
                  <span>Back to login</span>
                </button>

                <div>
                  {resendTimer > 0 ? (
                    <span style={{ color: '#A8A29E' }}>
                      Resend code in <strong>{resendTimer}s</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      style={{
                        color: '#8B1528',
                        fontWeight: 700,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <RotateCw size={13} />
                      <span>Resend OTP</span>
                    </button>
                  )}
                </div>
              </div>
            </form>
          )}

          {/* ============================================================== */}
          {/* STEP 1: REGULAR INSTITUTIONAL SIGN IN VIEW                     */}
          {/* ============================================================== */}
          {!isOtpStep && (
            <>
              {/* Google Workspace One-Click SSO */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading || isGoogleLoading}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid #D6D3D1',
                  backgroundColor: '#FFFFFF',
                  color: '#1C1917',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  cursor: (isLoading || isGoogleLoading) ? 'not-allowed' : 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F9FAFB'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Continue with Google</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', margin: '4px 0', gap: '10px' }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#E7E5E4' }} />
                <span style={{ fontSize: '0.72rem', color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  or sign in with email OTP
                </span>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#E7E5E4' }} />
              </div>

              {/* Form */}
              <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#44403C', marginBottom: '6px' }}>
                    Institutional University Email ID
                  </label>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '11px 14px',
                    borderRadius: '12px',
                    border: '1px solid #D6D3D1',
                    backgroundColor: '#FAF8F5'
                  }}>
                    <Mail size={16} color="#78716C" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(''); }}
                      placeholder="e.g. 22cse0002@mru.ac.in or faculty@mru.edu.in"
                      required
                      autoComplete="email"
                      style={{
                        flex: 1,
                        border: 'none',
                        outline: 'none',
                        backgroundColor: 'transparent',
                        fontSize: '0.88rem',
                        color: '#1C1917'
                      }}
                    />
                  </div>
                </div>

                {/* Real-time Dynamic Persona Preview Badge */}
                {previewInfo && (
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: '10px',
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: previewInfo.type === 'warning' ? '#FEF2F2' : '#F0FDF4',
                    border: `1px solid ${previewInfo.type === 'warning' ? '#FECACA' : '#BBF7D0'}`,
                    color: previewInfo.type === 'warning' ? '#B91C1C' : '#166534'
                  }}>
                    <Sparkles size={14} />
                    <div>
                      {previewInfo.badge && <strong style={{ display: 'block' }}>{previewInfo.badge}</strong>}
                      <span>{previewInfo.desc || previewInfo.message}</span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '13px',
                    fontSize: '0.94rem',
                    fontWeight: 700,
                    marginTop: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    opacity: isLoading ? 0.8 : 1,
                    cursor: isLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Sending Verification Code…</span>
                    </>
                  ) : (
                    <>
                      <Mail size={16} />
                      <span>Send Verification Code (OTP)</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              {/* Student Registration Prompt */}
              {/* Institutional Assistance Footer */}
              <div style={{
                textAlign: 'center',
                paddingTop: '16px',
                borderTop: '1px solid #ECE7DF',
                fontSize: '0.8rem',
                color: '#78716C'
              }}>
                Need access assistance or forgot credentials?{' '}
                <span style={{ color: '#8B1528', fontWeight: 600 }}>
                  Contact IT Support (support@mru.edu.in)
                </span>
              </div>
            </>
          )}
        </div>

        {/* Right Info Column with Campus Photo */}
        <div style={{
          position: 'relative',
          color: '#FFFFFF',
          padding: '40px 32px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflow: 'hidden',
          backgroundImage: "linear-gradient(155deg, rgba(139, 21, 40, 0.90) 0%, rgba(65, 8, 18, 0.95) 100%), url('/assets/mr_campus_login.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}>
          {/* Subtle Background Ornament */}
          <div style={{
            position: 'absolute',
            top: '-60px',
            right: '-60px',
            width: '240px',
            height: '240px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            pointerEvents: 'none'
          }} />

          <div>
            {/* Campus Panorama Photo Banner */}
            <div style={{
              borderRadius: '16px',
              overflow: 'hidden',
              marginBottom: '16px',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.28)',
              position: 'relative'
            }}>
              <img 
                src="/assets/mr_campus_login.png" 
                alt="Manav Rachna Campus Panorama" 
                style={{
                  width: '100%',
                  height: '145px',
                  objectFit: 'cover',
                  display: 'block'
                }} 
              />
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '6px 12px',
                background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)',
                fontSize: '0.72rem',
                color: '#FFFFFF',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span>Manav Rachna Campus</span>
                <span style={{ opacity: 0.85, fontSize: '0.68rem' }}>Faridabad, NCR</span>
              </div>
            </div>

            {/* Institutional Framework Spotlight (Replaces Demo Accounts) */}
            <div style={{
              backgroundColor: 'rgba(0, 0, 0, 0.28)',
              backdropFilter: 'blur(12px)',
              borderRadius: '16px',
              padding: '16px 18px',
              border: '1px solid rgba(255, 255, 255, 0.22)',
              marginBottom: '18px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Sparkles size={16} color="#FDE68A" />
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#FDE68A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Institutional Access Gateway
                </span>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#FFFFFF', opacity: 0.9, lineHeight: 1.5, margin: 0 }}>
                Single sign-on gateway for students, academic faculty, and university administrators across all schools of Manav Rachna.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
                <div style={{ padding: '8px 10px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)' }}>
                  <div style={{ fontSize: '0.74rem', color: '#FDE68A', fontWeight: 700 }}>🎓 Students</div>
                  <div style={{ fontSize: '0.68rem', color: '#E2E8F0', marginTop: '2px' }}>@mru.ac.in Email OTP</div>
                </div>
                <div style={{ padding: '8px 10px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)' }}>
                  <div style={{ fontSize: '0.74rem', color: '#FDE68A', fontWeight: 700 }}>👨‍🏫 Faculty & Admin</div>
                  <div style={{ fontSize: '0.68rem', color: '#E2E8F0', marginTop: '2px' }}>Institutional Email / Google</div>
                </div>
              </div>
            </div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(255, 255, 255, 0.18)',
              backdropFilter: 'blur(8px)',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '16px'
            }}>
              <Sparkles size={12} />
              <span>ICCF Standards</span>
            </div>

            <h3 style={{
              fontSize: '1.45rem',
              fontWeight: 800,
              fontFamily: 'Arial, Helvetica, sans-serif',
              lineHeight: 1.25,
              marginBottom: '12px'
            }}>
              Institutional Competency Certification Framework
            </h3>

            <p style={{ fontSize: '0.86rem', color: 'rgba(255, 255, 255, 0.9)', lineHeight: 1.55 }}>
              Designed to benchmark, evaluate, and certify human-centric excellence across 15 multidimensional skill areas.
            </p>
          </div>

          <div style={{ fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.75)', borderTop: '1px solid rgba(255, 255, 255, 0.2)', paddingTop: '14px' }}>
            Manav Rachna University • Established under Section 2(f) of UGC Act 1956
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* PASSWORD RECOVERY MODAL (SELF-SERVICE FOR EXISTING USERS)       */}
      {/* ============================================================== */}
      {showForgotModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(28, 25, 23, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            maxWidth: '460px',
            width: '100%',
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            border: '1px solid #E7E5E4',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            padding: '28px',
            position: 'relative'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  backgroundColor: '#FDF2F4',
                  color: '#8B1528',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <KeyRound size={17} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1C1917', margin: 0 }}>
                    {forgotStep === 'request' ? 'Password Recovery' : 'Set New Password'}
                  </h3>
                  <span style={{ fontSize: '0.74rem', color: '#78716C' }}>
                    Institutional Account Self-Service
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#78716C',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Error & Success Alerts */}
            {forgotError && (
              <div style={{
                padding: '10px 12px',
                borderRadius: '10px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#B91C1C',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '14px'
              }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotMsg && (
              <div style={{
                padding: '10px 12px',
                borderRadius: '10px',
                backgroundColor: '#F0FDF4',
                border: '1px solid #BBF7D0',
                color: '#15803D',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '14px'
              }}>
                <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
                <span>{forgotMsg}</span>
              </div>
            )}

            {/* STEP 1: REQUEST RECOVERY TOKEN */}
            {forgotStep === 'request' ? (
              <form onSubmit={handleForgotPasswordRequest} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ fontSize: '0.82rem', color: '#57534E', lineHeight: 1.5, margin: 0 }}>
                  Enter your registered university email. A secure, short-lived recovery token will be dispatched.
                </p>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#44403C', marginBottom: '6px' }}>
                    Registered Institutional Email
                  </label>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #D6D3D1',
                    backgroundColor: '#FAF8F5'
                  }}>
                    <Mail size={16} color="#78716C" />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="e.g. 22cse0002@mru.ac.in"
                      required
                      style={{
                        flex: 1,
                        border: 'none',
                        outline: 'none',
                        backgroundColor: 'transparent',
                        fontSize: '0.86rem',
                        color: '#1C1917'
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isForgotLoading}
                  style={{
                    padding: '11px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: isForgotLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isForgotLoading ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowRight size={16} />}
                  <span>{isForgotLoading ? 'Dispatching…' : 'Send Password Recovery Code'}</span>
                </button>

                <div style={{ textAlign: 'center', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => { setForgotStep('reset'); setForgotError(''); setForgotMsg(''); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#8B1528',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    Already have a reset token? Enter it here →
                  </button>
                </div>
              </form>
            ) : (
              /* STEP 2: VERIFY TOKEN & SET NEW PASSWORD */
              <form onSubmit={handleResetPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ fontSize: '0.82rem', color: '#57534E', lineHeight: 1.5, margin: 0 }}>
                  Enter the recovery token dispatched to your institutional email, followed by your new password.
                </p>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#44403C', marginBottom: '6px' }}>
                    Recovery Token (from Email) *
                  </label>
                  <input
                    type="text"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="Paste 64-character token"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid #D6D3D1',
                      backgroundColor: '#FAF8F5',
                      fontSize: '0.82rem',
                      fontFamily: 'monospace',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#44403C', marginBottom: '6px' }}>
                    New Password (Min 8 Characters) *
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter strong new password"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid #D6D3D1',
                      backgroundColor: '#FAF8F5',
                      fontSize: '0.86rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isForgotLoading}
                  style={{
                    padding: '11px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: isForgotLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isForgotLoading ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <KeyRound size={16} />}
                  <span>{isForgotLoading ? 'Updating…' : 'Set New Password & Revoke Sessions'}</span>
                </button>

                <div style={{ textAlign: 'center', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => { setForgotStep('request'); setForgotError(''); setForgotMsg(''); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#78716C',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <ArrowLeft size={13} />
                    <span>Back to Request Code</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* ============================================================== */}
      {/* GOOGLE WORKSPACE INSTITUTIONAL SSO MODAL                        */}
      {/* ============================================================== */}
      {showGoogleModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(28, 25, 23, 0.65)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            maxWidth: '460px',
            width: '100%',
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            border: '1px solid #E5E7EB',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.28)',
            padding: '28px',
            position: 'relative'
          }}>
            {/* Modal Header with Google Branding */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1F2937', margin: 0, fontFamily: 'Arial, sans-serif' }}>
                    Sign in with Google
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#6B7280' }}>
                    Choose an institutional account to continue to <strong>MRU SkillCert</strong>
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6B7280',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Error Banner */}
            {googleModalError && (
              <div style={{
                padding: '10px 12px',
                borderRadius: '10px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#B91C1C',
                fontSize: '0.78rem',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{googleModalError}</span>
              </div>
            )}

            {/* Google Account Single Sign-On */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#374151', marginBottom: '8px' }}>
                Enter your authorized Google or university account:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input
                  type="email"
                  value={customGoogleEmail}
                  onChange={(e) => setCustomGoogleEmail(e.target.value)}
                  placeholder="e.g. Vineetkumar182023@gmail.com or name@mru.ac.in"
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '10px',
                    border: '1px solid #D1D5DB',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  disabled={!customGoogleEmail.trim() || isGoogleLoading}
                  onClick={() => executeGoogleSignIn(customGoogleEmail.trim().toLowerCase())}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '0.9rem',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {isGoogleLoading ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Continue to Portal with Google'}
                </button>
              </div>
            </div>

            {/* Supabase direct redirect fallback */}
            <div style={{ textAlign: 'center', borderTop: '1px solid #F3F4F6', paddingTop: '10px' }}>
              <button
                type="button"
                onClick={handleDirectSupabaseGoogleOAuth}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '0.72rem',
                  color: '#6B7280',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Or launch external Google redirect window via Supabase
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
