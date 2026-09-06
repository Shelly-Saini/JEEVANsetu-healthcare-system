const express = require('express');
const { z } = require('zod');
const User = require('../models/User');
const Hospital = require('../models/Hospital');
const { USER_ROLES } = require('../constants/enums');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { log } = require('../utils/logger');

const router = express.Router();

const REFRESH_COOKIE = 'refresh-token';
const refreshCookieOpts = {
  httpOnly: true, // never readable by JS — mitigates XSS token theft
  sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Strict',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/auth', // only sent on auth routes, not every request
};

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(USER_ROLES),
  hospitalId: z.string().optional(),
  cityId: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

const issueSession = async (res, user) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOpts);
  return accessToken;
};

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  hospitalId: user.hospitalId || null,
  cityId: user.cityId || null,
});

// POST /auth/register
// This is a demo/portfolio platform, so self-service registration is allowed
// for any role — in a real hospital system, staff/doctor/admin accounts would
// be provisioned by an administrator instead. Documented as a known tradeoff.
router.post('/register', asyncHandler(async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.issues[0].message });
  }
  const { name, email, password, role, hospitalId, cityId } = parsed.data;

  if (['admin', 'doctor', 'staff'].includes(role)) {
    if (!hospitalId) return res.status(400).json({ success: false, message: 'hospitalId is required for this role' });
    const hospital = await Hospital.findOne({ id: hospitalId }).lean();
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' });
  }
  if (role === 'city_admin' && !cityId) {
    return res.status(400).json({ success: false, message: 'cityId is required for city_admin accounts' });
  }

  const existing = await User.findOne({ email }).lean();
  if (existing) return res.status(409).json({ success: false, message: 'An account with this email already exists' });

  const user = await User.create({ name, email, password, role, hospitalId, cityId });
  log('AUTH', `Registered ${email} as ${role}`);

  const accessToken = await issueSession(res, user);
  res.status(201).json({ success: true, data: { user: publicUser(user), accessToken } });
}));

// POST /auth/login
router.post('/login', asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }
  const { email, password } = parsed.data;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  const accessToken = await issueSession(res, user);
  log('AUTH', `Login: ${email}`);
  res.json({ success: true, data: { user: publicUser(user), accessToken } });
}));

// POST /auth/refresh — reads the httpOnly refresh cookie, issues a new access token
router.post('/refresh', asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) return res.status(401).json({ success: false, message: 'No refresh token' });

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    return res.status(401).json({ success: false, message: 'Refresh token invalid or expired' });
  }

  const user = await User.findOne({ id: payload.sub });
  if (!user || (user.refreshTokenVersion || 0) !== payload.v) {
    return res.status(401).json({ success: false, message: 'Session revoked' });
  }

  const accessToken = signAccessToken(user);
  res.json({ success: true, data: { user: publicUser(user), accessToken } });
}));

// POST /auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie(REFRESH_COOKIE, { path: '/auth' });
  res.json({ success: true, message: 'Logged out' });
});

// GET /auth/me
router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = await User.findOne({ id: req.user.id }).lean();
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, data: publicUser(user) });
}));

module.exports = router;
