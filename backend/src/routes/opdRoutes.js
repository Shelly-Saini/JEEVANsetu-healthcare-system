const express = require('express');
const OPDQueue = require('../models/OPDQueue');
const Hospital = require('../models/Hospital');
const { OPD_SEVERITIES, OPD_STATUSES, SEVERITY_WAIT_MINUTES } = require('../constants/enums');
const { rateLimiter } = require('../middleware/rateLimiter');
const { requireAuth, requireRole, requireOwnHospital, requireHospitalAccess } = require('../middleware/auth');
const { recordAudit } = require('../utils/audit');
const { recalcWaitTimes } = require('../utils/opdWaitTimes');
const { emitToHospital } = require('../realtime/socket');
const asyncHandler = require('../utils/asyncHandler');
const { log } = require('../utils/logger');

const router = express.Router();

const safeId = (id) => {
  const s = String(id).replace(/[^a-zA-Z0-9_-]/g, '');
  if (!s) throw new Error('Invalid resource id');
  return s;
};

const VALID_SEVERITIES = OPD_SEVERITIES;
const VALID_STATUSES = OPD_STATUSES;

const generateToken = async (hospitalId) => {
  const prefixMap = { h1: 'A', h2: 'B', h3: 'C', h4: 'D' };
  const prefix = prefixMap[hospitalId] || 'Z';
  const result = await OPDQueue.aggregate([
    { $match: { hospitalId } },
    { $project: { num: { $toInt: { $substr: ['$token', 1, -1] } } } },
    { $group: { _id: null, max: { $max: '$num' } } },
  ]);
  const maxNum = result[0]?.max ?? 0;
  return `${prefix}${String(maxNum + 1).padStart(3, '0')}`;
};

const mapDoc = (d) => {
  const { _id, __v, ...rest } = d;
  return { ...rest, id: rest.id || _id?.toString() };
};

router.get('/', requireAuth, requireHospitalAccess((req) => req.query.hospitalId), asyncHandler(async (req, res) => {
  log('API', `GET /opd`);
  const hospitalId = req.query.hospitalId || (req.user.role !== 'city_admin' ? req.user.hospitalId : undefined);
  const limit = parseInt(req.query.limit) || 20;
  const page = parseInt(req.query.page) || 1;

  const filter = hospitalId ? { hospitalId } : {};
  const queueData = await OPDQueue.find(filter).skip((page - 1) * limit).limit(limit).lean();
  const queue = queueData.map(mapDoc);

  const order = { critical: 0, high: 1, medium: 2, low: 3 };
  queue.sort((a, b) => order[a.severity] - order[b.severity] || new Date(a.registeredAt) - new Date(b.registeredAt));

  res.json({ success: true, count: queue.length, data: queue });
}));

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  log('API', `GET /opd/${req.params.id}`);
  const entry = await OPDQueue.findOne({ id: safeId(req.params.id) }).lean();
  if (!entry) return res.status(404).json({ success: false, message: 'Queue entry not found' });
  res.json({ success: true, data: mapDoc(entry) });
}));

