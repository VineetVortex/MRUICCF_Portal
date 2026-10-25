import { Request, Response, NextFunction } from 'express';
import { logAuditEvent } from '../services/auditService.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const statusCode = err.statusCode || (err.status ? Number(err.status) : 500);
  const message = err.message || 'Internal Server Error';

  console.error(`[Error] ${req.method} ${req.path} -> ${statusCode}:`, err);

  // Record to audit logs as ERROR_LOG
  logAuditEvent('ERROR_LOG', `Server error on ${req.method} ${req.path}`, 'system', {
    error: message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    ip: req.ip,
  });

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
}
