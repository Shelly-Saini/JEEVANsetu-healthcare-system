const { verifyAccessToken } = require('../utils/jwt');

/**
 * requireAuth — verifies the Bearer access token and attaches req.user
 * ({ id, role, hospitalId, cityId }) for downstream handlers/RBAC checks.
 */
const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      name: payload.name,
      role: payload.role,
      hospitalId: payload.hospitalId,
      cityId: payload.cityId,
    };
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Access token expired' : 'Invalid access token';
    return res.status(401).json({ success: false, message });
  }
};

/**
 * requireRole(...roles) — restricts a route to specific roles.
 * Must run after requireAuth.
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: `Requires one of roles: ${roles.join(', ')}` });
  }
  next();
};

/**
 * requireOwnHospital — for admin/doctor/staff, restricts writes to the
 * hospital the account is scoped to (from the JWT, not the request body —
 * a user cannot claim a different hospitalId). city_admin is read-only so it
 * never reaches mutating routes that use this guard.
 */
const requireOwnHospital = (getHospitalId) => (req, res, next) => {
  const targetHospitalId = getHospitalId(req);
  if (req.user.role !== 'admin' && req.user.role !== 'doctor' && req.user.role !== 'staff') {
    return res.status(403).json({ success: false, message: 'This role cannot modify hospital operations' });
  }
  if (targetHospitalId && req.user.hospitalId && targetHospitalId !== req.user.hospitalId) {
    return res.status(403).json({ success: false, message: 'You can only modify data for your own hospital' });
  }
  next();
};

const Hospital = require('../models/Hospital');

/**
 * requireHospitalAccess(getRequestedId) — guards READ routes that accept a
 * hospitalId (query param or URL param) so a logged-in user can't view
 * another hospital's beds/doctors/inventory/OPD/dashboard data just by
 * changing the id in the request — the earlier version only checked this on
 * WRITE routes (requireOwnHospital), leaving reads open to any hospitalId.
 *
 *  - admin/doctor/staff: the requested id (if present) must equal their own
 *    hospitalId; if absent, defaults to their own hospitalId.
 *  - city_admin: the requested id must belong to their assigned city
 *    (validated against the Hospital collection); required, since city_admin
 *    has no single "own" hospital to default to.
 */
const requireHospitalAccess = (getRequestedId) => async (req, res, next) => {
  try {
    const requestedId = getRequestedId(req);

    if (req.user.role === 'city_admin') {
      if (!requestedId) {
        return res.status(400).json({ success: false, message: 'hospitalId is required for this role' });
      }
      const hospital = await Hospital.findOne({ id: requestedId }).lean();
      if (!hospital || hospital.cityId !== req.user.cityId) {
        return res.status(403).json({ success: false, message: 'That hospital is outside your assigned city' });
      }
      return next();
    }

    if (requestedId && req.user.hospitalId && requestedId !== req.user.hospitalId) {
      return res.status(403).json({ success: false, message: 'You can only view data for your own hospital' });
    }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { requireAuth, requireRole, requireOwnHospital, requireHospitalAccess };
