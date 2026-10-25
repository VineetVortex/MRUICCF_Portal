import { getDb } from '../db/index.js';
import { AuditLog, AuditLogCategory } from '../types/index.js';

export async function logAuditEvent(
  category: AuditLogCategory,
  action: string,
  userId: string = 'system',
  metadata: Record<string, unknown> = {}
): Promise<AuditLog> {
  const log: AuditLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    category,
    action,
    userId,
    metadata,
    timestamp: new Date().toISOString(),
  };

  try {
    const db = getDb();
    await db.from('audit_logs').insert([{
      id: log.id,
      category: log.category,
      action: log.action,
      user_id: log.userId,
      metadata: log.metadata,
      timestamp: log.timestamp,
    }]);
  } catch (err) {
    // Audit logging should not crash the main process if DB is temporarily busy
    console.warn('[AuditService] Audit log write warning:', err);
  }

  return log;
}
