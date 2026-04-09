import rateLimit from 'express-rate-limit';

/**
 * Creates a rate limiter with standard Retry-After headers.
 * NOTE: uses in-memory storage (fine for single-instance dev).
 * In production with multiple instances, replace with a Redis store
 * via `rate-limit-redis` or similar.
 */
export function makeLimiter(max, windowMs = 60_000) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,   // sends RateLimit-* headers (RFC 6585)
    legacyHeaders: false,     // disables deprecated X-RateLimit-* headers
    message: { error: 'Too many requests. Please slow down.' },
  });
}
