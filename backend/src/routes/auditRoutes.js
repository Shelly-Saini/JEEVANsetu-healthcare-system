const express = require('express');
const AuditLog = require('../models/AuditLog');
const Hospital = require('../models/Hospital');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { log } = require('../utils/logger');

const router = express.Router();

const mapDoc = (d) => {
  const { _id, __v, ...rest } = d;
  return { ...rest, id: rest.id || _id?.toString() };
};

// GET /audit?hospitalId=h1&resourceType=bed&actorRole=admin&since=...&until=...&search=...&page=1&limit=30
//
// Scoping rule (enforced here, not just hidden in the UI):
//  - admin/doctor/staff are always locked to their own hospitalId from the JWT.
//  - city_admin may filter by any hospitalId, but ONLY if that hospital
//    actually belongs to their assigned city — passing an arbitrary
//    hospitalId from another city is rejected with 403, not silently allowed.
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 30, 100);
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const filter = {};

  if (req.user.role === 'city_admin') {
    if (req.query.hospitalId) {
      const hospital = await Hospital.findOne({ id: req.query.hospitalId }).lean();
      if (!hospital || hospital.cityId !== req.user.cityId) {
        return res.status(403).json({ success: false, message: 'That hospital is outside your assigned city' });
      }
      filter.hospitalId = req.query.hospitalId;
    } else {
      // No specific hospital requested — scope to every hospital in the city.
      const cityHospitals = await Hospital.find({ cityId: req.user.cityId }).select('id').lean();
      filter.hospitalId = { $in: cityHospitals.map((h) => h.id) };
    }
  } else {
    filter.hospitalId = req.user.hospitalId;
  }

  if (req.query.resourceType) filter.resourceType = req.query.resourceType;
  if (req.query.actorRole) filter.actorRole = req.query.actorRole;
  if (req.query.since || req.query.until) {
    filter.createdAt = {};
    if (req.query.since) filter.createdAt.$gte = new Date(req.query.since);
    if (req.query.until) filter.createdAt.$lte = new Date(req.query.until);
  }
  if (req.query.search) {
    filter.summary = { $regex: req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  }

  log('API', `GET /audit ${JSON.stringify({ ...filter, page, limit })}`);

  const [rows, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    AuditLog.countDocuments(filter),
  ]);

  res.json({ success: true, count: rows.length, total, page, hasMore: page * limit < total, data: rows.map(mapDoc) });
}));

module.exports = router;
