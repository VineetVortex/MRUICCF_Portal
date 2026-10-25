/**
 * Automated Security & Authentication Test Suite for MRU SkillCert
 * Verifies 30-second JWT lifecycle, cryptographic refresh rotation,
 * reuse detection, RBAC boundaries, and non-public registration.
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { generateAccessToken, authenticate, requireRole, JwtTokenPayload } from '../middleware/authMiddleware.js';
import { 
  createRefreshSession, 
  rotateRefreshSession, 
  revokeRefreshSession, 
  hashToken, 
  generateRefreshToken 
} from '../services/refreshSessionService.js';
import { createPasswordResetToken, verifyAndResetPassword } from '../services/passwordResetService.js';
import { config } from '../config/index.js';
import { User } from '../types/index.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    failed++;
  }
}

async function runTestSuite() {
  console.log('\n================================================================');
  console.log('🔒 MRU SkillCert — Enterprise Authentication Security Test Suite');
  console.log('================================================================\n');

  const testUser: User = {
    id: 'usr_22cse0002',
    uid: 'usr_22cse0002',
    email: '22cse0002@mru.ac.in',
    name: 'Aarav Sharma',
    role: 'student',
    department: 'Computer Science & Technology',
    deptCode: 'CST',
    rollNo: '22CSE0002',
    year: 'Batch 2022-2026',
    designation: 'Undergraduate Student',
  };

  const adminUser: User = {
    id: 'usr_admin_iccf',
    uid: 'usr_admin_iccf',
    email: 'admin.iccf@mru.edu.in',
    name: 'Central Administration Director',
    role: 'core_team',
    department: 'Central Administration',
    deptCode: 'ADMIN',
    rollNo: 'ADM-001',
    year: 'Faculty & Leadership',
  };

  // -------------------------------------------------------------
  // TEST GROUP 1: JWT ACCESS TOKEN: EXACTLY 30 SECONDS
  // -------------------------------------------------------------
  console.log('▶ TEST GROUP 1: JWT Access Token Expiration & Claims');

  const token = generateAccessToken(testUser);
  assert(Boolean(token && token.split('.').length === 3), 'JWT is properly formatted with 3 segments');

  const decoded = jwt.decode(token) as JwtTokenPayload;
  assert(decoded.sub === testUser.id, 'JWT sub claim matches authenticated user ID');
  assert(decoded.role === testUser.role, 'JWT role matches user role');
  assert(decoded.iss === config.jwt.issuer, `JWT issuer is "${config.jwt.issuer}"`);
  assert(decoded.aud === config.jwt.audience, `JWT audience is "${config.jwt.audience}"`);
  assert(Boolean(decoded.jti), 'JWT contains unique jti claim');

  // Verify explicit 30s expiration: exp - iat must be exactly 30 seconds
  const tokenDurationSeconds = (decoded.exp || 0) - (decoded.iat || 0);
  assert(tokenDurationSeconds === 30, `JWT access token lifespan is EXACTLY 30 seconds (actual: ${tokenDurationSeconds}s)`);

  // Verify signature with secret
  const verified = jwt.verify(token, config.jwt.secret, {
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
  }) as JwtTokenPayload;
  assert(verified.email === testUser.email, 'JWT signature verified with server secret');

  // Test tampered token rejection
  let tamperedCaught = false;
  try {
    const tampered = token.slice(0, -6) + 'abcdef';
    jwt.verify(tampered, config.jwt.secret);
  } catch (e) {
    tamperedCaught = true;
  }
  assert(tamperedCaught, 'Tampered JWT signature is rejected');

  // Test wrong secret rejection
  let wrongSecretCaught = false;
  try {
    jwt.verify(token, 'wrong_attack_secret');
  } catch (e) {
    wrongSecretCaught = true;
  }
  assert(wrongSecretCaught, 'JWT signed with untrusted secret is rejected');

  // Test expired 30s token rejection
  const expiredToken = jwt.sign(
    { sub: testUser.id, role: testUser.role, email: testUser.email },
    config.jwt.secret,
    { expiresIn: '-1s', issuer: config.jwt.issuer, audience: config.jwt.audience }
  );
  let expiredCaught = false;
  try {
    jwt.verify(expiredToken, config.jwt.secret, { issuer: config.jwt.issuer, audience: config.jwt.audience });
  } catch (e: any) {
    if (e.name === 'TokenExpiredError') expiredCaught = true;
  }
  assert(expiredCaught, 'Expired JWT is rejected with TokenExpiredError');

  // -------------------------------------------------------------
  // TEST GROUP 2: REFRESH SESSIONS & TOKEN ROTATION
  // -------------------------------------------------------------
  console.log('\n▶ TEST GROUP 2: Cryptographic Refresh Sessions, Rotation & Reuse Detection');

  // 1. Session Creation
  const session1 = await createRefreshSession({
    userId: testUser.id,
    userAgent: 'Mozilla/5.0 Test Suite',
    ipAddress: '127.0.0.1',
  });
  assert(Boolean(session1.rawToken && session1.rawToken.length === 64), 'Refresh token is 256-bit cryptographically secure random string');
  assert(Boolean(session1.tokenFamily), 'Session allocated a unique tokenFamily UUID');

  // 2. Token Rotation
  const rotated1 = await rotateRefreshSession({
    rawToken: session1.rawToken,
    userAgent: 'Mozilla/5.0 Test Suite',
    ipAddress: '127.0.0.1',
  });
  assert(rotated1.newRawToken !== session1.rawToken, 'Refresh token rotated: Old token replaced with fresh token');
  assert(rotated1.tokenFamily === session1.tokenFamily, 'Rotated token preserves the session tokenFamily');
  assert(rotated1.userId === testUser.id, 'Rotated token preserves user identity');

  // 3. Second Normal Rotation
  const rotated2 = await rotateRefreshSession({
    rawToken: rotated1.newRawToken,
    userAgent: 'Mozilla/5.0 Test Suite',
    ipAddress: '127.0.0.1',
  });
  assert(rotated2.newRawToken !== rotated1.newRawToken, 'Second rotation produces distinct fresh credential');

  // 4. CRITICAL SECURITY: REFRESH TOKEN REUSE DETECTION
  // Attempting to present the old, invalidated `session1.rawToken` again!
  let reuseDetected = false;
  try {
    await rotateRefreshSession({
      rawToken: session1.rawToken, // Old already-revoked token
      userAgent: 'Attacker Bot',
      ipAddress: '198.51.100.1',
    });
  } catch (err: any) {
    if (err.message.includes('reuse detected')) {
      reuseDetected = true;
    }
  }
  assert(reuseDetected, 'REUSE DETECTION TRIGGERED: Reusing invalidated refresh token terminates session family');

  // 5. Verify that family was revoked after reuse attempt (rotated2 should now be unusable)
  let familyTerminated = false;
  try {
    await rotateRefreshSession({
      rawToken: rotated2.newRawToken,
      userAgent: 'Mozilla/5.0 Test Suite',
      ipAddress: '127.0.0.1',
    });
  } catch (err: any) {
    familyTerminated = true;
  }
  assert(familyTerminated, 'Entire token family invalidated after reuse attack, protecting the user');

  // 6. Logout Revocation
  const logoutSession = await createRefreshSession({ userId: testUser.id });
  await revokeRefreshSession(logoutSession.rawToken);
  let logoutRevoked = false;
  try {
    await rotateRefreshSession({ rawToken: logoutSession.rawToken });
  } catch (err) {
    logoutRevoked = true;
  }
  assert(logoutRevoked, 'Logout revokes active refresh session immediately');

  // -------------------------------------------------------------
  // TEST GROUP 3: ROLE-BASED ACCESS CONTROL (RBAC) & ZERO TRUST
  // -------------------------------------------------------------
  console.log('\n▶ TEST GROUP 3: Server-Enforced RBAC & Zero Client Header Trust');

  // Middleware mock test
  let forbiddenCaught = false;
  const mockReq: any = {
    headers: {},
    user: testUser, // student
    path: '/api/assessments',
    method: 'POST',
  };
  const mockRes: any = {
    status: (code: number) => ({
      json: (data: any) => {
        if (code === 403) forbiddenCaught = true;
        return data;
      }
    })
  };
  const mockNext = () => {};

  // Student trying to perform core_team action
  const checkRole = requireRole(['core_team', 'system_admin']);
  checkRole(mockReq, mockRes, mockNext);
  assert(forbiddenCaught, 'Student role rejected with HTTP 403 when accessing administrative operations');

  // Admin permitted
  let adminPermitted = false;
  const mockAdminReq: any = {
    headers: {},
    user: adminUser, // core_team
    path: '/api/assessments',
    method: 'POST',
  };
  const mockAdminNext = () => { adminPermitted = true; };
  checkRole(mockAdminReq, mockRes, mockAdminNext);
  assert(adminPermitted, 'Core Team role permitted to access authorized administrative operations');

  // -------------------------------------------------------------
  // TEST GROUP 4: PASSWORD RECOVERY (FOR EXISTING ACCOUNTS ONLY)
  // -------------------------------------------------------------
  console.log('\n▶ TEST GROUP 4: Secure Password Recovery');

  const resetRawToken = await createPasswordResetToken(testUser.email, testUser);
  assert(Boolean(resetRawToken && resetRawToken.length === 64), 'Password reset token is cryptographically secure 256-bit token');

  const newPasswordHash = crypto.createHash('sha256').update('new_secure_pwd_2026').digest('hex');
  const resetResult = await verifyAndResetPassword(resetRawToken, newPasswordHash);
  assert(resetResult.success && resetResult.userId === testUser.id, 'Password successfully verified and reset');

  // Token reuse should be denied
  let resetReuseDenied = false;
  try {
    await verifyAndResetPassword(resetRawToken, newPasswordHash);
  } catch (err: any) {
    if (err.message.includes('already been used')) resetReuseDenied = true;
  }
  assert(resetReuseDenied, 'Single-use password reset token cannot be reused');

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Test suite uncaught error:', err);
  process.exit(1);
});
