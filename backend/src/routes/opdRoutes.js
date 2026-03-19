const express = require('express');
const OPDQueue = require('../models/OPDQueue');
const Hospital = require('../models/Hospital');
const csrf = require('../middleware/csrf');
const { rateLimiter } = require('../middleware/rateLimiter');
const asyncHandler = require('../utils/asyncHandler');
const { log } = require('../utils/logger');

const router = express.Router();

const safeId = (id) => {
  const s = String(id).replace(/[^a-zA-Z0-9_-]/g, '');
  if (!s) throw new Error('Invalid resource id');
  return s;
};

const SEVERITY_WAIT = { critical: 5, high: 15, medium: 30, low: 50 };
const VALID_SEVERITIES = Object.keys(SEVERITY_WAIT);
const VALID_STATUSES   = ['waiting', 'in-progress', 'completed', 'cancelled'];

const generateToken = async (hospitalId) => {
  const prefixMap = { h1: 'A', h2: 'B', h3: 'C', h4: 'D' };
  const prefix = prefixMap[hospitalId] || 'Z';
  // Use aggregation to find max token number — O(1) vs O(n) full fetch
  const result = await OPDQueue.aggregate([
    { $match: { hospitalId } },
    { $project: { num: { $toInt: { $substr: ['$token', 1, -1] } } } },
    { $group: { _id: null, max: { $max: '$num' } } }
  ]);
  const maxNum = result[0]?.max ?? 0;
  return `${prefix}${String(maxNum + 1).padStart(3, '0')}`;
};

const mapDoc = (d) => {
  const { _id, __v, ...rest } = d;
  return { ...rest, id: rest.id || _id?.toString() };
};

router.get('/', asyncHandler(async (req, res) => {
  log('API', `GET /opd`);
  const { hospitalId } = req.query;
  const limit = parseInt(req.query.limit) || 20;
  const page = parseInt(req.query.page) || 1;

  const filter = hospitalId ? { hospitalId } : {};
  let queueData = await OPDQueue.find(filter)
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
  
  const queue = queueData.map(mapDoc);

  const order = { critical: 0, high: 1, medium: 2, low: 3 };
  queue.sort((a, b) =>
    order[a.severity] - order[b.severity] ||
    new Date(a.registeredAt) - new Date(b.registeredAt)
  );

  res.json({ success: true, count: queue.length, data: queue });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  log('API', `GET /opd/${req.params.id}`);
  const entry = await OPDQueue.findOne({ id: safeId(req.params.id) }).lean();
  if (!entry) return res.status(404).json({ success: false, message: 'Queue entry not found' });
  res.json({ success: true, data: mapDoc(entry) });
}));

// csrf: Double Submit Cookie — validates x-csrf-token header against csrf-token cookie
router.post('/', csrf, rateLimiter('opd-register'), asyncHandler(async (req, res) => {
  log('API', `POST /opd`);
  const { patientName, age, department, severity, hospitalId } = req.body;

  if (!patientName || !department || !severity || !hospitalId) {
    return res.status(400).json({ success: false, message: 'patientName, department, severity, and hospitalId are required' });
  }

  if (!VALID_SEVERITIES.includes(severity)) {
    return res.status(400).json({ success: false, message: `severity must be one of: ${VALID_SEVERITIES.join(', ')}` });
  }

  const hospital = await Hospital.findOne({ id: hospitalId }).lean();
  if (!hospital) {
    return res.status(404).json({ success: false, message: 'Hospital not found' });
  }

  const token         = await generateToken(hospitalId);
  const estimatedWait = SEVERITY_WAIT[severity];

  const newEntry = await OPDQueue.create({
    hospitalId,
    token,
    patientName: patientName.trim(),
    age: age || null,
    department,
    severity,
    status: 'waiting',
    estimatedWait,
    registeredAt: new Date().toISOString()
  });

  res.status(201).json({ success: true, message: `Patient registered. Token: ${token}`, data: newEntry.toJSON() });
}));

// csrf: Double Submit Cookie — validates x-csrf-token header against csrf-token cookie
router.put('/:id', csrf, asyncHandler(async (req, res) => {
  log('API', `PUT /opd/${req.params.id}`);
  const safeParamId = safeId(req.params.id);
  const existing = await OPDQueue.findOne({ id: safeParamId }).lean();
  if (!existing) return res.status(404).json({ success: false, message: 'Queue entry not found' });

  const { status, estimatedWait, severity } = req.body;

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, message: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  if (severity && !VALID_SEVERITIES.includes(severity)) {
    return res.status(400).json({ success: false, message: `severity must be one of: ${VALID_SEVERITIES.join(', ')}` });
  }

  const patch = {};
  if (status)                          patch.status        = status;
  if (severity)                        patch.severity      = severity;
  if (estimatedWait !== undefined)     patch.estimatedWait = estimatedWait;
  if (status === 'in-progress' || status === 'completed') patch.estimatedWait = 0;

  const updated = await OPDQueue.findOneAndUpdate({ id: safeParamId }, patch, { new: true }).lean();
  res.json({ success: true, data: mapDoc(updated) });
}));

// csrf: Double Submit Cookie — validates x-csrf-token header against csrf-token cookie
router.delete('/:id', csrf, asyncHandler(async (req, res) => {
  log('API', `DELETE /opd/${req.params.id}`);
  const removed = await OPDQueue.findOneAndDelete({ id: safeId(req.params.id) }).lean();
  if (!removed) return res.status(404).json({ success: false, message: 'Queue entry not found' });
  res.json({ success: true, message: 'Entry removed from queue', data: mapDoc(removed) });
}));

module.exports = router;
