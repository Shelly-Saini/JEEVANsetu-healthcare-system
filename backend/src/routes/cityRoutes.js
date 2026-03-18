const express = require('express');
const { getAll } = require('../utils/db');
const { computeHospitalScores } = require('../utils/scoring');

const router = express.Router();

// Pre-load all collections once per request (avoids repeated getAll calls in the loop)
const loadCollections = () => ({
  allQueues:  getAll('opdQueues'),
  allBeds:    getAll('beds'),
  allDoctors: getAll('doctors'),
});

// Build the per-hospital summary object
const buildHospitalSummary = (hospital, allQueues, allBeds, allDoctors) => {
  const queue   = allQueues.filter((q) => q.hospitalId === hospital.id);
  const beds    = allBeds.filter((b)   => b.hospitalId === hospital.id);
  const doctors = allDoctors.filter((d) => d.hospitalId === hospital.id);

  const active      = queue.filter((q) => ['waiting', 'in-progress'].includes(q.status)).length;
  const totalBeds   = beds.reduce((s, b) => s + b.total, 0);
  const occupiedBeds= beds.reduce((s, b) => s + b.occupied, 0);

  const scores = computeHospitalScores(queue, beds, doctors);

  return {
    hospitalId:          hospital.id,
    name:                hospital.name,
    city:                hospital.city,
    address:             hospital.address,
    lat:                 hospital.lat,
    lng:                 hospital.lng,
    stressScore:         scores.score,
    level:               scores.label,           // Low / Medium / High
    opdLoad:             scores.opdLoad,          // 0–100
    bedOccupancy:        scores.bedOccupancy,     // 0–100
    doctorAvailability:  scores.doctorAvailability, // % available
    stats: {
      totalOpdPatients:  queue.length,
      activeOpdPatients: active,
      totalBeds,
      occupiedBeds,
      availableBeds:     totalBeds - occupiedBeds,
      totalDoctors:      doctors.length,
      availableDoctors:  doctors.filter((d) => d.status === 'available').length,
    },
  };
};

// GET /api/city  — optional ?city= filter
router.get('/', (req, res) => {
  try {
    const { city } = req.query;
    const { allQueues, allBeds, allDoctors } = loadCollections();

    let hospitals = getAll('hospitals');
    if (city) hospitals = hospitals.filter((h) => h.city.toLowerCase() === city.toLowerCase());

    if (!hospitals.length) {
      return res.status(404).json({ success: false, message: 'No hospitals found' });
    }

    // Build summary for each hospital
    const summaries = hospitals
      .map((h) => buildHospitalSummary(h, allQueues, allBeds, allDoctors))
      .sort((a, b) => a.stressScore - b.stressScore); // ascending → least stressed first

    // Best hospital = lowest stress score (first after sort)
    const best = summaries[0];

    // City-wide aggregates
    const cityStats = {
      totalHospitals:    summaries.length,
      critical:          summaries.filter((h) => h.level === 'High').length,
      moderate:          summaries.filter((h) => h.level === 'Medium').length,
      normal:            summaries.filter((h) => h.level === 'Low').length,
      avgStressScore:    Math.round(summaries.reduce((s, h) => s + h.stressScore, 0) / summaries.length),
      totalActivePatientsCity: summaries.reduce((s, h) => s + h.stats.activeOpdPatients, 0),
      totalAvailableBedsCity:  summaries.reduce((s, h) => s + h.stats.availableBeds, 0),
    };

    res.json({
      success: true,
      data: {
        cityStats,
        hospitals: summaries,
        bestHospital: {
          hospitalId: best.hospitalId,
          name:       best.name,
          stressScore:best.stressScore,
          level:      best.level,
          reason:     `Lowest stress score (${best.stressScore}/100) with ${best.stats.availableBeds} beds available`,
        },
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
