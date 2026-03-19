const express = require('express');
const Hospital = require('../models/Hospital');
const asyncHandler = require('../utils/asyncHandler');
const { log } = require('../utils/logger');

const router = express.Router();

const mapDoc = (d) => {
  const { _id, __v, ...rest } = d;
  return { ...rest, id: rest.id || _id?.toString() };
};

router.get('/', asyncHandler(async (req, res) => {
  log('API', 'GET /hospitals');
  const { city } = req.query;
  const limit = parseInt(req.query.limit) || 20;
  const page = parseInt(req.query.page) || 1;

  const filter = {};
  if (city) filter.city = new RegExp(`^${city.trim().replace(/[^a-zA-Z0-9 ]/g, '')}$`, 'i');

  const data = await Hospital.find(filter)
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  res.json({ success: true, count: data.length, data: data.map(mapDoc) });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  log('API', `GET /hospitals/${req.params.id}`);
  const sId = String(req.params.id).replace(/[^a-zA-Z0-9_-]/g, '');
  const hospital = await Hospital.findOne({ id: sId }).lean();
  if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' });
  
  res.json({ success: true, data: mapDoc(hospital) });
}));

module.exports = router;
