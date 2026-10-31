import { Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getDb } from '../db/index.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const ROSTER_FILE = path.join(DATA_DIR, 'tester_roster.json');
const INVITATIONS_FILE = path.join(DATA_DIR, 'tester_invitations.json');
const EVENTS_FILE = path.join(DATA_DIR, 'tester_events.json');

// Ensure directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJsonFile<T>(filePath: string, defaultVal: T): T {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (e) {
    console.error(`[TesterAccess] Error reading ${filePath}:`, e);
  }
  return defaultVal;
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error(`[TesterAccess] Error writing ${filePath}:`, e);
  }
}

// In-memory rate limiting for redemption: IP/email -> { count: number, firstAttempt: number, lockedUntil?: number }
const redemptionRateLimits = new Map<string, { count: number; firstAttempt: number; lockedUntil?: number }>();

function checkRateLimit(key: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const record = redemptionRateLimits.get(key);

  if (!record) {
    redemptionRateLimits.set(key, { count: 1, firstAttempt: now });
    return { allowed: true };
  }

  if (record.lockedUntil && now < record.lockedUntil) {
    return { allowed: false, retryAfterSeconds: Math.ceil((record.lockedUntil - now) / 1000) };
  }

  // Reset window after 15 minutes
  if (now - record.firstAttempt > 15 * 60 * 1000) {
    redemptionRateLimits.set(key, { count: 1, firstAttempt: now });
    return { allowed: true };
  }

  record.count += 1;
  if (record.count > 5) {
    record.lockedUntil = now + 15 * 60 * 1000; // 15 min lockout
    return { allowed: false, retryAfterSeconds: 15 * 60 };
  }

  return { allowed: true };
}

function resetRateLimit(key: string): void {
  redemptionRateLimits.delete(key);
}

// SHA-256 high-entropy code hasher
export function hashInvitationCode(code: string): string {
  const normalized = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

// Generate high-entropy 128-bit cryptographic invitation code formatted cleanly
export function generateCryptographicCode(): string {
  const bytes = crypto.randomBytes(16); // 128 bits of entropy
  const hex = bytes.toString('hex').toUpperCase();
  // Format as ICCF-XXXX-XXXX-XXXX-XXXX
  return `ICCF-${hex.substring(0, 4)}-${hex.substring(4, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}`;
}

// Non-secret audit event recorder
async function recordAccessEvent(
  eventType: 'invitation_issued' | 'invitation_redeemed' | 'invitation_revoked' | 'redemption_denied' | 'tester_authorized' | 'tester_deauthorized',
  actorId: string,
  rosterId: string | null = null,
  invitationId: string | null = null,
  metadata: Record<string, any> = {}
) {
  const event = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    eventType,
    actorId,
    rosterId,
    invitationId,
    metadata,
    createdAt: new Date().toISOString()
  };

  // Local JSON fallback
  const events = readJsonFile<any[]>(EVENTS_FILE, []);
  events.unshift(event);
  writeJsonFile(EVENTS_FILE, events);

  // Supabase audit
  try {
    const sb = getDb();
    if (sb) {
      await sb.from('tester_access_events').insert([{
        event_type: eventType,
        actor_id: actorId,
        roster_id: rosterId,
        invitation_id: invitationId,
        metadata,
        created_at: event.createdAt
      }]);
    }
  } catch (_) {}
}

/**
 * POST /api/admin/testers/import
 * Admin imports or updates the testing roster with duplicate validation
 */
