import rateLimit from 'express-rate-limit';

/**
 * Standard API rate limiter
 * Configured to support high active user traffic (60k DAU)
 * 1000 requests per 15 minutes per IP by default
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this client. Please slow down and try again shortly.',
  },
});

/**
 * Stricter rate limiter for authentication & submission endpoints
 */
export const submissionRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'High rate of submissions detected. Please wait before retrying.',
  },
});
