const express = require('express');
const MetricSnapshot = require('../models/MetricSnapshot');
const { buildForecast } = require('../utils/forecast');
const { requireAuth, requireHospitalAccess } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { log } = require('../utils/logger');

const router = express.Router();

// GET /forecast/:hospitalId?hours=24 — projects bed shortage / stress trend
// from the most recent snapshots (see utils/forecast.js for the method).
router.get('/:hospitalId', requireAuth, requireHospitalAccess((req) => req.params.hospitalId), asyncHandler(async (req, res) => {
  const { hospitalId } = req.params;
  const hours = Math.min(parseInt(req.query.hours) || 24, 168);
  log('API', `GET /forecast/${hospitalId}`);

  const since = new Date(Date.now() - hours * 3_600_000);
  const snapshots = await MetricSnapshot.find({ hospitalId, capturedAt: { $gte: since } })
    .sort({ capturedAt: 1 })
    .lean();

  const forecast = buildForecast(snapshots);
  res.json({ success: true, data: forecast });
}));

module.exports = router;