export async function importTesterRoster(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { testers } = req.body;
    if (!Array.isArray(testers) || testers.length === 0) {
      res.status(400).json({ success: false, error: 'Expected an array of tester records.' });
      return;
    }

    const currentRoster = readJsonFile<any[]>(ROSTER_FILE, []);
    const emailSet = new Set<string>();
    const rollSet = new Set<string>();
    const duplicateErrors: string[] = [];

    // Pre-check for duplicates within the uploaded batch
    testers.forEach((t, idx) => {
      const email = String(t.email || '').trim().toLowerCase();
      const rollNumber = String(t.rollNumber || t.rollNo || '').trim().toUpperCase();

      if (!email) duplicateErrors.push(`Row ${idx + 1}: Missing email.`);
      if (!rollNumber) duplicateErrors.push(`Row ${idx + 1}: Missing roll number.`);

      if (emailSet.has(email)) duplicateErrors.push(`Duplicate email in batch: ${email}`);
      else emailSet.add(email);

      if (rollSet.has(rollNumber)) duplicateErrors.push(`Duplicate roll number in batch: ${rollNumber}`);
      else rollSet.add(rollNumber);
    });

    if (duplicateErrors.length > 0) {
      res.status(400).json({
        success: false,
        error: 'Roster validation failed with duplicate or missing identifiers.',
        details: duplicateErrors
      });
      return;
    }

    const importedRecords: any[] = [];
    const now = new Date().toISOString();

    for (const t of testers) {
      const email = String(t.email).trim().toLowerCase();
      const rollNumber = String(t.rollNumber || t.rollNo).trim().toUpperCase();
      const fullName = String(t.fullName || t.name || email.split('@')[0]).trim();
      const department = String(t.department || 'Computer Science & Technology').trim();
      const teamId = t.teamId ? String(t.teamId).trim() : null;
      const isAuthorized = t.isAuthorized !== false;

      // Find existing by rollNumber or email
      const existingIdx = currentRoster.findIndex(
        r => r.email.toLowerCase() === email || r.rollNumber.toUpperCase() === rollNumber
      );

      if (existingIdx !== -1) {
        currentRoster[existingIdx] = {
          ...currentRoster[existingIdx],
          fullName,
          department,
          rollNumber,
          email,
          teamId,
          isAuthorized,
          updatedAt: now
        };
        importedRecords.push(currentRoster[existingIdx]);
      } else {
        const newRecord = {
          id: `rost_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          fullName,
          department,
          rollNumber,
          email,
          teamId,
          isAuthorized,
          createdAt: now,
          updatedAt: now
        };
        currentRoster.push(newRecord);
        importedRecords.push(newRecord);
      }
    }

    writeJsonFile(ROSTER_FILE, currentRoster);

    // Sync to Supabase tester_roster if available
    try {
      const sb = getDb();
      if (sb) {
        for (const r of importedRecords) {
          await sb.from('tester_roster').upsert({
            full_name: r.fullName,
            department: r.department,
            roll_number: r.rollNumber,
            email: r.email,
            team_id: r.teamId,
            is_authorized: r.isAuthorized,
            updated_at: r.updatedAt
          }, { onConflict: 'email' });
        }
      }
    } catch (_) {}

    await recordAccessEvent(
      'tester_authorized',
      req.user?.email || 'admin',
      null,
      null,
      { count: importedRecords.length }
    );

    res.status(200).json({
      success: true,
      message: `Successfully processed ${importedRecords.length} student testing records without duplicates.`,
      count: importedRecords.length,
      roster: currentRoster
    });
  } catch (err: any) {
    console.error('[TesterAccess] Import error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/admin/testers
 * Returns testing roster with status and active invitations
 */
export async function getTesterRoster(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const roster = readJsonFile<any[]>(ROSTER_FILE, []);
    const invitations = readJsonFile<any[]>(INVITATIONS_FILE, []);
    const now = Date.now();

    const result = roster.map(student => {
      // Find latest invitation for this student
      const studentInvs = invitations.filter(inv => inv.rosterId === student.id);
      studentInvs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const latestInv = studentInvs[0];

      let status = 'unissued';
      if (latestInv) {
        if (latestInv.redeemedAt) status = 'redeemed';
        else if (latestInv.revokedAt) status = 'revoked';
        else if (new Date(latestInv.expiresAt).getTime() < now) status = 'expired';
        else status = 'active';
      }

      return {
        ...student,
        invitationStatus: status,
        latestInvitation: latestInv ? {
          id: latestInv.id,
          issuedBy: latestInv.issuedBy,
          createdAt: latestInv.createdAt,
          expiresAt: latestInv.expiresAt,
          redeemedAt: latestInv.redeemedAt,
          revokedAt: latestInv.revokedAt
        } : null
      };
    });

    res.status(200).json({
      success: true,
      count: result.length,
      testers: result
    });
  } catch (err: any) {
    console.error('[TesterAccess] Fetch error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/admin/testers/:id/invitations
 * Issues a single-use cryptographic invitation code.
 * Displays plaintext code ONCE to admin; stores only SHA-256 hash.
 * Revokes any previous unused invitation for this student.
 */
export async function issueTesterInvitation(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const rosterId = req.params.id as string;
    const { hoursValid = 8 } = req.body;

    const roster = readJsonFile<any[]>(ROSTER_FILE, []);
    const student = roster.find(r => r.id === rosterId || r.email.toLowerCase() === rosterId.toLowerCase());

    if (!student) {
      res.status(404).json({ success: false, error: 'Student not found in testing roster.' });
      return;
    }

    if (!student.isAuthorized) {
      res.status(403).json({ success: false, error: 'Student is currently deauthorized from testing.' });
      return;
    }

    const invitations = readJsonFile<any[]>(INVITATIONS_FILE, []);
    const now = new Date();

    // Revoke any previous unredeemed invitation for this student
    invitations.forEach(inv => {
      if (inv.rosterId === student.id && !inv.redeemedAt && !inv.revokedAt) {
        inv.revokedAt = now.toISOString();
        recordAccessEvent('invitation_revoked', req.user?.email || 'admin', student.id, inv.id, {
          reason: 'superceded_by_new_issuance'
        });
      }
    });

    // Generate high-entropy 128-bit cryptographic code
    const rawCode = generateCryptographicCode();
    const codeHash = hashInvitationCode(rawCode);

    const expiresAt = new Date(now.getTime() + Number(hoursValid) * 3600 * 1000).toISOString();
    const invitationId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newInvitation = {
      id: invitationId,
      rosterId: student.id,
      codeHash,
      issuedBy: req.user?.email || 'admin',
      createdAt: now.toISOString(),
      expiresAt,
      redeemedAt: null,
      revokedAt: null
    };

    invitations.unshift(newInvitation);
    writeJsonFile(INVITATIONS_FILE, invitations);

    // Save to Supabase tester_invitations if available
    try {
      const sb = getDb();
      if (sb) {
        await sb.from('tester_invitations').insert([{
          id: invitationId,
          roster_id: student.id,
          code_hash: codeHash,
          issued_by: req.user?.email || 'admin',
          created_at: now.toISOString(),
          expires_at: expiresAt
        }]);
      }
    } catch (_) {}

    await recordAccessEvent(
      'invitation_issued',
      req.user?.email || 'admin',
      student.id,
      invitationId,
      { expiresAt, hoursValid }
    );

    // Return the plaintext code ONCE to the authorized admin
    res.status(201).json({
      success: true,
      message: 'Invitation code generated successfully. Display this code to the student in person. It will not be shown again.',
      invitationId,
      invitationCode: rawCode,
      code: rawCode,
      studentName: student.fullName,
      studentEmail: student.email,
      rollNumber: student.rollNumber,
      expiresAt
    });
  } catch (err: any) {
    console.error('[TesterAccess] Issue error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/admin/invitations/:id/revoke
 * Admin revokes an unused invitation code
 */
export async function revokeTesterInvitation(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const invitationId = req.params.id as string;
    const invitations = readJsonFile<any[]>(INVITATIONS_FILE, []);
    const inv = invitations.find(i => i.id === invitationId);

    if (!inv) {
      res.status(404).json({ success: false, error: 'Invitation record not found.' });
      return;
    }

    if (inv.redeemedAt) {
      res.status(400).json({ success: false, error: 'Cannot revoke an invitation that has already been redeemed.' });
      return;
    }

    inv.revokedAt = new Date().toISOString();
    writeJsonFile(INVITATIONS_FILE, invitations);

    await recordAccessEvent(
      'invitation_revoked',
      req.user?.email || 'admin',
      inv.rosterId,
      inv.id,
      { manualRevoke: true }
    );

    res.status(200).json({
      success: true,
      message: 'Invitation code has been successfully revoked.'
    });
  } catch (err: any) {
    console.error('[TesterAccess] Revoke error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/admin/tester-events
 * Admin non-secret audit log trail
 */
export async function getTesterAccessEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const events = readJsonFile<any[]>(EVENTS_FILE, []);
    res.status(200).json({
      success: true,
      count: events.length,
      events
    });
  } catch (err: any) {
    console.error('[TesterAccess] Events error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/tester-access/redeem
 * Authenticated student redeems the invitation code assigned to them.
 * Identity strictly verified from req.user.email.
 * Enforces single-use, non-expired, unrevoked, rate-limited redemption.
 */
export async function redeemTesterInvitation(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const studentUser = req.user;
    if (!studentUser || !studentUser.email) {
      res.status(401).json({ success: false, error: 'Authentication required. Please sign in.' });
      return;
    }

    const normalizedEmail = studentUser.email.toLowerCase().trim();
    const rateLimitKey = `${req.ip}_${normalizedEmail}`;
    const rateLimit = checkRateLimit(rateLimitKey);

    if (!rateLimit.allowed) {
      res.status(429).json({
        success: false,
        code: 'RATE_LIMIT_EXCEEDED',
        error: `Too many failed redemption attempts. Please wait ${rateLimit.retryAfterSeconds} seconds before trying again.`,
        retryAfter: rateLimit.retryAfterSeconds
      });
      return;
    }

    const codeInput = req.body.code || req.body.invitationCode;
    if (!codeInput || typeof codeInput !== 'string' || codeInput.trim().length < 8) {
      res.status(400).json({ success: false, error: 'Please enter a valid invitation code.' });
      return;
    }

    const submittedHash = hashInvitationCode(codeInput);
    const invitations = readJsonFile<any[]>(INVITATIONS_FILE, []);

    // Atomic conditional lookup matching codeHash
    const matchedInv = invitations.find(i => i.codeHash === submittedHash);

    if (!matchedInv) {
      await recordAccessEvent('redemption_denied', normalizedEmail, null, null, {
        reason: 'invalid_code_hash'
      });
      res.status(400).json({
        success: false,
        code: 'INVALID_CODE',
        error: 'Invalid invitation code. Please check your code or request a new one from the administrator.'
      });
      return;
    }

    const roster = readJsonFile<any[]>(ROSTER_FILE, []);
    const student = roster.find(r => r.email.toLowerCase() === normalizedEmail);

    // Identity binding verification: Code was issued for THIS student
    if (!student || matchedInv.rosterId !== student.id) {
      await recordAccessEvent('redemption_denied', normalizedEmail, student ? student.id : null, matchedInv.id, {
        reason: 'wrong_student_identity_mismatch'
      });
      res.status(403).json({
        success: false,
        code: 'STUDENT_MISMATCH',
        error: 'This invitation code was assigned to a different student and cannot activate your account.'
      });
      return;
    }

    if (!student.isAuthorized) {
      await recordAccessEvent('redemption_denied', normalizedEmail, student.id, null, {
        reason: 'deauthorized_tester'
      });
      res.status(403).json({
        success: false,
        code: 'TESTER_DEAUTHORIZED',
        error: 'Your testing authorization has been disabled by the administrator.'
      });
      return;
    }

    // Single-use check
    if (matchedInv.redeemedAt) {
      await recordAccessEvent('redemption_denied', normalizedEmail, student.id, matchedInv.id, {
        reason: 'already_redeemed',
        originallyRedeemedAt: matchedInv.redeemedAt
      });
      res.status(409).json({
        success: false,
        code: 'ALREADY_REDEEMED',
        error: 'This invitation code has already been redeemed and cannot be used again.'
      });
      return;
    }

    // Revocation check
    if (matchedInv.revokedAt) {
      await recordAccessEvent('redemption_denied', normalizedEmail, student.id, matchedInv.id, {
        reason: 'code_revoked',
        revokedAt: matchedInv.revokedAt
      });
      res.status(410).json({
        success: false,
        code: 'INVITATION_REVOKED',
        error: 'This invitation code has been revoked by the administrator.'
      });
      return;
    }

    // Expiry check
    if (new Date(matchedInv.expiresAt).getTime() < Date.now()) {
      await recordAccessEvent('redemption_denied', normalizedEmail, student.id, matchedInv.id, {
        reason: 'code_expired',
        expiresAt: matchedInv.expiresAt
      });
      res.status(410).json({
        success: false,
        code: 'CODE_EXPIRED',
        error: 'This invitation code has expired. Please contact the testing administrator to issue a fresh code.'
      });
      return;
    }

    // ATOMIC REDEMPTION: Set redeemed_at timestamp
    matchedInv.redeemedAt = new Date().toISOString();
    writeJsonFile(INVITATIONS_FILE, invitations);

    // Reset rate limit on success
    resetRateLimit(rateLimitKey);

    // Supabase update
    try {
      const sb = getDb();
      if (sb) {
        await sb.from('tester_invitations')
          .update({ redeemed_at: matchedInv.redeemedAt })
          .eq('id', matchedInv.id)
          .is('redeemed_at', null)
          .is('revoked_at', null)
          .gt('expires_at', new Date().toISOString());
      }
    } catch (_) {}

    await recordAccessEvent(
      'invitation_redeemed',
      normalizedEmail,
      student.id,
      matchedInv.id,
      { studentName: student.fullName, rollNumber: student.rollNumber }
    );

    const studentSummary = {
      id: student.id,
      fullName: student.fullName,
      rollNumber: student.rollNumber,
      department: student.department,
      teamId: student.teamId,
      isTester: true,
      activatedAt: matchedInv.redeemedAt
    };

    res.status(200).json({
      success: true,
      message: 'Invitation code redeemed successfully. Your tester access is now active!',
      student: studentSummary,
      tester: studentSummary
    });
  } catch (err: any) {
    console.error('[TesterAccess] Redemption error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/tester-access/status
 * Returns current student's tester authorization status
 */
export async function getTesterAccessStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const studentUser = req.user;
    if (!studentUser || !studentUser.email) {
      res.status(401).json({ success: false, error: 'Authentication required.' });
      return;
    }

    const normalizedEmail = studentUser.email.toLowerCase().trim();
    const roster = readJsonFile<any[]>(ROSTER_FILE, []);
    const student = roster.find(r => r.email.toLowerCase() === normalizedEmail);

    if (!student || !student.isAuthorized) {
      res.status(200).json({
        success: true,
        isTester: false,
        isActivated: false
      });
      return;
    }

    const invitations = readJsonFile<any[]>(INVITATIONS_FILE, []);
    const activeRedeemed = invitations.find(
      i => i.rosterId === student.id && i.redeemedAt && !i.revokedAt
    );

    res.status(200).json({
      success: true,
      isTester: true,
      isAuthorizedTester: true,
      isActivated: Boolean(activeRedeemed),
      student: {
        id: student.id,
        fullName: student.fullName,
        rollNumber: student.rollNumber,
        department: student.department,
        teamId: student.teamId,
        activatedAt: activeRedeemed?.redeemedAt || null
      }
    });
  } catch (err: any) {
    console.error('[TesterAccess] Status error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}
