import crypto from 'crypto';
import { getDb } from '../db/index.js';
import { config } from '../config/index.js';
import { logAuditEvent } from './auditService.js';

export interface RefreshSessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  tokenFamily: string;
  isRevoked: boolean;
  expiresAt: Date;
  createdAt: Date;
  lastUsedAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

// In-memory fallback cache for refresh sessions to ensure resilience
const inMemorySessionStore = new Map<string, RefreshSessionRecord>();

/**
 * Generates a 256-bit cryptographically secure random refresh token
 */
export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * SHA-256 hash of refresh token for safe database persistence
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Creates a brand new refresh session and returns the plaintext token to send in HttpOnly cookie
 */
export async function createRefreshSession({
  userId,
  userAgent,
  ipAddress,
}: {
  userId: string;
  userAgent?: string;
  ipAddress?: string;
}): Promise<{ rawToken: string; expiresAt: Date; tokenFamily: string }> {
  const rawToken = generateRefreshToken();
  const tokenHash = hashToken(rawToken);
  const sessionId = crypto.randomUUID();
  const tokenFamily = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + config.jwt.refreshExpiresInDays * 24 * 60 * 60 * 1000);
  const now = new Date();

  const record: RefreshSessionRecord = {
    id: sessionId,
    userId,
    tokenHash,
    tokenFamily,
    isRevoked: false,
    expiresAt,
    createdAt: now,
    lastUsedAt: now,
    userAgent,
    ipAddress,
  };

  // 1. In-memory cache for 0ms lookup & fallback resilience
  inMemorySessionStore.set(tokenHash, record);

  // 2. Persist to database if available
  try {
    const db = getDb();
    await db.from('refresh_sessions').insert({
      id: sessionId,
      user_id: userId,
      token_hash: tokenHash,
      token_family: tokenFamily,
      is_revoked: false,
      expires_at: expiresAt.toISOString(),
      created_at: now.toISOString(),
      last_used_at: now.toISOString(),
      user_agent: userAgent || null,
      ip_address: ipAddress || null,
    });
  } catch (err: any) {
    console.warn('[RefreshService] Notice persisting session to DB, using in-memory store:', err.message);
  }

  logAuditEvent('AUTH_LOG', `Refresh session created for user ${userId}`, userId, {
    sessionId,
    tokenFamily,
    expiresAt: expiresAt.toISOString(),
  });

  return { rawToken, expiresAt, tokenFamily };
}

/**
 * Rotates an existing refresh token:
 * - Detects reuse of invalidated/revoked tokens and revokes the whole token family
 * - Replaces the old token with a newly generated one in the same family
 */
