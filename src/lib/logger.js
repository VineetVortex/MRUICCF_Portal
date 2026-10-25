/**
 * Logging and Monitoring Utility
 * Adheres to COMPLETE_DOCUMENTATION.md (11_LOGGING_AND_MONITORING.md)
 * Categories: AUTH_LOG, ASSESSMENT_LOG, DATABASE_LOG, SECURITY_LOG, ADMIN_ACTION_LOG, ERROR_LOG
 */

const STORAGE_KEY_LOGS = 'mr_iccf_logs_v1';

export const LOG_CATEGORIES = {
  AUTH_LOG: 'AUTH_LOG',
  ASSESSMENT_LOG: 'ASSESSMENT_LOG',
  DATABASE_LOG: 'DATABASE_LOG',
  SECURITY_LOG: 'SECURITY_LOG',
  ADMIN_ACTION_LOG: 'ADMIN_ACTION_LOG',
  ERROR_LOG: 'ERROR_LOG'
};

export function getLogs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOGS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to parse logs from storage', e);
    return [];
  }
}

export function logEvent(category, action, metadata = {}, userId = 'system') {
  const entry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    timestamp: new Date().toISOString(),
    category,
    action,
    userId,
    metadata
  };

  try {
    const current = getLogs();
    const updated = [entry, ...current].slice(0, 200); // keep last 200 logs
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to write log event', e);
  }

  // Also output to browser console for developer visibility
  const prefix = `[ICCF ${category}]`;
  if (category === LOG_CATEGORIES.ERROR_LOG) {
    console.error(prefix, action, metadata);
  } else if (category === LOG_CATEGORIES.SECURITY_LOG) {
    console.warn(prefix, action, metadata);
  } else {
    console.log(prefix, action, metadata);
  }

  return entry;
}

export function clearLogs() {
  try {
    localStorage.removeItem(STORAGE_KEY_LOGS);
  } catch (e) {
    console.error(e);
  }
}
