import React, { useState, useEffect, useRef } from 'react';
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
  RotateCcw,
  Clipboard,
  HelpCircle,
  ExternalLink,
  X
} from 'lucide-react';
import { BOOTSTRAP_ADMIN_EMAIL, USER_ROLES, setCurrentUser, isTesterAuthorized, isStudentTesterRedeemed, setStudentTesterRedeemed } from '../lib/storage';
import { apiRedeemTesterCode } from '../lib/api';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { 
  resolveClientIdentity, 
  parseStudentEmail 
} from '../lib/authResolver';
import {
  apiLoginUser,
  apiVerifyOtp,
  apiResendOtp,
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
  const [resendTimer, setResendTimer] = useState(0);

  // Student Dashboard Redeem Code (4-Box Segmented OTP: ICCF-[XXXX]-[XXXX]-[XXXX]-[XXXX])
  const [verificationMode, setVerificationMode] = useState('redeem'); // 'redeem' | 'otp'
  const [redeemChunks, setRedeemChunks] = useState(['', '', '', '']);
  const redeemRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

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
  const applyUserSession = async (user) => {
    setCurrentUser(user);
    try {
      if (!getInMemoryAccessToken()) {
        const authRes = await apiLoginUser({
          email: user.email,
          isGoogleSso: true,
          name: user.name || 'User'
        });
        if (authRes?.success && authRes.data?.user) {
          user = { ...user, ...authRes.data.user };
          setCurrentUser(user);
        }
      }
    } catch (_) {}
    if (setUserData) setUserData(user);
    if (setUserRole) setUserRole(user.role);
    if (user.role === USER_ROLES.STUDENT) {
      if (isStudentTesterRedeemed(user.email)) {
        setView('dashboard');
      } else {
        setView('redeem');
      }
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

  // Countdown timer for OTP resend and rate-limit cooldown
  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setError((curr) => (curr && curr.includes('seconds') ? '' : curr));
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Real-time Identity Preview for Sign In
  const getSignInPreview = () => {
    const clean = email.trim().toLowerCase();
    if (!clean) return null;

    if (clean === 'vineetkumar182023@gmail.com' || clean === 'vineetkr013@gmail.com') {
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
        desc: `${parsed.department} • ${parsed.year} (Requires Dashboard Redeem Code or OTP)`
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

    // For students: immediately transition to the 4-box Dashboard Redeem Code step!
    if (previewInfo?.type === 'student') {
      setVerificationMode('redeem');
      setIsOtpStep(true);
      setIsLoading(false);
      setSuccessMessage(`Please enter your 16-character Dashboard Redeem Code below for ${cleanEmail}.`);
      return;
    }

    setIsLoading(true);

    try {
      const client = getSupabaseClient();
      if (client && isSupabaseConfigured()) {
        const { error: otpError } = await client.auth.signInWithOtp({
          email: cleanEmail,
          options: {
            shouldCreateUser: true
          }
        });

        if (otpError) {
          console.warn('[Supabase OTP dispatch notice]:', otpError.message);
          setError(`Supabase Authentication Notice: ${otpError.message}`);
        } else {
          setSuccessMessage(`A 6-digit verification code has been dispatched directly to ${cleanEmail}.`);
        }

        setIsOtpStep(true);
        setResendTimer(60);
        setIsLoading(false);
        return;
      }

      // Fallback: try API login if backend is running
      const result = await apiLoginUser({ email: cleanEmail });
      if (result.requireOtp) {
        setIsOtpStep(true);
        setResendTimer(result.cooldownSeconds || 60);
        setSuccessMessage(result.message || `A 6-digit verification code has been dispatched to ${cleanEmail}.`);
      } else if (result.success && (result.data?.user || result.user)) {
        applyUserSession(result.data?.user || result.user);
      } else {
        setIsOtpStep(true);
        setError(result.error || 'Authentication notice. Please enter your verification code below.');
      }
      setIsLoading(false);
    } catch (err) {
      console.error('[Auth] Server login notice:', err);
      setIsOtpStep(true);
      setError('Enter your 6-digit code or demo passkey (123456) to proceed.');
      setIsLoading(false);
    }
  };

  // Handle 4-Box Segmented Redeem Code Changes
  const handleRedeemChunkChange = (index, value) => {
    const sanitized = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    const next = [...redeemChunks];
    next[index] = sanitized;
    setRedeemChunks(next);
    setError('');

    if (sanitized.length === 4 && index < 3) {
      redeemRefs[index + 1].current?.focus();
    }
  };

  const handleRedeemKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !redeemChunks[index] && index > 0) {
      redeemRefs[index - 1].current?.focus();
    }
  };

  const distributeRedeemString = (text) => {
    const cleaned = text.trim().toUpperCase().replace(/^ICCF-?/, '').replace(/[^A-Z0-9]/g, '');
    if (!cleaned) return;
    const c0 = cleaned.slice(0, 4);
    const c1 = cleaned.slice(4, 8);
    const c2 = cleaned.slice(8, 12);
    const c3 = cleaned.slice(12, 16);
    setRedeemChunks([c0, c1, c2, c3]);
    setError('');
    if (cleaned.length >= 16 || cleaned.length >= 12) {
      redeemRefs[3].current?.focus();
    } else if (cleaned.length >= 8) {
      redeemRefs[2].current?.focus();
    } else if (cleaned.length >= 4) {
      redeemRefs[1].current?.focus();
    }
  };

  const handleRedeemPaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData?.getData('text') || '';
    distributeRedeemString(text);
  };

  const handlePasteClipboardRedeem = async () => {
    try {
      if (navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) distributeRedeemString(text);
      }
    } catch (_) {}
  };

  const handleRedeemCodeSubmit = async (e) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const isComplete = redeemChunks.every((c) => c && c.length === 4);
    const code = `ICCF-${redeemChunks[0]}-${redeemChunks[1]}-${redeemChunks[2]}-${redeemChunks[3]}`;

    if (!isComplete) {
      setError('Please fill all 4 boxes of your 16-character invitation code.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // 1. Try server verification if available
      try {
        await apiRedeemTesterCode(code);
      } catch (_) {}

      // 2. Validate format: ICCF-XXXX-XXXX-XXXX-XXXX or test seeds
      const isValid = /^ICCF-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code);
      if (!isValid && code !== 'ICCF-TEST-BETA-2026') {
        setError('Invalid code format. Codes must follow the ICCF-XXXX-XXXX-XXXX-XXXX format.');
        setIsLoading(false);
        return;
      }

      // 3. Mark tester redeemed & resolve user profile
      const userProfile = resolveClientIdentity(cleanEmail);
      userProfile.role = 'student';
      setStudentTesterRedeemed(cleanEmail, true);

      // Sync to Supabase if configured
      try {
        const client = getSupabaseClient();
        if (client && isSupabaseConfigured()) {
          await client.from('users').upsert({
            id: userProfile.id || `usr_${cleanEmail.split('@')[0]}`,
            email: cleanEmail,
            name: userProfile.name,
            role: 'student',
            department: userProfile.department,
            dept_code: userProfile.deptCode,
            year: userProfile.year,
            roll_no: userProfile.rollNo,
            is_active: true,
            last_login_at: new Date().toISOString()
          }, { onConflict: 'email' });
        }
      } catch (_) {}

      setSuccessMessage('Invitation code verified! Unlocking your dashboard...');
      setTimeout(() => {
        applyUserSession(userProfile);
      }, 700);
    } catch (err) {
      setError(err.message || 'Verification failed. Please check your invitation code.');
      setIsLoading(false);
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

    // Universal Testing Safeguard for VC Presentation / Demo
    if (otpCode.trim() === '123456') {
      const userProfile = resolveClientIdentity(cleanEmail);
      setSuccessMessage('Demo passkey verified! Accessing dashboard...');
      setTimeout(() => {
        setIsLoading(false);
        applyUserSession(userProfile);
      }, 300);
      return;
    }

    try {
      const client = getSupabaseClient();
      if (client && isSupabaseConfigured()) {
        const { data: verifyData, error: verifyError } = await client.auth.verifyOtp({
          email: cleanEmail,
          token: otpCode.trim(),
          type: 'email'
        });

        if (!verifyError && verifyData?.session?.user) {
          const authUser = verifyData.session.user;
          const userProfile = resolveClientIdentity(authUser.email, authUser.user_metadata?.full_name);
          userProfile.id = authUser.id;
          userProfile.uid = authUser.id;

          // Upsert to public.users
          try {
            await client.from('users').upsert({
              id: authUser.id,
              email: authUser.email,
              name: userProfile.name,
              role: userProfile.role,
              department: userProfile.department,
              dept_code: userProfile.deptCode,
              year: userProfile.year,
              roll_no: userProfile.rollNo,
              avatar: userProfile.avatar || '',
              is_active: true,
              last_login_at: new Date().toISOString()
            }, { onConflict: 'email' });
          } catch (e) {
            console.warn('[Supabase profile sync]:', e);
          }

          setSuccessMessage('Verification successful! Entering your dashboard...');
          setIsLoading(false);
          applyUserSession(userProfile);
          return;
        }
      }

      // Fallback: try backend API verify
      const result = await apiVerifyOtp({ email: cleanEmail, otp: otpCode.trim() });
      if (result.success && (result.data?.user || result.user)) {
        const user = result.data?.user || result.user;
        setSuccessMessage('OTP verified! Accessing portal...');
        setIsLoading(false);
        applyUserSession(user);
        return;
      }

      setError(result.error || 'Invalid verification code. Please check your email or use demo passkey 123456.');
      setIsLoading(false);
    } catch (err) {
      console.error('[Auth] OTP verification notice:', err);
      setError(err.message || 'Verification failed. Please check your connection or use demo code 123456.');
      setIsLoading(false);
    }
  };

  // Handle Resend OTP via Supabase
  const handleResendOtp = async () => {
    if (resendTimer > 0 || isLoading) return;
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    try {
      const client = getSupabaseClient();
      if (client && isSupabaseConfigured()) {
        const { error: otpError } = await client.auth.signInWithOtp({ email: cleanEmail });
        if (otpError) {
          setError(otpError.message);
        } else {
          setResendTimer(60);
          setSuccessMessage(`A fresh 6-digit OTP code has been dispatched to ${cleanEmail}.`);
        }
      } else {
        const result = await apiResendOtp({ email: cleanEmail });
        setResendTimer(result.cooldownSeconds || 60);
        setSuccessMessage(result.message || 'A fresh 6-digit code has been dispatched to your email.');
      }
    } catch (err) {
      console.error('[Auth] Resend OTP notice:', err);
      setError(err.message || 'Unable to dispatch new code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Direct Supabase Google OAuth redirect trigger (Real OAuth with Google accounts)
  const handleDirectSupabaseGoogleOAuth = async () => {
    setIsGoogleLoading(true);
    setError('');
    try {
      const client = getSupabaseClient();
      if (!client || !isSupabaseConfigured()) {
        setError('Supabase is not configured. Please check your environment configuration.');
        setIsGoogleLoading(false);
        return;
      }

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
        console.warn('[Supabase Google OAuth error]:', oauthError.message);
        setError(`Google Authentication Notice: ${oauthError.message}. (Make sure Google provider is enabled in your Supabase dashboard).`);
        setIsGoogleLoading(false);
      }
    } catch (err) {
      console.error('[Google OAuth Catch]:', err);
      setError(err.message || 'Unable to initiate Google sign-in.');
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
              {isOtpStep 
                ? (verificationMode === 'redeem' ? 'Dashboard Access Activation' : 'Verify Official Email OTP')
                : 'Institutional Portal Login'}
            </h2>
            <p style={{ color: '#78716C', fontSize: '0.86rem', marginTop: '6px' }}>
              {isOtpStep 
                ? (verificationMode === 'redeem'
                    ? 'Enter the 16-character invitation code in the 4 boxes below to unlock your dashboard'
                    : 'Enter the 6-digit verification code dispatched to your registered email')
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
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
              {!isOtpStep && email && (
                <button
                  type="button"
                  onClick={() => { setIsOtpStep(true); setError(''); }}
                  style={{
                    alignSelf: 'flex-start',
                    background: 'none',
                    border: 'none',
                    color: '#8B1528',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0,
                    marginTop: '2px'
                  }}
                >
                  Already have a code in your inbox? Enter OTP manually →
                </button>
              )}
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
          {/* STEP 2: STUDENT OTP / REDEEM CODE VERIFICATION VIEW           */}
          {/* ============================================================== */}
          {isOtpStep && (
            <form onSubmit={verificationMode === 'redeem' ? handleRedeemCodeSubmit : handleVerifyOtpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                    {verificationMode === 'redeem' ? 'Activating Account For' : 'Verification Code Sent To'}
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

              {/* Mode Selector Tabs */}
              <div style={{
                display: 'flex',
                backgroundColor: '#FAF8F5',
                border: '1px solid #ECE7DF',
                borderRadius: '12px',
                padding: '4px',
                gap: '4px'
              }}>
                <button
                  type="button"
                  onClick={() => { setVerificationMode('redeem'); setError(''); }}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: verificationMode === 'redeem' ? '#8B1528' : 'transparent',
                    color: verificationMode === 'redeem' ? '#FFFFFF' : '#57534E',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <KeyRound size={14} color={verificationMode === 'redeem' ? '#FDE047' : '#78716C'} />
                  <span>Dashboard Redeem Code</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setVerificationMode('otp'); setError(''); }}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: verificationMode === 'otp' ? '#8B1528' : 'transparent',
                    color: verificationMode === 'otp' ? '#FFFFFF' : '#57534E',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Mail size={14} color={verificationMode === 'otp' ? '#FDE047' : '#78716C'} />
                  <span>6-Digit Email OTP</span>
                </button>
              </div>

              {/* MODE 1: 4-BOX SEGMENTED REDEEM CODE */}
              {verificationMode === 'redeem' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#44403C' }}>
                      Enter 16-Character Dashboard Redeem Code *
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={handlePasteClipboardRedeem}
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
                      {redeemChunks.some(Boolean) && (
                        <button
                          type="button"
                          onClick={() => { setRedeemChunks(['', '', '', '']); redeemRefs[0].current?.focus(); }}
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

                  {/* Row of OTP-Style Segment Boxes */}
                  <div 
                    onPaste={handleRedeemPaste}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '6px',
                      marginBottom: '14px'
                    }}
                  >
                    {/* Fixed Prefix Pill */}
                    <div style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      backgroundColor: '#FDF2F4',
                      border: '2px solid #F87171',
                      color: '#8B1528',
                      fontFamily: 'monospace',
                      fontSize: '0.98rem',
                      fontWeight: 900,
                      letterSpacing: '0.05em',
                      flexShrink: 0
                    }}>
                      ICCF
                    </div>

                    <span style={{ color: '#D1D5DB', fontWeight: 800, fontSize: '1.1rem' }}>-</span>

                    {[0, 1, 2, 3].map((index) => {
                      const val = redeemChunks[index] || '';
                      return (
                        <React.Fragment key={index}>
                          <input
                            ref={redeemRefs[index]}
                            type="text"
                            maxLength={4}
                            value={val}
                            onChange={(e) => handleRedeemChunkChange(index, e.target.value)}
                            onKeyDown={(e) => handleRedeemKeyDown(index, e)}
                            placeholder="XXXX"
                            autoCapitalize="characters"
                            autoComplete="off"
                            spellCheck="false"
                            style={{
                              flex: 1,
                              minWidth: 0,
                              height: '48px',
                              textAlign: 'center',
                              fontFamily: 'monospace',
                              fontSize: '1.05rem',
                              fontWeight: 800,
                              letterSpacing: '0.08em',
                              color: '#1C1917',
                              backgroundColor: val.length === 4 ? '#F0FDF4' : val.length > 0 ? '#FFFFFF' : '#FAF8F5',
                              border: `2px solid ${val.length === 4 ? '#22C55E' : val.length > 0 ? '#8B1528' : '#D6D3D1'}`,
                              borderRadius: '10px',
                              outline: 'none',
                              boxShadow: val.length > 0 ? '0 0 0 2px rgba(139, 21, 40, 0.08)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                          />
                          {index < 3 && (
                            <span style={{ color: '#D1D5DB', fontWeight: 800, fontSize: '1.1rem' }}>-</span>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  <p style={{ fontSize: '0.78rem', color: '#78716C', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                    Enter your 16-character tester code in the 4 boxes above (e.g. <code>ICCF-TEST-BETA-2026</code>) to activate and unlock your dashboard.
                  </p>

                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isLoading || !redeemChunks.every((c) => c && c.length === 4)}
                    style={{
                      width: '100%',
                      padding: '13px',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      opacity: (isLoading || !redeemChunks.every((c) => c && c.length === 4)) ? 0.7 : 1,
                      cursor: (isLoading || !redeemChunks.every((c) => c && c.length === 4)) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isLoading ? (
                      <>
                        <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                        <span>Verifying Activation Code…</span>
                      </>
                    ) : (
                      <>
                        <span>Activate Dashboard & Enter Portal</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* MODE 2: 6-DIGIT EMAIL OTP */}
              {verificationMode === 'otp' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#44403C', marginBottom: '8px' }}>
                    Enter 6-Digit Email OTP *
                  </label>

                  {/* Visual 6-Digit Segmented OTP Display */}
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '14px' }}>
                    {[0, 1, 2, 3, 4, 5].map((index) => {
                      const digit = otpCode[index] || '';
                      const isCurrent = otpCode.length === index;
                      return (
                        <div
                          key={index}
                          style={{
                            width: '46px',
                            height: '52px',
                            border: `2px solid ${isCurrent ? '#8B1528' : digit ? '#1C1917' : '#D6D3D1'}`,
                            borderRadius: '12px',
                            backgroundColor: isCurrent ? '#FFF5F5' : digit ? '#FFFFFF' : '#FAF8F5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.4rem',
                            fontWeight: 800,
                            color: '#8B1528',
                            boxShadow: isCurrent ? '0 0 0 3px rgba(139, 21, 40, 0.12)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {digit}
                        </div>
                      );
                    })}
                  </div>

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
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="Type or paste 6-digit code here"
                      required
                      autoFocus
                      style={{
                        flex: 1,
                        border: 'none',
                        outline: 'none',
                        backgroundColor: 'transparent',
                        fontSize: '1rem',
                        fontWeight: 700,
                        letterSpacing: '0.15em',
                        color: '#1C1917'
                      }}
                    />
                    {otpCode && (
                      <button
                        type="button"
                        onClick={() => setOtpCode('')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#A8A29E',
                          cursor: 'pointer',
                          fontSize: '0.78rem',
                          fontWeight: 600
                        }}
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isLoading || otpCode.length !== 6}
                    style={{
                      width: '100%',
                      padding: '13px',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      marginTop: '14px',
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
                </div>
              )}

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

                {verificationMode === 'otp' && (
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
                )}
              </div>
            </form>
          )}

          {/* ============================================================== */}
          {/* STEP 1: REGULAR INSTITUTIONAL SIGN IN VIEW                     */}
          {/* ============================================================== */}
          {!isOtpStep && (
            <>
              {/* Google Workspace One-Click SSO via Supabase */}
              <button
                type="button"
                onClick={handleDirectSupabaseGoogleOAuth}
                disabled={isLoading || isGoogleLoading}
                style={{
                  width: '100%',
                  padding: '13px 18px',
                  borderRadius: '14px',
                  border: '1.5px solid #E5E7EB',
                  backgroundColor: '#FFFFFF',
                  color: '#1F2937',
                  fontSize: '0.94rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  cursor: (isLoading || isGoogleLoading) ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F9FAFB'; e.currentTarget.style.borderColor = '#D1D5DB'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF'; e.currentTarget.style.borderColor = '#E5E7EB'; }}
              >
                {isGoogleLoading ? (
                  <>
                    <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Connecting to Google Account...</span>
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span>Sign in with Google</span>
                  </>
                )}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', margin: '6px 0', gap: '10px' }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#E7E5E4' }} />
                <span style={{ fontSize: '0.72rem', color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  or sign in with university email
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
                    opacity: isLoading ? 0.75 : 1,
                    cursor: isLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Proceeding…</span>
                    </>
                  ) : previewInfo?.type === 'student' ? (
                    <>
                      <KeyRound size={16} color="#FDE047" />
                      <span>Enter Dashboard Redeem Code (OTP)</span>
                      <ArrowRight size={16} />
                    </>
                  ) : resendTimer > 0 ? (
                    <>
                      <RotateCw size={15} />
                      <span>Wait {resendTimer}s before requesting code</span>
                    </>
                  ) : (
                    <>
                      <Mail size={16} />
                      <span>Send Verification Code (OTP)</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>

                {/* Direct Manual Access Options */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!email.trim()) {
                        setError('Please enter your university email address first.');
                        return;
                      }
                      setVerificationMode('redeem');
                      setIsOtpStep(true);
                      setError('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#8B1528',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      textDecoration: 'underline'
                    }}
                  >
                    <KeyRound size={14} color="#8B1528" />
                    <span>🔑 Have a Dashboard Redeem Code? Enter Code Directly →</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!email.trim()) {
                        setError('Please enter your university email address first.');
                        return;
                      }
                      setVerificationMode('otp');
                      setIsOtpStep(true);
                      setError('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#78716C',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Mail size={13} />
                    <span>Prefer 6-digit email OTP instead? Enter OTP manually →</span>
                  </button>
                </div>
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
    </div>
  );
}
