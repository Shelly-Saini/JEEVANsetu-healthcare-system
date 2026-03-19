// backend/src/middleware/rateLimiter.js
// Lightweight Map-based rate limiter — no external dependencies.
// Tracks last request timestamp per IP+route key.
// Rejects requests that arrive within WINDOW_MS of the previous one.
//
// Usage:
//   const { rateLimiter } = require('../middleware/rateLimiter');
//   router.post('/', rateLimiter('opd-register'), handler);
//   router.get('/',  rateLimiter('dashboard'),    handler);

const timestamps = new Map(); // `${ip}::${route}` -> lastRequestMs

const WINDOW_MS = 400; // reject if same IP hits same route within 400ms

/**
 * Returns an Express middleware that rate-limits by IP + route label.
 * @param {string} routeLabel  - unique label per endpoint (e.g. 'opd-register')
 */
const rateLimiter = (routeLabel) => (req, res, next) => {
  const ip  = req.ip || req.socket?.remoteAddress || 'unknown';
  const key = `${ip}-${req.originalUrl}`;
  const now = Date.now();
  const last = timestamps.get(key);

  if (last && now - last < WINDOW_MS) {
    return res.status(429).json({
      success: false,
      message: `Too many requests. Please wait ${WINDOW_MS}ms between requests.`,
      retryAfterMs: WINDOW_MS - (now - last),
    });
  }

  timestamps.set(key, now);

  // Lazy cleanup — remove entries older than 10s to prevent unbounded Map growth
  if (timestamps.size > 5000) {
    const cutoff = now - 10_000;
    for (const [k, t] of timestamps) {
      if (t < cutoff) timestamps.delete(k);
    }
  }

  next();
};

module.exports = { rateLimiter };
