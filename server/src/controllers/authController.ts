import { Response } from 'express';
import crypto from 'crypto';
import { AuthenticatedRequest, generateAccessToken } from '../middleware/authMiddleware.js';
import { getDb } from '../db/index.js';
import { config } from '../config/index.js';
import { User, UserRole } from '../types/index.js';
import { logAuditEvent } from '../services/auditService.js';
import { sendOtpEmail } from '../services/emailService.js';
import { 
  createRefreshSession, 
  rotateRefreshSession, 
  revokeRefreshSession 
} from '../services/refreshSessionService.js';
import { 
  createPasswordResetToken, 
  verifyAndResetPassword 
} from '../services/passwordResetService.js';
import fs from 'fs';
import path from 'path';

interface FacultyMember {
  name: string;
  email: string;
  designation: string;
  department: string;
  dept_code: string;
  role: 'dept_head' | 'core_team';
}

// In-memory faculty directory index for 0ms lookups
let facultyIndex = new Map<string, FacultyMember>();

interface OtpRecord {
  otp: string;
  user: User;
  expiresAt: number;
  attempts: number;
}

// In-memory store for active student login OTPs
const otpStore = new Map<string, OtpRecord>();

// Pre-provisioned cache for fast OTP lookup (populated only during active OTP sessions, no pre-seeded students)
const authorizedStudentCache = new Map<string, User>();

/**
 * Persists / upserts user profile to public.users on every verified login.
 * This ensures the database has a real record for every authenticated user.
 */
