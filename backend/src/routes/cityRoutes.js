const express = require('express');
const Hospital = require('../models/Hospital');
const Bed = require('../models/Bed');
const Doctor = require('../models/Doctor');
const OPDQueue = require('../models/OPDQueue');
const { computeHospitalScores } = require('../utils/scoring');
const asyncHandler = require('../utils/asyncHandler');
const { log } = require('../utils/logger');

const router = express.Router();

const mapDoc = (d) => {
  const { _id, __v, ...rest } = d;
  return { ...rest, id: rest.id || _id?.toString() };
};

const buildHospitalSummary = async (hospitalData) => {
  const hospital = mapDoc(hospitalData);
  const [bedsData, doctorsData, queueData] = await Promise.all([
    Bed.find({ hospitalId: hospital.id }).lean(),
    Doctor.find({ hospitalId: hospital.id }).lean(),
    OPDQueue.find({ hospitalId: hospital.id }).lean()
  ]);

  const beds = bedsData.map(mapDoc);
  const doctors = doctorsData.map(mapDoc);
  const queue = queueData.map(mapDoc);

  const active       = queue.filter(q => ['waiting', 'in-progress'].includes(q.status)).length;
  const totalBeds    = beds.reduce((s, b) => s + b.total, 0);
  const occupiedBeds = beds.reduce((s, b) => s + b.occupied, 0);
  const scores       = computeHospitalScores(queue, beds, doctors);

  return {
    hospitalId:         hospital.id,
    name:               hospital.name,
    city:               hospital.city,
    address:            hospital.address,
    lat:                hospital.lat,
    lng:                hospital.lng,
    stressScore:        scores.score,
    level:              scores.label,
    opdLoad:            scores.opdLoad,
    bedOccupancy:       scores.bedOccupancy,
    doctorAvailability: scores.doctorAvailability,
    stats: {
      totalOpdPatients:  queue.length,
      activeOpdPatients: active,
      totalBeds,
      occupiedBeds,
      availableBeds:     totalBeds - occupiedBeds,
      totalDoctors:      doctors.length,
      availableDoctors:  doctors.filter(d => d.status === 'available').length,
    },
  };
};

// GET /api/city?city=Delhi
router.get('/', asyncHandler(async (req, res) => {
  const city = req.query.city || 'Delhi';
  log('API', `GET /city?city=${city}`);
  
  const normalizedCity = city.trim().replace(/[^a-zA-Z0-9 ]/g, '');
  const hospitalsData = await Hospital.find({ city: new RegExp(`^${normalizedCity}$`, 'i') }).lean();

  if (!hospitalsData.length) {
    return res.status(404).json({ success: false, message: 'No hospitals found' });
  }

  const summaries = await Promise.all(hospitalsData.map(buildHospitalSummary));
  summaries.sort((a, b) => a.stressScore - b.stressScore);

  const best      = summaries[0];
  const cityStats = {
    totalHospitals:          summaries.length,
    critical:                summaries.filter(h => h.level === 'High').length,
    moderate:                summaries.filter(h => h.level === 'Medium').length,
    normal:                  summaries.filter(h => h.level === 'Low').length,
    avgStressScore:          Math.round(summaries.reduce((s, h) => s + h.stressScore, 0) / summaries.length),
    totalActivePatientsCity: summaries.reduce((s, h) => s + h.stats.activeOpdPatients, 0),
    totalAvailableBedsCity:  summaries.reduce((s, h) => s + h.stats.availableBeds, 0),
  };

  res.json({
    success: true,
    data: {
      cityStats,
      hospitals: summaries,
      bestHospital: {
        hospitalId:  best.hospitalId,
        name:        best.name,
        stressScore: best.stressScore,
        level:       best.level,
        reason:      `Lowest stress score (${best.stressScore}/100) with ${best.stats.availableBeds} beds available`,
      },
      generatedAt: new Date().toISOString(),
    },
  });
}));

module.exports = router;