export async function rotateRefreshSession({
  rawToken,
  userAgent,
  ipAddress,
}: {
  rawToken: string;
  userAgent?: string;
  ipAddress?: string;
}): Promise<{ newRawToken: string; userId: string; expiresAt: Date; tokenFamily: string }> {
  if (!rawToken) {
    throw new Error('Refresh token is required');
  }

  const incomingHash = hashToken(rawToken);
  let sessionRecord: RefreshSessionRecord | null = null;

  // 1. Query Database
  try {
    const db = getDb();
    const { data, error } = await db
      .from('refresh_sessions')
      .select('*')
      .eq('token_hash', incomingHash)
      .single();

    if (!error && data) {
      sessionRecord = {
        id: data.id,
        userId: data.user_id,
        tokenHash: data.token_hash,
        tokenFamily: data.token_family,
        isRevoked: Boolean(data.is_revoked),
        expiresAt: new Date(data.expires_at),
        createdAt: new Date(data.created_at),
        lastUsedAt: new Date(data.last_used_at),
        userAgent: data.user_agent,
        ipAddress: data.ip_address,
      };
    }
  } catch (err) {
    // Database query failed, check in-memory store
  }

  // Fallback to in-memory store
  if (!sessionRecord) {
    sessionRecord = inMemorySessionStore.get(incomingHash) || null;
  }

  if (!sessionRecord) {
    throw new Error('Invalid or unknown refresh token session');
  }

  // --- REUSE DETECTION ---
  // If an already revoked token is used again, someone may have intercepted the old token!
  if (sessionRecord.isRevoked) {
    const familyToRevoke = sessionRecord.tokenFamily;
    console.error(`[SECURITY ALERT] Refresh token reuse detected for family ${familyToRevoke}! Revoking entire family.`);

    // Revoke all in-memory sessions with this family
    for (const [hash, s] of inMemorySessionStore.entries()) {
      if (s.tokenFamily === familyToRevoke) {
        s.isRevoked = true;
      }
    }

    // Revoke all DB sessions with this family
    try {
      const db = getDb();
      await db
        .from('refresh_sessions')
        .update({ is_revoked: true })
        .eq('token_family', familyToRevoke);
    } catch (e) {
      // ignore
    }

    logAuditEvent(
      'SECURITY_LOG',
      `CRITICAL: Refresh token reuse detected for user ${sessionRecord.userId}. Revoked session family ${familyToRevoke}`,
      sessionRecord.userId,
      { tokenFamily: familyToRevoke, ip: ipAddress }
    );

    throw new Error('Security violation: Refresh token reuse detected. Session terminated.');
  }

  // Check Expiration
  if (new Date() > sessionRecord.expiresAt) {
    sessionRecord.isRevoked = true;
    throw new Error('Refresh session has expired. Please sign in again.');
  }

  // Invalidate the old token
  sessionRecord.isRevoked = true;
  sessionRecord.lastUsedAt = new Date();
  inMemorySessionStore.set(incomingHash, sessionRecord);

  try {
    const db = getDb();
    await db
      .from('refresh_sessions')
      .update({ is_revoked: true, last_used_at: new Date().toISOString() })
      .eq('id', sessionRecord.id);
  } catch (err) {
    // Non-fatal
  }

  // Generate new rotated token in the SAME family
  const newRawToken = generateRefreshToken();
  const newHash = hashToken(newRawToken);
  const newSessionId = crypto.randomUUID();
  const now = new Date();
  const newExpiresAt = new Date(now.getTime() + config.jwt.refreshExpiresInDays * 24 * 60 * 60 * 1000);

  const newRecord: RefreshSessionRecord = {
    id: newSessionId,
    userId: sessionRecord.userId,
    tokenHash: newHash,
    tokenFamily: sessionRecord.tokenFamily, // Preserve family
    isRevoked: false,
    expiresAt: newExpiresAt,
    createdAt: now,
    lastUsedAt: now,
    userAgent,
    ipAddress,
  };

  inMemorySessionStore.set(newHash, newRecord);

  try {
    const db = getDb();
    await db.from('refresh_sessions').insert({
      id: newSessionId,
      user_id: sessionRecord.userId,
      token_hash: newHash,
      token_family: sessionRecord.tokenFamily,
      is_revoked: false,
      expires_at: newExpiresAt.toISOString(),
      created_at: now.toISOString(),
      last_used_at: now.toISOString(),
      user_agent: userAgent || null,
      ip_address: ipAddress || null,
    });
  } catch (err) {
    // Non-fatal
  }

  return {
    newRawToken,
    userId: sessionRecord.userId,
    expiresAt: newExpiresAt,
    tokenFamily: sessionRecord.tokenFamily,
  };
}

/**
 * Revokes a single refresh token session upon logout
 */
export async function revokeRefreshSession(rawToken: string): Promise<void> {
  if (!rawToken) return;
  const tokenHash = hashToken(rawToken);

  const mem = inMemorySessionStore.get(tokenHash);
  if (mem) {
    mem.isRevoked = true;
  }

  try {
    const db = getDb();
    await db
      .from('refresh_sessions')
      .update({ is_revoked: true })
      .eq('token_hash', tokenHash);
  } catch (err) {
    // Non-fatal
  }
}

/**
 * Revokes all sessions for a user (e.g. on password change or account lock)
 */
export async function revokeAllSessionsForUser(userId: string): Promise<void> {
  for (const [_, s] of inMemorySessionStore.entries()) {
    if (s.userId === userId) {
      s.isRevoked = true;
    }
  }

  try {
    const db = getDb();
    await db
      .from('refresh_sessions')
      .update({ is_revoked: true })
      .eq('user_id', userId);
  } catch (err) {
    // Non-fatal
  }
}
