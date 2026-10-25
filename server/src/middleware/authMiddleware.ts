import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config/index.js';
import { UserRole, User } from '../types/index.js';
import { logAuditEvent } from '../services/auditService.js';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export interface JwtTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  name: string;
  department?: string;
  deptCode?: string;
  iss?: string;
  aud?: string;
  jti?: string;
  iat?: number;
  exp?: number;
}

/**
 * Generates an application access JWT with EXACTLY 30-second expiration.
 */
export function generateAccessToken(user: User): string {
  const userId = user.id || user.uid || `usr_${user.email.split('@')[0]}`;
  const payload: JwtTokenPayload = {
    sub: userId,
    email: user.email.toLowerCase().trim(),
    role: user.role,
    name: user.name,
    department: user.department,
    deptCode: user.deptCode,
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: '30s', // EXACTLY 30 SECONDS
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
    jwtid: crypto.randomUUID(),
  });
}

/**
 * Backward-compatible alias for existing controllers
 */
export const generateToken = generateAccessToken;

/**
 * Strict Zero-Trust Authentication Middleware:
 * Verifies Bearer JWT signature, expiration (30s), issuer, and audience.
 * Never trusts client headers (x-user-role) or anonymous fallback.
 */
export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;

  if (!token) {
    res.status(401).json({
      success: false,
      code: 'AUTH_TOKEN_MISSING',
      error: 'Authentication required. Missing Bearer access token.',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    }) as JwtTokenPayload;

    req.user = {
      id: decoded.sub,
      uid: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      department: decoded.department,
      deptCode: decoded.deptCode,
    };

    return next();
  } catch (err: any) {
    const isExpired = err.name === 'TokenExpiredError';
    logAuditEvent('SECURITY_LOG', `JWT verification failed: ${err.message}`, 'anonymous', {
      ip: req.ip,
      errorName: err.name,
      expired: isExpired,
    });

    res.status(401).json({
      success: false,
      code: isExpired ? 'AUTH_TOKEN_EXPIRED' : 'AUTH_TOKEN_INVALID',
      error: isExpired
        ? 'Access token expired (30s lifecycle). Please refresh your session.'
        : 'Invalid or malformed authentication token.',
    });
    return;
  }
}

/**
 * Role-Based Access Control (RBAC) middleware:
 * Enforces least-privilege access using server-validated user claims.
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        code: 'AUTH_REQUIRED',
        error: 'Authentication required before checking authorization.',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      logAuditEvent(
        'SECURITY_LOG',
        `Access denied: role '${req.user.role}' attempted action requiring [${allowedRoles.join(', ')}]`,
        req.user.id,
        {
          path: req.path,
          method: req.method,
          requiredRoles: allowedRoles,
          assignedRole: req.user.role,
        }
      );

      res.status(403).json({
        success: false,
        code: 'AUTH_FORBIDDEN',
        error: `Forbidden: Action requires one of the following roles: ${allowedRoles.join(', ')}`,
      });
      return;
    }

    next();
  };
}