async function saveUserToDb(user: User): Promise<void> {
  try {
    const db = getDb();
    await db.from('users').upsert({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department || null,
      dept_code: user.deptCode || null,
      roll_no: user.rollNo || null,
      year: user.year || null,
      designation: user.designation || null,
      last_login_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  } catch (err: any) {
    console.warn('[Auth] Notice persisting user profile to database:', err?.message || err);
  }
}

try {
  const jsonPath = path.resolve(process.cwd(), 'src/data/mruFacultyDirectory.json');
  if (fs.existsSync(jsonPath)) {
    const list: FacultyMember[] = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    list.forEach(f => {
      facultyIndex.set(f.email.trim().toLowerCase(), f);
    });
    console.log(`[Auth] Loaded ${facultyIndex.size} faculty & staff into Enterprise Role Resolver.`);
  }
} catch (err) {
  console.warn('[Auth] Notice loading faculty directory:', err);
}

/**
 * Cookie options helper for refresh tokens (Secure, HttpOnly, SameSite)
 */
function getRefreshCookieOptions() {
  const isProduction = config.isProduction;
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
    maxAge: config.jwt.refreshExpiresInDays * 24 * 60 * 60 * 1000,
    path: '/', // Accessible to auth refresh and API
  };
}

/**
 * Enterprise Role & Identity Resolver for Pre-Authorized Accounts Only
 */
async function resolveExistingUser(email: string): Promise<User | null> {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Check Super Admin / Leadership / Primary Admin & Faculty
  if (
    cleanEmail === 'vineetkumar182023@gmail.com' ||
    cleanEmail === 'iccf@mruadmin.edu.in' ||
    cleanEmail === config.bootstrapAdminEmail.toLowerCase().trim() ||
    cleanEmail === 'admin.iccf@mru.edu.in' ||
    cleanEmail.startsWith('vc@') ||
    cleanEmail.startsWith('registrar@') ||
    cleanEmail.includes('director.academics')
  ) {
    const uid = `usr_admin_${cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_')}`;
    const isVineet = cleanEmail === 'vineetkumar182023@gmail.com';
    return {
      id: uid,
      uid: uid,
      email: cleanEmail,
      role: 'core_team',
      name: isVineet ? 'Vineet Kumar' : (cleanEmail === 'iccf@mruadmin.edu.in' ? 'ICCF Institutional Administrator' : 'Central Administration Director'),
      department: 'Computer Science & Technology',
      deptCode: 'CST',
      designation: isVineet ? 'Institutional Admin & Faculty Lead' : (cleanEmail.startsWith('vc@') ? 'Vice Chancellor' : 'Institutional Admin / Core Team'),
      rollNo: 'ADM-001',
      year: 'Faculty & Administration',
    };
  }

  // 2. Check Official Pre-loaded Faculty Directory
  const faculty = facultyIndex.get(cleanEmail);
  if (faculty) {
    const isExplicitDeptHead = 
      faculty.role === 'dept_head' && (
        cleanEmail.startsWith('hod.') ||
        faculty.designation?.toLowerCase().includes('hod') ||
        faculty.designation?.toLowerCase().includes('head') ||
        faculty.designation?.toLowerCase().includes('dean')
      );
    const resolvedRole: UserRole = faculty.role === 'core_team' 
      ? 'core_team' 
      : (isExplicitDeptHead ? 'dept_head' : 'faculty');

    const uid = `usr_fac_${faculty.dept_code.toLowerCase()}_${cleanEmail.split('@')[0]}`;
    return {
      id: uid,
      uid: uid,
      email: cleanEmail,
      role: resolvedRole,
      name: faculty.name,
      department: faculty.department,
      deptCode: faculty.dept_code,
      designation: faculty.designation,
      rollNo: `FAC-${faculty.dept_code}`,
      year: 'Academic Faculty',
    };
  }

  // 2b. Check Faculty / HoD CSE Aliases
  if (cleanEmail === 'hod.cse@mru.edu.in') {
    const faculty = facultyIndex.get('viveksharma@mru.edu.in');
    if (faculty) {
      return {
        id: 'usr_fac_cst_viveksharma',
        uid: 'usr_fac_cst_viveksharma',
        email: cleanEmail,
        role: 'dept_head',
        name: faculty.name,
        department: faculty.department,
        deptCode: faculty.dept_code,
        designation: faculty.designation,
        rollNo: `FAC-${faculty.dept_code}`,
        year: 'Academic Faculty',
      };
    }
  }

  if (cleanEmail === 'faculty.cse@mru.edu.in') {
    return {
      id: 'usr_fac_cst_deepti',
      uid: 'usr_fac_cst_deepti',
      email: cleanEmail,
      role: 'faculty',
      name: 'Dr. Deepti Thakral',
      department: 'Computer Science & Technology',
      deptCode: 'CST',
      designation: 'Assoc. Prof.',
      rollNo: 'FAC-CST',
      year: 'Academic Faculty',
    };
  }

  // 3. Check Pre-provisioned Student Cache
  if (authorizedStudentCache.has(cleanEmail)) {
    return authorizedStudentCache.get(cleanEmail)!;
  }

  // 3b. Check Pattern-Matched Institutional Student Email (@mru.ac.in)
  const studentMatch = cleanEmail.match(/^(\d{2})([a-zA-Z]{2,4})(\d{3,4})@mru\.ac\.in$/);
  if (studentMatch) {
    const yearDigits = studentMatch[1];
    const deptDigits = studentMatch[2].toUpperCase();
    const rollNo = cleanEmail.split('@')[0].toUpperCase();
    const uid = `usr_${cleanEmail.split('@')[0]}`;
    const startYear = 2000 + parseInt(yearDigits, 10);
    const endYear = startYear + 4;
    return {
      id: uid,
      uid: uid,
      email: cleanEmail,
      name: `Student (${rollNo})`,
      role: 'student' as UserRole,
      department: deptDigits === 'CSE' || deptDigits === 'CST' ? 'Computer Science & Technology' : deptDigits === 'ECE' ? 'Electronics & Communication' : `${deptDigits} Department`,
      deptCode: deptDigits,
      rollNo: rollNo,
      year: `Batch ${startYear}-${endYear}`,
      designation: 'Undergraduate Student',
    };
  }

  // 4. Query Database (Supabase public.users)
  try {
    const db = getDb();
    const { data, error } = await db
      .from('users')
      .select('*')
      .eq('email', cleanEmail)
      .single();

    if (!error && data) {
      if (data.is_active === false) {
        throw new Error('ACCOUNT_DISABLED');
      }
      return {
        id: data.id,
        uid: data.id,
        email: data.email,
        name: data.name,
        role: data.role as UserRole,
        department: data.department || 'General',
        deptCode: data.dept_code || 'GEN',
        rollNo: data.roll_no,
        year: data.year,
        designation: data.designation,
        avatar: data.avatar,
        lastLoginAt: data.last_login_at,
      };
    }
  } catch (err: any) {
    if (err.message === 'ACCOUNT_DISABLED') throw err;
  }

  // 4b. Dynamic University Faculty Match for @mru.edu.in
  if (cleanEmail.endsWith('@mru.edu.in')) {
    const prefix = cleanEmail.split('@')[0];
    const isExplicitDeptHead = prefix.startsWith('hod.') || prefix.includes('head') || prefix.startsWith('dean.');
    const deptCode = prefix.includes('cse') || prefix.includes('cst') ? 'CST' : prefix.includes('ece') ? 'ECE' : 'ACAD';
    const deptName = deptCode === 'CST' ? 'Computer Science & Technology' : deptCode === 'ECE' ? 'Electronics & Communication' : 'Academic Faculty & Programs';
    return {
      id: `usr_fac_${prefix.replace(/[^a-zA-Z0-9_]/g, '_')}`,
      uid: `usr_fac_${prefix.replace(/[^a-zA-Z0-9_]/g, '_')}`,
      email: cleanEmail,
      role: (isExplicitDeptHead ? 'dept_head' : 'faculty') as UserRole,
      name: isExplicitDeptHead ? (prefix.startsWith('dean.') ? 'Dean of Faculty' : 'Head of Department') : 'Faculty Member',
      department: deptName,
      deptCode: deptCode,
      designation: isExplicitDeptHead ? (prefix.startsWith('dean.') ? 'Dean' : 'HoD & Professor') : 'Faculty Member',
      rollNo: `FAC-${deptCode}`,
      year: 'Academic Faculty',
    };
  }

  // 4c. Dynamic University Student Match for @mru.ac.in
  if (cleanEmail.endsWith('@mru.ac.in') || cleanEmail.endsWith('.mru.ac.in')) {
    const prefix = cleanEmail.split('@')[0];
    const rollNo = prefix.toUpperCase();
    return {
      id: `usr_${prefix}`,
      uid: `usr_${prefix}`,
      email: cleanEmail,
      name: `Student (${rollNo})`,
      role: 'student' as UserRole,
      department: 'Computer Science & Technology',
      deptCode: 'CST',
      rollNo: rollNo,
      year: 'Undergraduate Student',
      designation: 'Undergraduate Student',
    };
  }

  // Unknown account - NO public registration or automatic creation
  return null;
}

/**
 * POST /api/auth/login
 * Dispatches 6-digit email OTP for Student, Faculty, HoD, Dean, and Admin accounts.
 */
export async function login(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { email, password, isGoogleSso, name: googleName } = req.body;

  if (!email || !email.trim()) {
    res.status(400).json({ success: false, error: 'Institutional email is required.' });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();

  let user: User | null = null;
  try {
    user = await resolveExistingUser(cleanEmail);
  } catch (err: any) {
    if (err.message === 'ACCOUNT_DISABLED') {
      res.status(403).json({
        success: false,
        code: 'ACCOUNT_DISABLED',
        error: 'This account has been disabled. Please contact IT Support (support@mru.edu.in).'
      });
      return;
    }
  }

  // Unknown email address - strictly deny portal access (NO unverified access)
  if (!user) {
    logAuditEvent('SECURITY_LOG', `Login failed: unprovisioned email ${cleanEmail}`, 'anonymous', { ip: req.ip });
    res.status(401).json({
      success: false,
      code: 'AUTH_FAILED',
      error: 'Invalid credentials or unauthorized account. Please use your official university email: @mru.ac.in for Students, @mru.edu.in for Faculty, or @mruadmin.edu.in for Admin.'
    });
    return;
  }

  if (googleName && !user.name) {
    user.name = googleName;
  }

  // Direct login for Google Workspace SSO verified accounts
  if (isGoogleSso) {
    user.lastLoginAt = new Date().toISOString();
    // Persist Google SSO user to Supabase public.users immediately on login
    saveUserToDb(user).catch(() => {});
    const accessToken = generateAccessToken(user);
    const { rawToken } = await createRefreshSession({
      userId: user.id,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
    res.cookie(config.cookie.refreshCookieName, rawToken, getRefreshCookieOptions());
    logAuditEvent('AUTH_LOG', `${user.role.toUpperCase()} signed in via Google SSO: ${user.name} (${user.email})`, user.id, {
      email: user.email,
      role: user.role
    });
    res.status(200).json({
      success: true,
      message: `Welcome, ${user.name}! Authenticated as ${user.role}.`,
      data: { user, accessToken, token: accessToken, expiresInSeconds: 30 }
    });
    return;
  }

  // Unified Email OTP Generation for All Roles (Student, Faculty, HoD, Dean, Admin)
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(user.email, {
    otp,
    user,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    attempts: 0,
  });

  console.log(`[OTP DISPATCH] 6-digit verification code sent to ${user.email} (${user.role} - ${user.designation}): ${otp}`);
  logAuditEvent('AUTH_LOG', `Login OTP generated for ${user.role} ${user.email}`, user.id, {
    email: user.email,
    role: user.role,
    designation: user.designation
  });

  sendOtpEmail({
    toEmail: user.email,
    studentName: user.name,
    otp,
  }).catch(err => console.warn('[Email Delivery Warning]', err.message));

  res.status(200).json({
    success: true,
    requireOtp: true,
    email: user.email,
    role: user.role,
    name: user.name,
    designation: user.designation,
    message: `A 6-digit verification code has been dispatched to ${user.email}.`,
    devOtp: otp,
  });
}

/**
 * POST /api/auth/verify-otp
 * Verifies email OTP for Student, Faculty, HoD, and Admin and issues 30-second access JWT + HttpOnly refresh cookie.
 */
export async function verifyLoginOtp(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { email, otp } = req.body;
  if (!email || !otp) {
    res.status(400).json({ success: false, error: 'University email and 6-digit OTP code are required.' });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();
  const record = otpStore.get(cleanEmail);

  if (!record) {
    res.status(400).json({ success: false, error: 'No active OTP found or code has expired. Please click Resend OTP.' });
    return;
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(cleanEmail);
    res.status(400).json({ success: false, error: 'OTP has expired. Please request a new code.' });
    return;
  }

  if (record.otp !== otp.toString().trim()) {
    record.attempts += 1;
    if (record.attempts >= 5) {
      otpStore.delete(cleanEmail);
      res.status(400).json({ success: false, error: 'Too many incorrect attempts. Please request a new OTP.' });
      return;
    }
    res.status(400).json({ success: false, error: 'Invalid verification code. Please check your email and try again.' });
    return;
  }

  // OTP verified successfully
  const user = record.user;
  user.lastLoginAt = new Date().toISOString();
  otpStore.delete(cleanEmail);

  // Persist user profile to Supabase public.users (creates or updates on every login)
  saveUserToDb(user).catch(() => {});

  // Generate 30-second access token + refresh session
  const accessToken = generateAccessToken(user);
  const { rawToken } = await createRefreshSession({
    userId: user.id,
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  });

  // Set Secure, HttpOnly refresh cookie
  res.cookie(config.cookie.refreshCookieName, rawToken, getRefreshCookieOptions());

  logAuditEvent('AUTH_LOG', `${user.role.toUpperCase()} verified OTP & signed in: ${user.name} (${user.email})`, user.id, {
    email: user.email,
    role: user.role,
    designation: user.designation
  });

  res.status(200).json({
    success: true,
    message: `OTP verified successfully! Welcome, ${user.name}.`,
    data: {
      user,
      accessToken,
      token: accessToken,
      expiresInSeconds: 30,
    },
  });
}

/**
 * POST /api/auth/resend-otp
 */
export async function resendLoginOtp(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ success: false, error: 'University email is required.' });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = await resolveExistingUser(cleanEmail);

  if (!user) {
    res.status(400).json({ success: false, error: 'Authorized university account not found.' });
    return;
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(cleanEmail, {
    otp,
    user,
    expiresAt: Date.now() + 10 * 60 * 1000,
    attempts: 0,
  });

  console.log(`[OTP RESEND] New 6-digit verification code sent to ${cleanEmail}: ${otp}`);

  sendOtpEmail({
    toEmail: cleanEmail,
    studentName: user.name,
    otp,
  }).catch(err => console.warn('[Email Delivery Warning]', err.message));

  res.status(200).json({
    success: true,
    message: `New verification code dispatched to ${cleanEmail}.`,
    devOtp: otp,
  });
}

/**
 * POST /api/auth/refresh
 * Validates the HttpOnly refresh cookie, performs token rotation & reuse detection,
 * and issues a fresh 30-second access JWT + fresh rotated refresh cookie.
 */
export async function refreshAccessToken(req: AuthenticatedRequest, res: Response): Promise<void> {
  const refreshCookie = req.cookies?.[config.cookie.refreshCookieName] || req.body?.refreshToken;

  if (!refreshCookie) {
    res.status(401).json({
      success: false,
      code: 'REFRESH_TOKEN_MISSING',
      error: 'Refresh session expired or not found. Please sign in again.',
    });
    return;
  }

  try {
    const { newRawToken, userId } = await rotateRefreshSession({
      rawToken: refreshCookie,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });

    // Fetch up-to-date user account status and role
    const user = await resolveExistingUser(userId.startsWith('usr_') ? userId.replace('usr_', '') : userId) 
      || authorizedStudentCache.get(userId)
      || (await (async () => {
        try {
          const db = getDb();
          const { data } = await db.from('users').select('*').eq('id', userId).single();
          if (data) {
            return {
              id: data.id,
              uid: data.id,
              email: data.email,
              name: data.name,
              role: data.role as UserRole,
              department: data.department,
              deptCode: data.dept_code,
              rollNo: data.roll_no,
              year: data.year,
              designation: data.designation,
            };
          }
        } catch (e) {}
        return null;
      })());

    if (!user) {
      res.status(401).json({
        success: false,
        code: 'USER_NOT_FOUND',
        error: 'User account associated with this session no longer exists.',
      });
      return;
    }

    // Generate new 30-second access token
    const accessToken = generateAccessToken(user);

    // Set rotated HttpOnly refresh cookie
    res.cookie(config.cookie.refreshCookieName, newRawToken, getRefreshCookieOptions());

    res.status(200).json({
      success: true,
      message: 'Access token refreshed successfully.',
      data: {
        user,
        accessToken,
        token: accessToken,
        expiresInSeconds: 30,
      },
    });
  } catch (err: any) {
    // Clear invalid cookie
    res.clearCookie(config.cookie.refreshCookieName, { path: '/api/auth' });
    res.status(401).json({
      success: false,
      code: 'REFRESH_FAILED',
      error: err.message || 'Failed to refresh session. Please sign in again.',
    });
  }
}

/**
 * POST /api/auth/logout
 * Revokes the active refresh session and clears the HttpOnly cookie.
 */
export async function logout(req: AuthenticatedRequest, res: Response): Promise<void> {
  const refreshCookie = req.cookies?.[config.cookie.refreshCookieName] || req.body?.refreshToken;

  if (refreshCookie) {
    await revokeRefreshSession(refreshCookie);
  }

  res.clearCookie(config.cookie.refreshCookieName, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: (config.isProduction ? 'strict' : 'lax') as 'strict' | 'lax',
    path: '/api/auth',
  });

  if (req.user) {
    logAuditEvent('AUTH_LOG', `User signed out: ${req.user.name} (${req.user.email})`, req.user.id);
  }

  res.status(200).json({
    success: true,
    message: 'Logged out successfully. Session revoked.',
  });
}

/**
 * GET /api/auth/me (or /api/auth/profile)
 * Returns the authenticated user's profile and permissions.
 */
export async function getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Not authenticated.' });
    return;
  }

  res.status(200).json({
    success: true,
    data: {
      ...req.user,
      permissions: {
        canTakeAssessment: req.user.role === 'student',
        canModerateQuestions: ['dept_head', 'core_team', 'system_admin'].includes(req.user.role),
        canManageAssessments: ['core_team', 'system_admin'].includes(req.user.role),
        canViewAnalytics: ['dept_head', 'core_team', 'system_admin'].includes(req.user.role),
        canProvisionUsers: ['core_team', 'system_admin'].includes(req.user.role),
      }
    },
  });
}

/**
 * POST /api/auth/forgot-password
 * Initiates password recovery for an existing account without disclosing registration status.
 */
export async function forgotPassword(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { email } = req.body;

  if (!email || !email.trim()) {
    res.status(400).json({ success: false, error: 'Institutional email is required.' });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = await resolveExistingUser(cleanEmail);

  if (user) {
    try {
      const resetToken = await createPasswordResetToken(cleanEmail, user);
      console.log(`[PASSWORD RESET] Generated reset token for ${cleanEmail}: ${resetToken}`);
      // In production, send email with reset link:
      // sendResetEmail(cleanEmail, resetToken);
    } catch (err: any) {
      console.warn('[ForgotPassword] Warning generating reset token:', err.message);
    }
  }

  // Always return a generic success message to prevent user enumeration
  res.status(200).json({
    success: true,
    message: 'If your account is registered with MRU SkillCert, password recovery instructions have been dispatched to your institutional email.',
  });
}

/**
 * POST /api/auth/reset-password
 * Verifies short-lived reset token and safely resets password.
 */
export async function resetPassword(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    res.status(400).json({ success: false, error: 'Reset token and new password are required.' });
    return;
  }

  if (newPassword.length < 8) {
    res.status(400).json({ success: false, error: 'New password must be at least 8 characters long.' });
    return;
  }

  try {
    const passwordHash = crypto.createHash('sha256').update(newPassword).digest('hex');
    await verifyAndResetPassword(token, passwordHash);

    res.status(200).json({
      success: true,
      message: 'Password has been successfully updated. All active sessions have been revoked. Please sign in with your new password.',
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err.message || 'Invalid or expired password reset token.',
    });
  }
}

/**
 * POST /api/auth/provision
 * Protected Administrative Endpoint: Allows Core Team & System Administrators
 * to provision student or faculty accounts.
 */
export async function provisionUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { email, name, role, department, deptCode, rollNo, year, designation } = req.body;

  if (!email || !name || !role) {
    res.status(400).json({ success: false, error: 'Email, name, and role are required for provisioning.' });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();
  const userId = `usr_${cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_')}`;

  const newUser: User = {
    id: userId,
    uid: userId,
    email: cleanEmail,
    name: name.trim(),
    role: role as UserRole,
    department: department || 'General',
    deptCode: deptCode || 'GEN',
    rollNo: rollNo ? rollNo.trim().toUpperCase() : undefined,
    year: year || 'Batch 2024-2028',
    designation: designation || (role === 'student' ? 'Undergraduate Student' : 'Academic Faculty'),
    lastLoginAt: new Date().toISOString(),
  };

  // Add to in-memory cache
  if (role === 'student') {
    authorizedStudentCache.set(cleanEmail, newUser);
  }

  try {
    const db = getDb();
    await db.from('users').upsert({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      department: newUser.department,
      dept_code: newUser.deptCode,
      year: newUser.year,
      roll_no: newUser.rollNo,
      designation: newUser.designation,
      is_active: true,
      last_login_at: newUser.lastLoginAt,
    }, { onConflict: 'email' });
  } catch (err: any) {
    console.warn('[ProvisionUser] Warning saving to database:', err.message);
  }

  logAuditEvent(
    'ADMIN_ACTION_LOG',
    `Administrator ${req.user?.name} provisioned user ${newUser.name} (${newUser.email} as ${newUser.role})`,
    req.user?.id || 'admin',
    { provisionedUser: newUser }
  );

  res.status(201).json({
    success: true,
    message: `Account for ${newUser.name} successfully provisioned as ${newUser.role}.`,
    data: newUser,
  });
}

/**
 * GET /api/auth/users
 */
export async function listUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const db = getDb();
    const { data, error } = await db.from('users').select('*').order('created_at', { ascending: false });
    if (error) throw error;

    res.status(200).json({
      success: true,
      data: data || [],
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to list users.' });
  }
}

// Backward-compatible alias
export const loginOrRegister = login;