router.post(
  '/',
  requireAuth,
  requireRole('admin', 'doctor', 'staff'),
  requireOwnHospital((req) => req.body.hospitalId),
  rateLimiter('opd-register'),
  asyncHandler(async (req, res) => {
    log('API', `POST /opd`);
    const { patientName, age, department, severity, hospitalId } = req.body;

    if (!patientName || !department || !severity || !hospitalId) {
      return res.status(400).json({ success: false, message: 'patientName, department, severity, and hospitalId are required' });
    }
    if (patientName.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'patientName must be at least 2 characters' });
    }
    if (age !== undefined && age !== null && (Number(age) < 0 || Number(age) > 120)) {
      return res.status(400).json({ success: false, message: 'age must be between 0 and 120' });
    }
    if (!VALID_SEVERITIES.includes(severity)) {
      return res.status(400).json({ success: false, message: `severity must be one of: ${VALID_SEVERITIES.join(', ')}` });
    }

    const hospital = await Hospital.findOne({ id: hospitalId }).lean();
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' });

    const token = await generateToken(hospitalId);
    const estimatedWait = SEVERITY_WAIT_MINUTES[severity];

    const newEntry = await OPDQueue.create({
      hospitalId, token, patientName: patientName.trim(), age: age || null, department, severity,
      status: 'waiting', estimatedWait, registeredAt: new Date().toISOString(),
    });

    await recordAudit({
      user: req.user, hospitalId, action: 'opd.register', resourceType: 'opd', resourceId: newEntry.id,
      summary: `Registered ${patientName} (${severity}) — token ${token}`,
      metadata: { created: { patientName: patientName.trim(), department, severity, token } },
    });
    await recalcWaitTimes(hospitalId);
    const finalEntry = await OPDQueue.findOne({ id: newEntry.id }).lean();
    emitToHospital(hospitalId, 'opd:update', mapDoc(finalEntry));

    res.status(201).json({ success: true, message: `Patient registered. Token: ${token}`, data: mapDoc(finalEntry) });
  })
);

router.put(
  '/:id',
  requireAuth,
  requireRole('admin', 'doctor', 'staff'),
  asyncHandler(async (req, res) => {
    log('API', `PUT /opd/${req.params.id}`);
    const safeParamId = safeId(req.params.id);
    const existing = await OPDQueue.findOne({ id: safeParamId }).lean();
    if (!existing) return res.status(404).json({ success: false, message: 'Queue entry not found' });

    if (req.user.hospitalId && existing.hospitalId !== req.user.hospitalId) {
      return res.status(403).json({ success: false, message: 'You can only modify OPD entries at your own hospital' });
    }

    const { status, severity } = req.body;

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }
    if (severity && !VALID_SEVERITIES.includes(severity)) {
      return res.status(400).json({ success: false, message: `severity must be one of: ${VALID_SEVERITIES.join(', ')}` });
    }

    const patch = {};
    if (status) patch.status = status;
    if (severity) patch.severity = severity;
    // estimatedWait is never accepted from the client — recalcWaitTimes()
    // below is the only thing that ever sets it, derived from real queue
    // position. `in-progress`/`completed` clear it immediately since those
    // patients are no longer "waiting".
    if (status === 'in-progress' || status === 'completed') patch.estimatedWait = 0;

    const updated = await OPDQueue.findOneAndUpdate({ id: safeParamId }, patch, { new: true }).lean();

    await recordAudit({
      user: req.user, hospitalId: existing.hospitalId, action: 'opd.update', resourceType: 'opd', resourceId: safeParamId,
      summary: `Updated ${existing.patientName}'s queue entry${status ? ` → ${status}` : ''}`,
      metadata: {
        before: { status: existing.status, severity: existing.severity },
        after: { status: updated.status, severity: updated.severity },
      },
    });
    emitToHospital(existing.hospitalId, 'opd:update', mapDoc(updated));
    await recalcWaitTimes(existing.hospitalId);

    res.json({ success: true, data: mapDoc(updated) });
  })
);

router.delete(
  '/:id',
  requireAuth,
  requireRole('admin', 'doctor', 'staff'),
  asyncHandler(async (req, res) => {
    log('API', `DELETE /opd/${req.params.id}`);
    const removed = await OPDQueue.findOneAndDelete({ id: safeId(req.params.id) }).lean();
    if (!removed) return res.status(404).json({ success: false, message: 'Queue entry not found' });

    await recordAudit({
      user: req.user, hospitalId: removed.hospitalId, action: 'opd.remove', resourceType: 'opd', resourceId: removed.id,
      summary: `Removed ${removed.patientName} from queue`,
      metadata: { deleted: { patientName: removed.patientName, department: removed.department, severity: removed.severity, status: removed.status } },
    });
    emitToHospital(removed.hospitalId, 'opd:delete', { id: removed.id });
    await recalcWaitTimes(removed.hospitalId);

    res.json({ success: true, message: 'Entry removed from queue', data: mapDoc(removed) });
  })
);

module.exports = router;
