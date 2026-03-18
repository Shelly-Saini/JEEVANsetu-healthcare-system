const express = require('express');
const { getAll, getById } = require('../utils/db');
const { calcOpdScore, calcBedScore, calcDoctorScore, calcStressScore } = require('../utils/scoring');

const router = express.Router();

// ─── Route ────────────────────────────────────────────────────────────────────

// GET /api/dashboard/:hospitalId
router.get('/:hospitalId', (req, res) => {
  try {
    const { hospitalId } = req.params;

    const hospital = getById('hospitals', hospitalId);
    if (!hospital) {
      return res.status(404).json({ success: false, message: 'Hospital not found' });
    }

    // Fetch all relevant data for this hospital
    const queue     = getAll('opdQueues').filter((q) => q.hospitalId === hospitalId);
    const beds      = getAll('beds').filter((b) => b.hospitalId === hospitalId);
    const doctors   = getAll('doctors').filter((d) => d.hospitalId === hospitalId);
    const inventory = getAll('inventory').filter((i) => i.hospitalId === hospitalId);

    // ── OPD Summary ──────────────────────────────────────────────────────────
    const activeQueue = queue.filter((q) => ['waiting', 'in-progress'].includes(q.status));
    const opdSummary = {
      total: queue.length,
      active: activeQueue.length,
      bySeverity: {
        critical: activeQueue.filter((q) => q.severity === 'critical').length,
        high:     activeQueue.filter((q) => q.severity === 'high').length,
        medium:   activeQueue.filter((q) => q.severity === 'medium').length,
        low:      activeQueue.filter((q) => q.severity === 'low').length,
      },
      completed:  queue.filter((q) => q.status === 'completed').length,
      cancelled:  queue.filter((q) => q.status === 'cancelled').length,
    };

    // ── Bed Summary ───────────────────────────────────────────────────────────
    const bedSummary = beds.reduce((acc, b) => {
      acc[b.type] = {
        total:     b.total,
        available: b.available,
        occupied:  b.occupied,
        cleaning:  b.cleaning,
        occupancyPct: b.total ? Math.round((b.occupied / b.total) * 100) : 0,
      };
      return acc;
    }, {});

    const totalBeds     = beds.reduce((s, b) => s + b.total, 0);
    const availableBeds = beds.reduce((s, b) => s + b.available, 0);
    const occupiedBeds  = beds.reduce((s, b) => s + b.occupied, 0);

    // ── Doctor Summary ────────────────────────────────────────────────────────
    const doctorSummary = {
      total:       doctors.length,
      available:   doctors.filter((d) => d.status === 'available').length,
      busy:        doctors.filter((d) => d.status === 'busy').length,
      unavailable: doctors.filter((d) => d.status === 'unavailable').length,
      byDepartment: doctors.reduce((acc, d) => {
        if (!acc[d.department]) acc[d.department] = { available: 0, busy: 0, unavailable: 0 };
        acc[d.department][d.status]++;
        return acc;
      }, {}),
    };

    // ── Inventory Alerts ──────────────────────────────────────────────────────
    const inventoryAlerts = inventory
      .filter((i) => i.status === 'low' || i.status === 'critical')
      .map(({ id, item, category, quantity, unit, minThreshold, status }) => ({
        id, item, category, quantity, unit, minThreshold, status,
      }));

    // ── Stress Score ──────────────────────────────────────────────────────────
    const opdScore    = calcOpdScore(queue);
    const bedScore    = calcBedScore(beds);
    const doctorScore = calcDoctorScore(doctors);
    const { score: stressScore, label: stressLabel } = calcStressScore(opdScore, bedScore, doctorScore);

    res.json({
      success: true,
      data: {
        hospital: {
          id:      hospital.id,
          name:    hospital.name,
          city:    hospital.city,
          address: hospital.address,
          phone:   hospital.phone,
          status:  hospital.status,
        },
        opd: opdSummary,
        beds: {
          summary: { total: totalBeds, available: availableBeds, occupied: occupiedBeds },
          byType: bedSummary,
        },
        doctors: doctorSummary,
        inventoryAlerts: {
          count: inventoryAlerts.length,
          items: inventoryAlerts,
        },
        stressScore: {
          score:       stressScore,
          label:       stressLabel,
          breakdown: {
            opdLoad:          Math.round(opdScore),
            bedOccupancy:     Math.round(bedScore),
            doctorPressure:   Math.round(doctorScore),
          },
        },
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
