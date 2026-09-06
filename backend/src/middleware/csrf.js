const crypto = require('crypto');

const CSRF_COOKIE  = 'csrf-token';
const CSRF_HEADER  = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Double Submit Cookie pattern:
//  - Safe methods (GET/HEAD/OPTIONS): generate + set csrf-token cookie if absent
//  - Mutating methods (POST/PUT/DELETE/PATCH): require x-csrf-token header to match cookie
const csrfMiddleware = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) {
    const token =
      req.cookies?.[CSRF_COOKIE] ||
      crypto.randomBytes(32).toString('hex');

    if (!req.cookies?.[CSRF_COOKIE]) {
      res.cookie(CSRF_COOKIE, token, {
        httpOnly: false,
        sameSite:
          process.env.NODE_ENV === 'production' ? 'None' : 'Strict',
        secure: process.env.NODE_ENV === 'production',
      });
    }

    // Send the token in the response header so the Vercel frontend
    // can read it even though the cookie belongs to the Render domain.
    res.setHeader(CSRF_HEADER, token);

    return next();
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.headers[CSRF_HEADER];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or missing CSRF token',
    });
  }

  next();
};

module.exports = csrfMiddleware;
