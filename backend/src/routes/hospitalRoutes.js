const express = require('express');
const Hospital = require('../models/Hospital');
const asyncHandler = require('../utils/asyncHandler');
const { log } = require('../utils/logger');

const router = express.Router();

const mapDoc = (d) => {
  const { _id, __v, ...rest } = d;
  return { ...rest, id: rest.id || _id?.toString() };
};

// Only non-operational directory fields are ever returned here — no beds,
// doctors, OPD, inventory, or stress-score data. That's what makes it safe
// to expose without auth.
const publicFields = (h) => ({
  id: h.id, name: h.name, city: h.city, cityId: h.cityId, address: h.address, phone: h.phone,
});

// GET /hospitals — PUBLIC on purpose.
// This is a plain hospital directory (name/city/address), not operational
// data, and it's needed by the Signup page BEFORE a user has an account or
// a JWT — so it can never require requireAuth. Every operational endpoint
// (beds, doctors, OPD, inventory, dashboard, city, admissions, audit) still
// requires auth exactly as before; only this directory listing is public.
router.get('/', asyncHandler(async (req, res) => {
  log('API', 'GET /hospitals');
  const { city } = req.query;
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const page = parseInt(req.query.page) || 1;

  const filter = {};
  if (city) filter.city = new RegExp(`^${city.trim().replace(/[^a-zA-Z0-9 ]/g, '')}$`, 'i');

  const data = await Hospital.find(filter)
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  res.json({ success: true, count: data.length, data: data.map(mapDoc).map(publicFields) });
}));

// GET /hospitals/:id — also public, same reasoning, same field restriction.
router.get('/:id', asyncHandler(async (req, res) => {
  log('API', `GET /hospitals/${req.params.id}`);
  const sId = String(req.params.id).replace(/[^a-zA-Z0-9_-]/g, '');
  const hospital = await Hospital.findOne({ id: sId }).lean();
  if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' });

  res.json({ success: true, data: publicFields(mapDoc(hospital)) });
}));

module.exports = router;
