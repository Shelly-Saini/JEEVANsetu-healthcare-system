const express = require('express');
const Hospital = require('../models/Hospital');
const MetricSnapshot = require('../models/MetricSnapshot');
const { computeHospitalMetrics, mapDoc } = require('../utils/hospitalMetrics');
const { requireAuth, requireHospitalAccess } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { log } = require('../utils/logger');

const router = express.Router();

const safeId = (id) => {
  const s = String(id).replace(/[^a-zA-Z0-9_-]/g, '');
  if (!s) throw new Error('Invalid resource id');
  return s;
};

// GET /dashboard/:hospitalId
router.get('/:hospitalId', requireAuth, requireHospitalAccess((req) => req.params.hospitalId), asyncHandler(async (req, res) => {
  const hospitalId = safeId(req.params.hospitalId);
  log('API', `GET /dashboard/${hospitalId}`);

  const hospitalObj = await Hospital.findOne({ id: hospitalId }).lean();
  if (!hospitalObj) return res.status(404).json({ success: false, message: 'Hospital not found' });
  const hospital = mapDoc(hospitalObj);

  const m = await computeHospitalMetrics(hospitalId);

  const bedSummary = m.beds.reduce((acc, b) => {
    if (!acc[b.type]) acc[b.type] = { total: 0, available: 0, occupied: 0, cleaning: 0 };
    acc[b.type].total += (b.total || 0);
    acc[b.type].available += (b.available || 0);
    acc[b.type].occupied += (b.occupied || 0);
    acc[b.type].cleaning += (b.cleaning || 0);
    return acc;
  }, {});
  Object.keys(bedSummary).forEach((t) => {
    const b = bedSummary[t];
    b.occupancyPct = b.total ? Math.round((b.occupied / b.total) * 100) : 0;
  });

  const opdSummary = {
    total: m.queue.length,
    active: m.activeQueue.length,
    bySeverity: {
      critical: m.activeQueue.filter((q) => q.severity === 'critical').length,
      high: m.activeQueue.filter((q) => q.severity === 'high').length,
      medium: m.activeQueue.filter((q) => q.severity === 'medium').length,
      low: m.activeQueue.filter((q) => q.severity === 'low').length,
    },
    completed: m.queue.filter((q) => q.status === 'completed').length,
    cancelled: m.queue.filter((q) => q.status === 'cancelled').length,
  };

  const doctorSummary = {
    total: m.doctors.length,
    available: m.availableDoctors,
    busy: m.busyDoctors,
    unavailable: m.unavailableDoctors,
    byDepartment: m.doctors.reduce((acc, d) => {
      if (!acc[d.department]) acc[d.department] = { available: 0, busy: 0, unavailable: 0 };
      acc[d.department][d.status]++;
      return acc;
    }, {}),
  };

  res.json({
    success: true,
    data: {
      hospital: { id: hospital.id, name: hospital.name, city: hospital.city,
                  address: hospital.address, phone: hospital.phone, status: hospital.status },
      opd: opdSummary,
      beds: { summary: { total: m.totalBeds, available: m.availableBeds, occupied: m.occupiedBeds }, byType: bedSummary },
      doctors: doctorSummary,
      inventoryAlerts: { count: m.inventoryAlerts.length, items: m.inventoryAlerts },
      stressScore: { score: m.stressScore, label: m.stressLabel, breakdown: m.breakdown },
      generatedAt: new Date().toISOString(),
    },
  });
}));

// GET /dashboard/:hospitalId/history?hours=24 — recorded snapshots for trend charts
router.get('/:hospitalId/history', requireAuth, requireHospitalAccess((req) => req.params.hospitalId), asyncHandler(async (req, res) => {
  const hospitalId = safeId(req.params.hospitalId);
  const hours = Math.min(parseInt(req.query.hours) || 24, 168);
  const since = new Date(Date.now() - hours * 3_600_000);

  const rows = await MetricSnapshot.find({ hospitalId, capturedAt: { $gte: since } })
    .sort({ capturedAt: 1 })
    .lean();

  res.json({ success: true, count: rows.length, data: rows.map(mapDoc) });
}));

module.exports = router;
