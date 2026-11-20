/**
 * SMP Shop App - Production Intelligent Rate Limiting Architecture
 * Provides tiered protection against brute force, credential stuffing, and DDoS
 * while supporting high concurrency (>1,000 concurrent users) without blocking legitimate logins.
 */

const rateLimit = require('express-rate-limit');

// Environment configurations with sensible high-scale production defaults
const isDev = process.env.NODE_ENV !== 'production';
const isVercel = Boolean(process.env.VERCEL);

/**
 * Key generator that combines IP address and sanitized identifier when available.
 * Ensures that multiple legitimate users on a shared NAT/Wi-Fi/Office IP are not throttled
 * by a single user's failed attempts.
 */
const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || '127.0.0.1';
};

const authKeyGenerator = (req) => {
  const ip = getClientIp(req);
  const identifier = (req.body?.email || req.body?.username || req.body?.identifier || req.body?.staffIdOrEmail || '').trim().toLowerCase();
  return identifier ? `${ip}:${identifier}` : ip;
};

/**
 * High-Concurrency Login Limiter:
 * - Only counts FAILED login attempts (skipSuccessfulRequests: true).
 * - Legitimate users logging in with correct credentials never hit 429.
 * - Brute-force attackers attempting multiple wrong passwords are throttled after threshold.
 * - Supports high-concurrency bursts (e.g. 1,000+ simultaneous requests).
 */
const loginRateLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || String(15 * 60 * 1000)), // 15 mins default
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX || '2000'), // Allows high-scale traffic; failed attempts capped
  skipSuccessfulRequests: true, // Only penalize 4xx/5xx failures!
  keyGenerator: authKeyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    const retryAfter = Math.ceil(options.windowMs / 1000);
    res.setHeader('Retry-After', retryAfter);
    res.status(429).json({
      success: false,
      message: 'Too many failed login attempts detected. Please wait a few moments before trying again.',
      retryAfterSeconds: retryAfter
    });
  }
});

/**
 * Registration Limiter:
 * Allows reasonable account creation bursts while preventing automated bot registration flooding.
 */
const registrationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.REGISTRATION_RATE_LIMIT_MAX || '100'),
  keyGenerator: getClientIp,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many account registrations from this network. Please try again later.'
  }
});

/**
 * Password Recovery & OTP Request Limiter:
 * Protects SMS/Email gateways from abuse and spam while permitting normal forgot-password attempts.
 */
const recoveryRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RECOVERY_RATE_LIMIT_MAX || '30'),
  keyGenerator: authKeyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many verification requests. Please wait a few minutes before requesting another code.'
  }
});

/**
 * Global API Throughput Limiter:
 * Protects backend services against denial of service while allowing heavy dashboard/POS operations.
 */
const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: parseInt(process.env.GLOBAL_API_RATE_LIMIT_MAX || '3000'), // 3,000 requests/min per IP
  keyGenerator: getClientIp,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS' || req.path === '/api/health' || req.path === '/api',
  message: {
    success: false,
    message: 'High traffic volume detected. Please slow down your requests.'
  }
});

module.exports = {
  loginRateLimiter,
  registrationRateLimiter,
  recoveryRateLimiter,
  apiRateLimiter,
  getClientIp
};
