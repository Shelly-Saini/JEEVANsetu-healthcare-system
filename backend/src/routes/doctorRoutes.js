const express = require('express');
const { getAll, getById, add, update, remove } = require('../utils/db');

const router = express.Router();

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_STATUSES    = ['available', 'busy', 'unavailable'];
const VALID_DEPARTMENTS = ['Cardiology', 'Neurology', 'Orthopedics', 'General', 'Emergency',
                           'Oncology', 'Pediatrics', 'Gynecology'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Derive status from workload if not explicitly provided
const deriveStatus = (workload, currentStatus) => {
  if (workload > 80)  return 'busy';
  if (workload >= 70) return currentStatus === 'unavailable' ? 'unavailable' : 'busy';
  if (workload <= 50) return currentStatus === 'unavailable' ? 'unavailable' : 'available';
  return currentStatus;
};

// Validate status ↔ workload consistency
const validateWorkloadStatus = (status, workload) => {
  if (status === 'busy'      && workload < 70)  return 'busy status requires workload ≥ 70';
  if (status === 'available' && workload > 50)  return 'available status requires workload ≤ 50';
  return null;
};

// Enrich a doctor record with computed fields
const enrich = (doctor) => ({
  ...doctor,
  workload:     doctor.workload ?? Math.round((doctor.patientsToday / doctor.maxPatients) * 100),
  isOverloaded: (doctor.workload ?? Math.round((doctor.patientsToday / doctor.maxPatients) * 100)) > 80,
});

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/doctors  — optional ?hospitalId= &department= &status= filters
router.get('/', (req, res) => {
  try {
    const { hospitalId, department, status } = req.query;
    let doctors = getAll('doctors');

    if (hospitalId)  doctors = doctors.filter((d) => d.hospitalId  === hospitalId);
    if (department)  doctors = doctors.filter((d) => d.department.toLowerCase() === department.toLowerCase());
    if (status)      doctors = doctors.filter((d) => d.status      === status.toLowerCase());

    res.json({ success: true, count: doctors.length, data: doctors.map(enrich) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/doctors/:id
router.get('/:id', (req, res) => {
  try {
    const doctor = getById('doctors', req.params.id);
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });
    res.json({ success: true, data: enrich(doctor) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/doctors  — add new doctor
router.post('/', (req, res) => {
  try {
    const { name, department, hospitalId, status = 'available', workload = 0, shift = 'morning' } = req.body;

    if (!name || !department || !hospitalId) {
      return res.status(400).json({ success: false, message: 'name, department, and hospitalId are required' });
    }

    if (!VALID_DEPARTMENTS.includes(department)) {
      return res.status(400).json({
        success: false,
        message: `department must be one of: ${VALID_DEPARTMENTS.join(', ')}`,
      });
    }

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    if (!getById('hospitals', hospitalId)) {
      return res.status(404).json({ success: false, message: 'Hospital not found' });
    }

    const workloadNum = Number(workload);
    if (workloadNum < 0 || workloadNum > 100) {
      return res.status(400).json({ success: false, message: 'workload must be between 0 and 100' });
    }

    const conflict = validateWorkloadStatus(status, workloadNum);
    if (conflict) return res.status(400).json({ success: false, message: conflict });

    const newDoctor = add('doctors', {
      name:           name.trim(),
      department,
      hospitalId,
      status,
      workload:       workloadNum,
      shift,
      patientsToday:  0,
      maxPatients:    20,
    });

    res.status(201).json({ success: true, data: enrich(newDoctor) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/doctors/:id  — update status, workload, or patientsToday
router.put('/:id', (req, res) => {
  try {
    const doctor = getById('doctors', req.params.id);
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });

    const { status, workload, patientsToday, shift } = req.body;
    const patch = {};

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `status must be one of: ${VALID_STATUSES.join(', ')}`,
        });
      }
      patch.status = status;
    }

    if (workload !== undefined) {
      const workloadNum = Number(workload);
      if (workloadNum < 0 || workloadNum > 100) {
        return res.status(400).json({ success: false, message: 'workload must be between 0 and 100' });
      }
      patch.workload = workloadNum;
      // Auto-derive status from workload if status not explicitly in this request
      if (status === undefined) patch.status = deriveStatus(workloadNum, doctor.status);
    }

    // Cross-validate final status + workload after applying patch
    const finalStatus   = patch.status   ?? doctor.status;
    const finalWorkload = patch.workload ?? doctor.workload ?? 0;
    const conflict = validateWorkloadStatus(finalStatus, finalWorkload);
    if (conflict) return res.status(400).json({ success: false, message: conflict });

    if (patientsToday !== undefined) patch.patientsToday = Number(patientsToday);
    if (shift         !== undefined) patch.shift         = shift;

    const updated = update('doctors', req.params.id, patch);
    res.json({ success: true, data: enrich(updated) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/doctors/:id
router.delete('/:id', (req, res) => {
  try {
    const removed = remove('doctors', req.params.id);
    if (!removed) return res.status(404).json({ success: false, message: 'Doctor not found' });
    res.json({ success: true, message: 'Doctor removed', data: removed });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
