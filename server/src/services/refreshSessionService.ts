import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getDb } from '../db/index.js';
import { config } from '../config/index.js';
import { logAuditEvent } from './auditService.js';

export interface RefreshSessionRecord {
  id: string;
  userId: string;
  userEmail?: string;
  userSnapshot?: any;
  tokenHash: string;
  tokenFamily: string;
  isRevoked: boolean;
  expiresAt: Date;
  createdAt: Date;
  lastUsedAt: Date;
  userAgent?: string;
  ipAddress?: string;
  rotatedToHash?: string;
  rotatedToToken?: string;
}

// In-memory fallback cache for refresh sessions to ensure resilience
const inMemorySessionStore = new Map<string, RefreshSessionRecord>();

const DATA_DIR = path.resolve(process.cwd(), 'data');
const SESSIONS_FILE = path.join(DATA_DIR, 'refresh_sessions.json');

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (_) {}
}

function loadSessionsFromDisk(): void {
  try {
    ensureDataDir();
    if (fs.existsSync(SESSIONS_FILE)) {
      const raw = fs.readFileSync(SESSIONS_FILE, 'utf-8');
      const list: any[] = JSON.parse(raw);
      const now = new Date();
      let loadedCount = 0;
      for (const item of list) {
        const expiresAt = new Date(item.expiresAt);
        // Only restore unexpired sessions
        if (expiresAt > now) {
          inMemorySessionStore.set(item.tokenHash, {
            id: item.id,
            userId: item.userId,
            userEmail: item.userEmail,
            userSnapshot: item.userSnapshot,
            tokenHash: item.tokenHash,
            tokenFamily: item.tokenFamily,
            isRevoked: Boolean(item.isRevoked),
            expiresAt,
            createdAt: new Date(item.createdAt),
            lastUsedAt: new Date(item.lastUsedAt),
            userAgent: item.userAgent,
            ipAddress: item.ipAddress,
            rotatedToHash: item.rotatedToHash,
            rotatedToToken: item.rotatedToToken,
          });
          loadedCount++;
        }
      }
      if (loadedCount > 0) {
        console.log(`[RefreshService] Restored ${loadedCount} active sessions from disk.`);
      }
    }
  } catch (err: any) {
    console.warn('[RefreshService] Notice loading sessions from disk:', err?.message || err);
  }
}

function persistSessionsToDisk(): void {
  try {
    ensureDataDir();
    const array = Array.from(inMemorySessionStore.values());
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(array, null, 2), 'utf-8');
  } catch (err: any) {
    console.warn('[RefreshService] Notice saving sessions to disk:', err?.message || err);
  }
}

