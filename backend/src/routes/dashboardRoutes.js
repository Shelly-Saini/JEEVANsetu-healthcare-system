const express = require('express');
const Hospital = require('../models/Hospital');
const Bed = require('../models/Bed');
const Doctor = require('../models/Doctor');
const OPDQueue = require('../models/OPDQueue');
const Inventory = require('../models/Inventory');
const { calcOpdScore, calcBedScore, calcDoctorScore, calcStressScore } = require('../utils/scoring');
const asyncHandler = require('../utils/asyncHandler');
const { log } = require('../utils/logger');

const router = express.Router();

const safeId = (id) => {
  const s = String(id).replace(/[^a-zA-Z0-9_-]/g, '');
  if (!s) throw new Error('Invalid resource id');
  return s;
};

const computeStatus = (qty, threshold) => {
  if (qty <= threshold * 0.5) return 'critical';
  if (qty <= threshold)       return 'low';
  return 'ok';
};

const mapDoc = (d) => {
  const { _id, __v, ...rest } = d;
  return { ...rest, id: rest.id || _id?.toString() };
};

// GET /api/dashboard/:hospitalId
router.get('/:hospitalId', asyncHandler(async (req, res) => {
  const hospitalId = safeId(req.params.hospitalId);
  log('API', `GET /dashboard/${hospitalId}`);

  const hospitalObj = await Hospital.findOne({ id: hospitalId }).lean();
  if (!hospitalObj) return res.status(404).json({ success: false, message: 'Hospital not found' });
  const hospital = mapDoc(hospitalObj);

  const [bedsData, doctorsData, queueData, inventoryData] = await Promise.all([
    Bed.find({ hospitalId }).lean(),
    Doctor.find({ hospitalId }).lean(),
    OPDQueue.find({ hospitalId }).lean(),
    Inventory.find({ hospitalId }).lean()
  ]);

  const beds = bedsData.map(mapDoc);
  const doctors = doctorsData.map(mapDoc);
  const queue = queueData.map(mapDoc);
  const inventory = inventoryData.map(mapDoc);

  // OPD summary
  const activeQueue = queue.filter(q => ['waiting', 'in-progress'].includes(q.status));
  const opdSummary  = {
    total:    queue.length,
    active:   activeQueue.length,
    bySeverity: {
      critical: activeQueue.filter(q => q.severity === 'critical').length,
      high:     activeQueue.filter(q => q.severity === 'high').length,
      medium:   activeQueue.filter(q => q.severity === 'medium').length,
      low:      activeQueue.filter(q => q.severity === 'low').length,
    },
    completed: queue.filter(q => q.status === 'completed').length,
    cancelled: queue.filter(q => q.status === 'cancelled').length,
  };

  // Bed summary
  const bedSummary = beds.reduce((acc, b) => {
    if (!acc[b.type]) {
      acc[b.type] = { total: 0, available: 0, occupied: 0, cleaning: 0 };
    }
    acc[b.type].total     += (b.total     || 0);
    acc[b.type].available += (b.available || 0);
    acc[b.type].occupied  += (b.occupied  || 0);
    acc[b.type].cleaning  += (b.cleaning  || 0);
    return acc;
  }, {});

  // Calculate occupancy percentages
  Object.keys(bedSummary).forEach(t => {
    const b = bedSummary[t];
    b.occupancyPct = b.total ? Math.round((b.occupied / b.total) * 100) : 0;
  });

  const totalBeds     = beds.reduce((s, b) => s + (b.total || 0), 0);
  const availableBeds = beds.reduce((s, b) => s + (b.available || 0), 0);
  const occupiedBeds  = beds.reduce((s, b) => s + (b.occupied || 0), 0);

  // Doctor summary
  const doctorSummary = {
    total:       doctors.length,
    available:   doctors.filter(d => d.status === 'available').length,
    busy:        doctors.filter(d => d.status === 'busy').length,
    unavailable: doctors.filter(d => d.status === 'unavailable').length,
    byDepartment: doctors.reduce((acc, d) => {
      if (!acc[d.department]) acc[d.department] = { available: 0, busy: 0, unavailable: 0 };
      acc[d.department][d.status]++;
      return acc;
    }, {}),
  };

  // Inventory alerts
  const inventoryAlerts = inventory
    .filter(i => ['low', 'critical'].includes(computeStatus(i.quantity, i.minThreshold)))
    .map(({ id, item, category, quantity, unit, minThreshold }) => ({
      id, item, category, quantity, unit, minThreshold,
      status: computeStatus(quantity, minThreshold),
    }));

  // Stress score
  const opdScore    = calcOpdScore(queue);
  const bedScore    = calcBedScore(beds);
  const doctorScore = calcDoctorScore(doctors);
  const { score: stressScore, label: stressLabel } = calcStressScore(opdScore, bedScore, doctorScore);

  res.json({
    success: true,
    data: {
      hospital: { id: hospital.id, name: hospital.name, city: hospital.city,
                  address: hospital.address, phone: hospital.phone, status: hospital.status },
      opd:      opdSummary,
      beds:     { summary: { total: totalBeds, available: availableBeds, occupied: occupiedBeds }, byType: bedSummary },
      doctors:  doctorSummary,
      inventoryAlerts: { count: inventoryAlerts.length, items: inventoryAlerts },
      stressScore: {
        score: stressScore, label: stressLabel,
        breakdown: { opdLoad: Math.round(opdScore), bedOccupancy: Math.round(bedScore), doctorPressure: Math.round(doctorScore) },
      },
      generatedAt: new Date().toISOString(),
    },
  });
}));

module.exports = router;
