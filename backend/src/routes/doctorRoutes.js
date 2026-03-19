const express = require('express');
const Doctor = require('../models/Doctor');
const Hospital = require('../models/Hospital');
const csrf = require('../middleware/csrf');
const asyncHandler = require('../utils/asyncHandler');
const { log } = require('../utils/logger');

const router = express.Router();

const safeId = (id) => {
  const s = String(id).replace(/[^a-zA-Z0-9_-]/g, '');
  if (!s) throw new Error('Invalid resource id');
  return s;
};

const VALID_STATUSES    = ['available', 'busy', 'unavailable'];
const VALID_DEPARTMENTS = ['Cardiology', 'Neurology', 'Orthopedics', 'General', 'Emergency',
                           'Oncology', 'Pediatrics', 'Gynecology'];

const deriveStatus = (workload, currentStatus) => {
  if (workload > 80)  return 'busy';
  if (workload >= 70) return currentStatus === 'unavailable' ? 'unavailable' : 'busy';
  if (workload <= 50) return currentStatus === 'unavailable' ? 'unavailable' : 'available';
  return currentStatus;
};

const validateWorkloadStatus = (status, workload) => {
  if (status === 'busy'      && workload < 70)  return 'busy status requires workload ≥ 70';
  if (status === 'available' && workload > 50)  return 'available status requires workload ≤ 50';
  return null;
};

const mapDoc = (d) => {
  const { _id, __v, ...rest } = d;
  return { ...rest, id: rest.id || _id?.toString() };
};

const enrich = (doc) => {
  const doctor = mapDoc(doc);
  return {
    ...doctor,
    workload:     doctor.workload ?? Math.round((doctor.patientsToday / doctor.maxPatients) * 100),
    isOverloaded: (doctor.workload ?? Math.round((doctor.patientsToday / doctor.maxPatients) * 100)) > 80,
  };
};

router.get('/', asyncHandler(async (req, res) => {
  log('API', `GET /doctors`);
  const { hospitalId, department, status } = req.query;
  const limit = parseInt(req.query.limit) || 20;
  const page = parseInt(req.query.page) || 1;

  const filter = {};
  if (hospitalId) filter.hospitalId = hospitalId;
  if (department) filter.department = { $regex: new RegExp(`^${department}$`, "i") };
  if (status)     filter.status = status.toLowerCase();

  const doctors = await Doctor.find(filter)
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  res.json({ success: true, count: doctors.length, data: doctors.map(enrich) });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  log('API', `GET /doctors/${req.params.id}`);
  const doctor = await Doctor.findOne({ id: safeId(req.params.id) }).lean();
  if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });
  res.json({ success: true, data: enrich(doctor) });
}));

// csrf: Double Submit Cookie — validates x-csrf-token header against csrf-token cookie
router.post('/', csrf, asyncHandler(async (req, res) => {
  log('API', `POST /doctors`);
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

  const hospital = await Hospital.findOne({ id: hospitalId }).lean();
  if (!hospital) {
    return res.status(404).json({ success: false, message: 'Hospital not found' });
  }

  const workloadNum = Number(workload);
  if (workloadNum < 0 || workloadNum > 100) {
    return res.status(400).json({ success: false, message: 'workload must be between 0 and 100' });
  }

  const conflict = validateWorkloadStatus(status, workloadNum);
  if (conflict) return res.status(400).json({ success: false, message: conflict });

  const newDoctor = await Doctor.create({
    name:           name.trim(),
    department,
    hospitalId,
    status,
    workload:       workloadNum,
    shift,
    patientsToday:  0,
    maxPatients:    20,
  });

  res.status(201).json({ success: true, data: enrich(newDoctor.toJSON()) });
}));

// csrf: Double Submit Cookie — validates x-csrf-token header against csrf-token cookie
router.put('/:id', csrf, asyncHandler(async (req, res) => {
  log('API', `PUT /doctors/${req.params.id}`);
  const safeParamId = safeId(req.params.id);
  const doctor = await Doctor.findOne({ id: safeParamId }).lean();
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
    if (status === undefined) patch.status = deriveStatus(workloadNum, doctor.status);
  }

  const finalStatus   = patch.status  ?? doctor.status;
  const finalWorkload = patch.workload ?? doctor.workload ?? 0;
  const conflict = validateWorkloadStatus(finalStatus, finalWorkload);
  if (conflict) return res.status(400).json({ success: false, message: conflict });

  if (patientsToday !== undefined) patch.patientsToday = Number(patientsToday);
  if (shift         !== undefined) patch.shift         = shift;

  const updated = await Doctor.findOneAndUpdate({ id: safeParamId }, patch, { new: true }).lean();
  res.json({ success: true, data: enrich(updated) });
}));

// csrf: Double Submit Cookie — validates x-csrf-token header against csrf-token cookie
router.delete('/:id', csrf, asyncHandler(async (req, res) => {
  log('API', `DELETE /doctors/${req.params.id}`);
  const removed = await Doctor.findOneAndDelete({ id: safeId(req.params.id) }).lean();
  if (!removed) return res.status(404).json({ success: false, message: 'Doctor not found' });
  res.json({ success: true, message: 'Doctor removed', data: enrich(removed) });
}));

module.exports = router;