// Initialise session store from disk on module import
loadSessionsFromDisk();

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
  userEmail,
  userSnapshot,
  userAgent,
  ipAddress,
}: {
  userId: string;
  userEmail?: string;
  userSnapshot?: any;
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
    userEmail,
    userSnapshot,
    tokenHash,
    tokenFamily,
    isRevoked: false,
    expiresAt,
    createdAt: now,
    lastUsedAt: now,
    userAgent,
    ipAddress,
  };

  // 1. In-memory cache + persistent disk store for restart resilience
  inMemorySessionStore.set(tokenHash, record);
  persistSessionsToDisk();

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
    // Non-fatal: Supabase refresh_sessions table optional; disk persistence covers dev & fallback
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
 * - Employs a 15-second grace window for concurrent requests / React StrictMode mounting
 * - Detects malicious reuse outside the grace window and revokes the whole token family
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
}): Promise<{
  newRawToken: string;
  userId: string;
  userEmail?: string;
  userSnapshot?: any;
  expiresAt: Date;
  tokenFamily: string;
}> {
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
        userEmail: data.user_email,
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

  // Fallback to in-memory store or merge memory grace pointers
  const memRecord = inMemorySessionStore.get(incomingHash);
  if (memRecord) {
    sessionRecord = {
      ...(sessionRecord || {}),
      ...memRecord,
      rotatedToHash: memRecord.rotatedToHash,
      rotatedToToken: memRecord.rotatedToToken,
      userEmail: memRecord.userEmail || sessionRecord?.userEmail,
      userSnapshot: memRecord.userSnapshot || sessionRecord?.userSnapshot,
    };
  }

  if (!sessionRecord) {
    console.warn('[RefreshService Diagnostic] Session record NOT FOUND for incoming token hash');
    throw new Error('Invalid or unknown refresh token session');
  }

  // --- REUSE DETECTION WITH CONCURRENT GRACE WINDOW ---
  if (sessionRecord.isRevoked) {
    const now = Date.now();
    const rotatedAt = sessionRecord.lastUsedAt ? new Date(sessionRecord.lastUsedAt).getTime() : 0;
    const GRACE_PERIOD_MS = 15000; // 15-second grace window for concurrent network requests

    const sameClient = !userAgent || !sessionRecord.userAgent || userAgent === sessionRecord.userAgent;
    const activeChild = sessionRecord.rotatedToHash ? inMemorySessionStore.get(sessionRecord.rotatedToHash) : null;

    console.log('[RefreshService Diagnostic] Revoked token presented:', {
      tokenFamily: sessionRecord.tokenFamily,
      elapsedMs: now - rotatedAt,
      withinGrace: (now - rotatedAt) <= GRACE_PERIOD_MS,
      hasRotatedToken: Boolean(sessionRecord.rotatedToToken),
      sameClient,
      hasActiveChild: Boolean(activeChild),
      activeChildRevoked: activeChild ? activeChild.isRevoked : null,
    });

    if (
      now - rotatedAt <= GRACE_PERIOD_MS &&
      sessionRecord.rotatedToToken &&
      sameClient &&
      activeChild &&
      !activeChild.isRevoked &&
      new Date() < activeChild.expiresAt
    ) {
      console.log('[RefreshService Diagnostic] GRACE WINDOW ACTIVATED: Returning existing rotated child token');
      // Return the active already-rotated token within the grace window
      return {
        newRawToken: sessionRecord.rotatedToToken,
        userId: sessionRecord.userId,
        userEmail: sessionRecord.userEmail,
        userSnapshot: sessionRecord.userSnapshot,
        expiresAt: activeChild.expiresAt,
        tokenFamily: sessionRecord.tokenFamily,
      };
    }

    // Genuine reuse attack or presentation outside grace window
    const familyToRevoke = sessionRecord.tokenFamily;
    console.error(`[SECURITY ALERT] Refresh token reuse detected for family ${familyToRevoke}! Revoking entire family.`);

    // Revoke all in-memory sessions with this family
    for (const [_, s] of inMemorySessionStore.entries()) {
      if (s.tokenFamily === familyToRevoke) {
        s.isRevoked = true;
      }
    }
    persistSessionsToDisk();

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
    persistSessionsToDisk();
    throw new Error('Refresh session has expired. Please sign in again.');
  }

  // Generate new rotated token in the SAME family
  const newRawToken = generateRefreshToken();
  const newHash = hashToken(newRawToken);
  const newSessionId = crypto.randomUUID();
  const now = new Date();
  const newExpiresAt = new Date(now.getTime() + config.jwt.refreshExpiresInDays * 24 * 60 * 60 * 1000);

  // Invalidate the old token and attach grace pointer
  sessionRecord.isRevoked = true;
  sessionRecord.lastUsedAt = now;
  sessionRecord.userAgent = userAgent || sessionRecord.userAgent;
  sessionRecord.rotatedToHash = newHash;
  sessionRecord.rotatedToToken = newRawToken;
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

  const newRecord: RefreshSessionRecord = {
    id: newSessionId,
    userId: sessionRecord.userId,
    userEmail: sessionRecord.userEmail,
    userSnapshot: sessionRecord.userSnapshot,
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
  persistSessionsToDisk();

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
    userEmail: sessionRecord.userEmail,
    userSnapshot: sessionRecord.userSnapshot,
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
  persistSessionsToDisk();

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
  persistSessionsToDisk();

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
