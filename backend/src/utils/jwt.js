const jwt = require('jsonwebtoken');

// Access tokens are short-lived and sent in the Authorization header on every
// request. Refresh tokens are long-lived and stored ONLY in an httpOnly cookie
// (never readable by JS) — this is the standard access/refresh split that
// avoids storing a long-lived credential in localStorage.
const ACCESS_TTL = process.env.JWT_ACCESS_TTL || '15m';
const REFRESH_TTL = process.env.JWT_REFRESH_TTL || '7d';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me';

const signAccessToken = (user) =>
  jwt.sign(
    { sub: user.id, name: user.name, role: user.role, hospitalId: user.hospitalId || null, cityId: user.cityId || null },
    ACCESS_SECRET,
    { expiresIn: ACCESS_TTL }
  );

const signRefreshToken = (user) =>
  jwt.sign({ sub: user.id, v: user.refreshTokenVersion || 0 }, REFRESH_SECRET, { expiresIn: REFRESH_TTL });

const verifyAccessToken = (token) => jwt.verify(token, ACCESS_SECRET);
const verifyRefreshToken = (token) => jwt.verify(token, REFRESH_SECRET);

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken };
