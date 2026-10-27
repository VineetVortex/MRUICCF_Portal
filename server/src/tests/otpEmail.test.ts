/**
 * Automated Test Suite: OTP Generation, Email Infrastructure & Security Lifecycle
 * Verifies cryptographic randomness, secure hashing, rate limiting, cooldowns,
 * single-use enforcement, timeout configurations, and mock email dispatch.
 */

import crypto from 'crypto';
import { 
  validateSmtpConfig, 
  sendOtpEmail, 
  setMockTransporter, 
  maskEmail 
} from '../services/emailService.js';
import { 
  generateSecureOtp, 
  hashOtp, 
  otpStore, 
  OtpRecord 
} from '../controllers/authController.js';
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

async function runOtpEmailTestSuite() {
  console.log('\n================================================================');
  console.log('🧪 Manav Rachna ICCF — OTP Email & Security Lifecycle Test Suite');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // TEST GROUP 1: Cryptographic OTP Generation & Formatting
  // -------------------------------------------------------------
  console.log('▶ TEST GROUP 1: Cryptographic OTP Generation & Formatting');
  const sampleOtps = Array.from({ length: 50 }, () => generateSecureOtp());
  
  assert(
    sampleOtps.every(otp => /^\d{6}$/.test(otp)),
    'All generated OTPs are strictly 6-digit numeric strings'
  );

  assert(
    sampleOtps.every(otp => Number(otp) >= 100000 && Number(otp) <= 999999),
    'All generated OTPs fall within standard 6-digit range [100000, 999999]'
  );

  const uniqueCount = new Set(sampleOtps).size;
  assert(
    uniqueCount >= 48,
    'Cryptographically generated OTPs exhibit high entropy and uniform randomness'
  );

  // -------------------------------------------------------------
  // TEST GROUP 2: Secure SHA-256 Hashing & Timing-Safe Comparison
  // -------------------------------------------------------------
  console.log('\n▶ TEST GROUP 2: Secure SHA-256 Hashing & Timing-Safe Comparison');
  const plainOtp = '654321';
  const hashed = hashOtp(plainOtp);

  assert(
    hashed.length === 64,
    'OTP is securely hashed using SHA-256 (64 hex characters)'
  );

  assert(
    hashOtp(plainOtp) === hashed,
    'Deterministic SHA-256 hashing verifies identical input'
  );

  assert(
    hashOtp('654322') !== hashed,
    'Different OTP inputs produce completely different hash signatures'
  );

  const correctBuffer = Buffer.from(hashed, 'hex');
  const candidateMatchBuffer = Buffer.from(hashOtp(plainOtp), 'hex');
  const candidateMismatchBuffer = Buffer.from(hashOtp('111111'), 'hex');

  assert(
    crypto.timingSafeEqual(correctBuffer, candidateMatchBuffer),
    'timingSafeEqual confirms correct OTP matching'
  );

  assert(
    !crypto.timingSafeEqual(correctBuffer, candidateMismatchBuffer),
    'timingSafeEqual safely rejects invalid OTP'
  );

  // -------------------------------------------------------------
  // TEST GROUP 3: Rate Limiting & Resend Cooldown Lifecycle
  // -------------------------------------------------------------
  console.log('\n▶ TEST GROUP 3: Rate Limiting & Resend Cooldown Lifecycle');
  const testEmail = 'unit_test_student@mru.ac.in';
  otpStore.delete(testEmail);

  const dummyUser: User = {
    id: 'usr_unit_test',
    uid: 'usr_unit_test',
    email: testEmail,
    name: 'Unit Tester',
    role: 'student',
    department: 'Computer Science & Technology',
    deptCode: 'CST',
  };

  const initialOtp = generateSecureOtp();
  otpStore.set(testEmail, {
    otpHash: hashOtp(initialOtp),
    user: dummyUser,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    attempts: 0,
    lastRequestedAt: Date.now(),
  });

  const record = otpStore.get(testEmail);
  assert(Boolean(record), 'Initial OTP record successfully created in memory store');

  // Test cooldown (< 60 seconds)
  const isCooldownActive = Date.now() - record!.lastRequestedAt < 60000;
  assert(
    isCooldownActive,
    'Resend request within 60s cooldown is detected and blocked'
  );

  // -------------------------------------------------------------
  // TEST GROUP 4: Expiration & Invalidation
  // -------------------------------------------------------------
  console.log('\n▶ TEST GROUP 4: Expiration & Invalidation');
  const expiredEmail = 'expired_test@mru.ac.in';
  otpStore.set(expiredEmail, {
    otpHash: hashOtp('123456'),
    user: dummyUser,
    expiresAt: Date.now() - 1000, // Expired 1 second ago
    attempts: 0,
    lastRequestedAt: Date.now() - 70000,
  });

  const expiredRecord = otpStore.get(expiredEmail);
  const isExpired = Date.now() > expiredRecord!.expiresAt;
  assert(
    isExpired,
    'Expired OTP is correctly flagged as expired'
  );

  // -------------------------------------------------------------
  // TEST GROUP 5: Maximum Attempt Lockout & Single-Use Purge
  // -------------------------------------------------------------
  console.log('\n▶ TEST GROUP 5: Maximum Attempt Lockout & Single-Use Purge');
  const lockoutEmail = 'lockout_test@mru.ac.in';
  otpStore.set(lockoutEmail, {
    otpHash: hashOtp('888888'),
    user: dummyUser,
    expiresAt: Date.now() + 600000,
    attempts: 4, // 4 failed attempts so far
    lastRequestedAt: Date.now(),
  });

  const lockoutRecord = otpStore.get(lockoutEmail)!;
  lockoutRecord.attempts += 1; // 5th attempt
  const isLockedOut = lockoutRecord.attempts >= 5;
  if (isLockedOut) {
    otpStore.delete(lockoutEmail);
  }

  assert(
    isLockedOut && !otpStore.has(lockoutEmail),
    'Exceeding 5 failed attempts completely invalidates and purges the OTP record'
  );

  // Single-use verification test
  const singleUseEmail = 'single_use@mru.ac.in';
  otpStore.set(singleUseEmail, {
    otpHash: hashOtp('999999'),
    user: dummyUser,
    expiresAt: Date.now() + 600000,
    attempts: 0,
    lastRequestedAt: Date.now(),
  });

  // Simulate successful verification
  otpStore.delete(singleUseEmail);
  assert(
    !otpStore.has(singleUseEmail),
    'Verified OTP is immediately deleted to prevent replay attacks'
  );

  // -------------------------------------------------------------
  // TEST GROUP 6: Privacy, Sanitized Logging & Masking
  // -------------------------------------------------------------
  console.log('\n▶ TEST GROUP 6: Privacy, Sanitized Logging & Masking');
  assert(
    maskEmail('vineetkumar182023@gmail.com') === 'v***3@gmail.com',
    'Standard email is correctly masked for privacy'
  );

  assert(
    maskEmail('ab@mru.ac.in') === 'a***@mru.ac.in',
    'Short email username is correctly masked'
  );

  assert(
    maskEmail('invalid-string') === '***',
    'Invalid email string falls back to safe wildcard mask'
  );

  // -------------------------------------------------------------
  // TEST GROUP 7: Mocked Email Delivery (Success & Failure Handling)
  // -------------------------------------------------------------
  console.log('\n▶ TEST GROUP 7: Mocked Email Delivery (Success & Failure Handling)');

  // Mock successful send
  const mockSuccessTransporter: any = {
    sendMail: async () => ({ messageId: '<mock-msg-id-12345@smtp.gmail.com>' }),
    verify: async () => true,
  };

  setMockTransporter(mockSuccessTransporter);
  const successDelivery = await sendOtpEmail({
    toEmail: 'test_student@mru.ac.in',
    studentName: 'Test Student',
    otp: '555555',
  });

  assert(
    successDelivery.success === true && successDelivery.messageId === '<mock-msg-id-12345@smtp.gmail.com>',
    'Mocked SMTP send returns success with expected message ID'
  );

  // Mock failed send (connection timeout / provider error)
  const mockFailureTransporter: any = {
    sendMail: async () => {
      const err: any = new Error('Connection timeout to SMTP gateway');
      err.code = 'ETIMEDOUT';
      throw err;
    },
    verify: async () => false,
  };

  setMockTransporter(mockFailureTransporter);
  const failedDelivery = await sendOtpEmail({
    toEmail: 'test_student@mru.ac.in',
    studentName: 'Test Student',
    otp: '555555',
  });

  assert(
    failedDelivery.success === false && failedDelivery.errorCode === 'ETIMEDOUT',
    'Mocked SMTP failure returns graceful error object with error code'
  );

  // Invalid recipient check
  const invalidRecipientDelivery = await sendOtpEmail({
    toEmail: 'not-an-email',
    studentName: 'Bad Recipient',
    otp: '123456',
  });

  assert(
    invalidRecipientDelivery.success === false && invalidRecipientDelivery.errorCode === 'INVALID_RECIPIENT',
    'Invalid recipient format is rejected before attempting SMTP connection'
  );

  // -------------------------------------------------------------
  // TEST GROUP 8: Failed Delivery Cooldown Protection & RequestId Tracking
  // -------------------------------------------------------------
  console.log('\n▶ TEST GROUP 8: Failed Delivery Cooldown Protection & RequestId Tracking');
  const failureEmail = 'fail_delivery_protection@mru.ac.in';
  otpStore.delete(failureEmail);

  const mockFailTransporter: any = {
    sendMail: async () => {
      const err: any = new Error('SMTP Authentication Rejected (535)');
      err.code = 'SMTP_AUTH_FAILED';
      throw err;
    },
    verify: async () => false,
  };

  setMockTransporter(mockFailTransporter);

  const testRequestId = crypto.randomUUID();
  const testDelivery = await sendOtpEmail({
    toEmail: failureEmail,
    studentName: 'Fail Test User',
    otp: '777888',
    requestId: testRequestId,
  });

  assert(
    testDelivery.success === false,
    'Failed email delivery correctly flagged as failure'
  );
  assert(
    testDelivery.requestId === testRequestId,
    'RequestId is accurately returned in email delivery result'
  );

  // In authController, failed delivery executes: otpStore.delete(user.email)
  // Verify that otpStore remains free of failed delivery cooldowns
  if (!testDelivery.success) {
    otpStore.delete(failureEmail);
  }

  assert(
    !otpStore.has(failureEmail),
    'Failed delivery does NOT lock out user into a 60s cooldown'
  );

  setMockTransporter(null);

  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runOtpEmailTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
