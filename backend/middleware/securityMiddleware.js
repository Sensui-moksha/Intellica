/**
 * Security Middleware v2 — Hardened HTTP security headers
 * - Helmet integration for comprehensive header management
 * - Rate limiting on login and OTP endpoints
 * - CORS locked to known origins
 * - Strict Content-Security-Policy
 */

const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

/* ===========================================
   1.  HELMET — Comprehensive HTTP headers
=========================================== */
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "http://localhost:*", "http://127.0.0.1:*"],
      connectSrc: ["'self'", "http://localhost:*", "http://127.0.0.1:*"],
      // Allow framing for PDF/image previews in same origin iframes
      frameAncestors: ["'self'", "http://localhost:*", "http://127.0.0.1:*"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,     // Required for PDF rendering in iframes
  crossOriginResourcePolicy: { policy: "cross-origin" },  // Allow uploads serving
  hsts: {
    maxAge: process.env.NODE_ENV === "production" ? 31536000 : 0,
    includeSubDomains: true,
  },
  frameguard: false,    // We manage this per-path below
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  noSniff: true,
  xssFilter: true,
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
});

/* ===========================================
   2.  RATE LIMITERS
=========================================== */

/** Generic auth limiter — prevents credential stuffing & brute force */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 30,                     // 30 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again in 15 minutes." },
  skipSuccessfulRequests: false,
});

/** OTP verification limiter — harder limit to prevent brute-forcing 6-digit code */
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,  // 10 minutes
  max: 10,                     // Only 10 OTP attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many OTP attempts. Please wait 10 minutes before trying again." },
  skipSuccessfulRequests: true,
});

/** Registration limiter — prevents mass account creation */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 5,                      // Max 5 registrations per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many registration attempts. Please try again in an hour." },
});

/** General API limiter — protects non-auth endpoints */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 minute
  max: 200,                    // 200 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please slow down." },
  skip: (req) => {
    // Skip rate limiting for static files
    return req.path.startsWith("/uploads");
  }
});

/* ===========================================
   3.  CUSTOM PER-PATH HEADERS
=========================================== */
const pathHeadersMiddleware = (req, res, next) => {
  if (req.path.startsWith("/uploads")) {
    // Allow iframes for PDF preview in portal
    res.setHeader("Content-Security-Policy", "frame-ancestors 'self' http://localhost:* http://127.0.0.1:*");
    res.removeHeader("X-Frame-Options");
  } else {
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
  }

  // Disable server fingerprinting
  res.removeHeader("X-Powered-By");

  // Extra: protect referrer on sensitive API paths
  if (req.path.startsWith("/api/auth")) {
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("Pragma", "no-cache");
  }

  next();
};

module.exports = {
  helmetMiddleware,
  pathHeadersMiddleware,
  authLimiter,
  otpLimiter,
  registerLimiter,
  apiLimiter,
};
