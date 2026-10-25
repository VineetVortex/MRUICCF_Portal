import crypto from 'crypto';
import { getDb } from '../db/index.js';
import { logAuditEvent } from './auditService.js';
import { revokeAllSessionsForUser } from './refreshSessionService.js';

interface ResetTokenRecord {
  tokenHash: string;
  userId: string;
  email: string;
  expiresAt: Date;
  used: boolean;
}

const inMemoryResetStore = new Map<string, ResetTokenRecord>();

export function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Creates a short-lived (15 min) password reset token for an existing user
 */
export async function createPasswordResetToken(email: string, user: { id: string; email: string; name: string }): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

  const record: ResetTokenRecord = {
    tokenHash,
    userId: user.id,
    email: user.email,
    expiresAt,
    used: false,
  };

  inMemoryResetStore.set(tokenHash, record);

  try {
    const db = getDb();
    await db.from('password_reset_tokens').insert({
      id: crypto.randomUUID(),
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
      used: false,
    });
  } catch (err: any) {
    console.warn('[PasswordReset] Notice saving reset token to DB:', err.message);
  }

  logAuditEvent('AUTH_LOG', `Password reset token requested for ${user.email}`, user.id, {
    expiresAt: expiresAt.toISOString(),
  });

  return rawToken;
}

/**
 * Verifies the reset token and safely resets password, invalidating all sessions
 */
export async function verifyAndResetPassword(rawToken: string, newPasswordHash: string): Promise<{ success: boolean; userId: string }> {
  if (!rawToken || !newPasswordHash) {
    throw new Error('Token and new password are required');
  }

  const tokenHash = hashResetToken(rawToken);
  let record: ResetTokenRecord | null = null;

  try {
    const db = getDb();
    const { data, error } = await db
      .from('password_reset_tokens')
      .select('*')
      .eq('token_hash', tokenHash)
      .single();

    if (!error && data) {
      record = {
        tokenHash: data.token_hash,
        userId: data.user_id,
        email: '',
        expiresAt: new Date(data.expires_at),
        used: Boolean(data.used),
      };
    }
  } catch (err) {
    // DB failed, try memory
  }

  if (!record) {
    record = inMemoryResetStore.get(tokenHash) || null;
  }

  if (!record) {
    throw new Error('Invalid or unknown password reset token');
  }

  if (record.used) {
    throw new Error('This password reset token has already been used');
  }

  if (new Date() > record.expiresAt) {
    throw new Error('This password reset token has expired. Please request a new one.');
  }

  // Mark token as used
  record.used = true;
  inMemoryResetStore.set(tokenHash, record);

  try {
    const db = getDb();
    await db
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('token_hash', tokenHash);

    await db
      .from('users')
      .update({ password_hash: newPasswordHash, updated_at: new Date().toISOString() })
      .eq('id', record.userId);
  } catch (err: any) {
    console.warn('[PasswordReset] DB update warning:', err.message);
  }

  // Invalidate all existing refresh sessions for this user on password reset
  await revokeAllSessionsForUser(record.userId);

  logAuditEvent('SECURITY_LOG', `Password successfully reset for user ${record.userId}`, record.userId);

  return { success: true, userId: record.userId };
}
