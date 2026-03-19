const crypto = require('crypto');

const CSRF_COOKIE  = 'csrf-token';
const CSRF_HEADER  = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Double Submit Cookie pattern:
//  - Safe methods (GET/HEAD/OPTIONS): generate + set csrf-token cookie if absent
//  - Mutating methods (POST/PUT/DELETE/PATCH): require x-csrf-token header to match cookie
const csrfMiddleware = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) {
    if (!req.cookies?.[CSRF_COOKIE]) {
      const token = crypto.randomBytes(32).toString('hex');
      res.cookie(CSRF_COOKIE, token, {
        httpOnly: false,   // must be readable by JS to send as header
        sameSite: 'Strict',
        secure: process.env.NODE_ENV === 'production',
      });
    }
    return next();
  }

  const cookieToken  = req.cookies?.[CSRF_COOKIE];
  const headerToken  = req.headers[CSRF_HEADER];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ success: false, message: 'Invalid or missing CSRF token' });
  }

  next();
};

module.exports = csrfMiddleware;
