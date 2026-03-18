const express = require('express');
const { getAll, getById, add, update, remove } = require('../utils/db');

const router = express.Router();

// Severity → base wait time (minutes)
const SEVERITY_WAIT = { critical: 5, high: 15, medium: 30, low: 50 };

// Valid values for input validation
const VALID_SEVERITIES = Object.keys(SEVERITY_WAIT);
const VALID_STATUSES   = ['waiting', 'in-progress', 'completed', 'cancelled'];

// Generate next token for a hospital (e.g. A006, B003)
const generateToken = (hospitalId) => {
  const prefixMap = { h1: 'A', h2: 'B', h3: 'C', h4: 'D' };
  const prefix = prefixMap[hospitalId] || 'Z';

  const existing = getAll('opdQueues').filter((q) => q.hospitalId === hospitalId);
  const maxNum = existing.reduce((max, q) => {
    const num = parseInt(q.token.slice(1), 10);
    return num > max ? num : max;
  }, 0);

  return `${prefix}${String(maxNum + 1).padStart(3, '0')}`;
};

// GET /api/opd  — all entries, optional ?hospitalId= filter
router.get('/', (req, res) => {
  try {
    const { hospitalId } = req.query;
    let queue = getAll('opdQueues');
    if (hospitalId) queue = queue.filter((q) => q.hospitalId === hospitalId);

    // Sort: critical → high → medium → low, then by registeredAt
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    queue.sort((a, b) =>
      order[a.severity] - order[b.severity] ||
      new Date(a.registeredAt) - new Date(b.registeredAt)
    );

    res.json({ success: true, count: queue.length, data: queue });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/opd/:id  — single entry
router.get('/:id', (req, res) => {
  try {
    const entry = getById('opdQueues', req.params.id);
    if (!entry) return res.status(404).json({ success: false, message: 'Queue entry not found' });
    res.json({ success: true, data: entry });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/opd  — register new patient
router.post('/', (req, res) => {
  try {
    const { patientName, age, department, severity, hospitalId } = req.body;

    // Validate required fields
    if (!patientName || !department || !severity || !hospitalId) {
      return res.status(400).json({
        success: false,
        message: 'patientName, department, severity, and hospitalId are required',
      });
    }

    if (!VALID_SEVERITIES.includes(severity)) {
      return res.status(400).json({
        success: false,
        message: `severity must be one of: ${VALID_SEVERITIES.join(', ')}`,
      });
    }

    // Verify hospital exists
    const hospital = getById('hospitals', hospitalId);
    if (!hospital) {
      return res.status(404).json({ success: false, message: 'Hospital not found' });
    }

    const token         = generateToken(hospitalId);
    const estimatedWait = SEVERITY_WAIT[severity];

    const newEntry = add('opdQueues', {
      hospitalId,
      token,
      patientName: patientName.trim(),
      age: age || null,
      department,
      severity,
      status: 'waiting',
      estimatedWait,
      registeredAt: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      message: `Patient registered. Token: ${token}`,
      data: newEntry,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/opd/:id  — update status or wait time
router.put('/:id', (req, res) => {
  try {
    const existing = getById('opdQueues', req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Queue entry not found' });

    const { status, estimatedWait, severity } = req.body;

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    if (severity && !VALID_SEVERITIES.includes(severity)) {
      return res.status(400).json({
        success: false,
        message: `severity must be one of: ${VALID_SEVERITIES.join(', ')}`,
      });
    }

    const patch = {};
    if (status)                          patch.status        = status;
    if (severity)                        patch.severity      = severity;
    if (estimatedWait !== undefined)     patch.estimatedWait = estimatedWait;
    // Auto-set wait to 0 when in-progress or completed
    if (status === 'in-progress' || status === 'completed') patch.estimatedWait = 0;

    const updated = update('opdQueues', req.params.id, patch);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/opd/:id  — remove from queue
router.delete('/:id', (req, res) => {
  try {
    const removed = remove('opdQueues', req.params.id);
    if (!removed) return res.status(404).json({ success: false, message: 'Queue entry not found' });
    res.json({ success: true, message: 'Entry removed from queue', data: removed });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
