/**
 * Standalone SMTP Connectivity & Authentication Diagnostic Tool
 * Validates environment configuration and tests SMTP connectivity
 * without exposing credentials or secrets.
 *
 * Usage:
 *   npx tsx src/scripts/verifySmtp.ts
 *   npx tsx src/scripts/verifySmtp.ts --send-to test@example.com
 */

import { validateSmtpConfig, verifySmtpConnection, sendOtpEmail, maskEmail } from '../services/emailService.js';
import { config } from '../config/index.js';

async function runDiagnostic() {
  console.log('================================================================');
  console.log('📧 Manav Rachna ICCF Portal — SMTP Infrastructure Diagnostic');
  console.log('================================================================\n');

  // 1. Configuration Validation
  console.log('▶ STEP 1: Validating Environment Configuration...');
  const validation = validateSmtpConfig();
  console.log(`  • Host: ${validation.configSummary.host}`);
  console.log(`  • Port: ${validation.configSummary.port} (SSL Direct: ${validation.configSummary.secure})`);
  console.log(`  • User Configured: ${validation.configSummary.hasUser ? 'YES' : 'NO'}`);
  console.log(`  • Pass Configured: ${validation.configSummary.hasPass ? 'YES' : 'NO'}`);
  console.log(`  • Sender: "${validation.configSummary.fromName}" <${maskEmail(validation.configSummary.fromEmail)}>`);

  if (!validation.isValid) {
    console.error('\n❌ CONFIGURATION VALIDATION FAILED:');
    validation.errors.forEach(err => console.error(`  - ${err}`));
    process.exit(1);
  }
  console.log('  ✓ PASS: Configuration is structurally valid.\n');

  // 2. Connectivity & Authentication Test
  console.log('▶ STEP 2: Testing SMTP Connection & Authentication Handshake...');
  const connectionResult = await verifySmtpConnection();

  if (connectionResult.success) {
    console.log(`  ✓ PASS: ${connectionResult.message}\n`);
  } else {
    console.error(`  ❌ FAILED: ${connectionResult.message}`);
    console.error(`  • Error Code: ${connectionResult.errorCode || 'UNKNOWN'}\n`);
    process.exit(1);
  }

  // 3. Optional Deliberate Send Test
  const sendToIndex = process.argv.indexOf('--send-to');
  if (sendToIndex !== -1 && process.argv[sendToIndex + 1]) {
    const targetEmail = process.argv[sendToIndex + 1].trim();
    console.log(`▶ STEP 3: Executing Deliberate Verification Email Send to ${maskEmail(targetEmail)}...`);
    const sendResult = await sendOtpEmail({
      toEmail: targetEmail,
      studentName: 'Diagnostic Tester',
      otp: '123456',
    });

    if (sendResult.success) {
      console.log(`  ✓ PASS: Email accepted by SMTP server! MessageId: ${sendResult.messageId}`);
    } else {
      console.error(`  ❌ FAILED: ${sendResult.message} (${sendResult.error || 'Unknown'})`);
      process.exit(1);
    }
  } else {
    console.log('ℹ️ Tip: To perform a live test send, run:');
    console.log('  npx tsx src/scripts/verifySmtp.ts --send-to your-email@example.com\n');
  }

  console.log('================================================================');
  console.log('🎉 SMTP DIAGNOSTIC COMPLETE: READY FOR PRODUCTION OTP DELIVERY');
  console.log('================================================================\n');
}

runDiagnostic().catch(err => {
  console.error('Fatal diagnostic error:', err.message);
  process.exit(1);
});
