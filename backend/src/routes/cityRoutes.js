const express = require('express');
const Hospital = require('../models/Hospital');
const { computeHospitalMetrics, mapDoc } = require('../utils/hospitalMetrics');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { log } = require('../utils/logger');

const router = express.Router();

const buildHospitalSummary = async (hospitalData) => {
  const hospital = mapDoc(hospitalData);
  const m = await computeHospitalMetrics(hospital.id);

  return {
    hospitalId: hospital.id,
    name: hospital.name,
    city: hospital.city,
    address: hospital.address,
    lat: hospital.lat,
    lng: hospital.lng,
    stressScore: m.stressScore,
    level: m.stressLabel,
    opdLoad: m.breakdown.opdLoad,
    bedOccupancy: m.breakdown.bedOccupancy,
    doctorAvailability: m.doctors.length
      ? Math.round((m.availableDoctors / m.doctors.length) * 100)
      : 0,
    stats: {
      totalOpdPatients: m.queue.length,
      activeOpdPatients: m.activeQueue.length,
      totalBeds: m.totalBeds,
      occupiedBeds: m.occupiedBeds,
      availableBeds: m.availableBeds,
      totalDoctors: m.doctors.length,
      availableDoctors: m.availableDoctors,
    },
  };
};

// GET /city?city=Delhi  or  ?cityId=city1
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  let { city, cityId } = req.query;
  if (!city && !cityId && req.user.role === 'city_admin') cityId = req.user.cityId;
  if (!city && !cityId) city = 'Delhi';
  log('API', `GET /city city=${city || ''} cityId=${cityId || ''}`);

  const filter = cityId
    ? { cityId }
    : { city: new RegExp(`^${String(city).trim().replace(/[^a-zA-Z0-9 ]/g, '')}$`, 'i') };

  const hospitalsData = await Hospital.find(filter).lean();

  if (!hospitalsData.length) {
    return res.status(404).json({ success: false, message: 'No hospitals found' });
  }

  const summaries = await Promise.all(hospitalsData.map(buildHospitalSummary));
  summaries.sort((a, b) => a.stressScore - b.stressScore);

  const best = summaries[0];
  const cityStats = {
    totalHospitals: summaries.length,
    critical: summaries.filter((h) => h.level === 'High').length,
    moderate: summaries.filter((h) => h.level === 'Medium').length,
    normal: summaries.filter((h) => h.level === 'Low').length,
    avgStressScore: Math.round(summaries.reduce((s, h) => s + h.stressScore, 0) / summaries.length),
    totalActivePatientsCity: summaries.reduce((s, h) => s + h.stats.activeOpdPatients, 0),
    totalAvailableBedsCity: summaries.reduce((s, h) => s + h.stats.availableBeds, 0),
  };

  res.json({
    success: true,
    data: {
      cityStats,
      hospitals: summaries,
      bestHospital: {
        hospitalId: best.hospitalId,
        name: best.name,
        stressScore: best.stressScore,
        level: best.level,
        reason: `Lowest stress score (${best.stressScore}/100) with ${best.stats.availableBeds} beds available`,
      },
      generatedAt: new Date().toISOString(),
    },
  });
}));

module.exports = router;
