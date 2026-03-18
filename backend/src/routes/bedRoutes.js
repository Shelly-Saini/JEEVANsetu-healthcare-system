const express = require('express');
const { getAll, getById, add, update, remove } = require('../utils/db');

const router = express.Router();

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_TYPES    = ['ICU', 'General', 'Emergency'];
const VALID_STATUSES = ['available', 'occupied', 'cleaning'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Recalculate available / occupied / cleaning counts from a status transition
const applyStatusTransition = (bed, newStatus) => {
  const prev = bed.status?.toLowerCase();
  const next = newStatus.toLowerCase();
  if (prev === next) return {};

  const patch = { status: next };

  // Decrement previous bucket, increment new bucket (floor at 0)
  const dec = (field) => Math.max(0, (bed[field] || 0) - 1);
  const inc = (field) => (bed[field] || 0) + 1;

  if (prev === 'available')  patch.available = dec('available');
  if (prev === 'occupied')   patch.occupied  = dec('occupied');
  if (prev === 'cleaning')   patch.cleaning  = dec('cleaning');

  if (next === 'available')  patch.available = inc('available');
  if (next === 'occupied')   patch.occupied  = inc('occupied');
  if (next === 'cleaning')   patch.cleaning  = inc('cleaning');

  return patch;
};

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/beds  — all beds, optional ?hospitalId= filter
router.get('/', (req, res) => {
  try {
    const { hospitalId, type } = req.query;
    let beds = getAll('beds');

    if (hospitalId) beds = beds.filter((b) => b.hospitalId === hospitalId);
    if (type)       beds = beds.filter((b) => b.type.toLowerCase() === type.toLowerCase());

    // Attach occupancy % to each record for convenience
    const enriched = beds.map((b) => ({
      ...b,
      occupancyPct: b.total ? Math.round((b.occupied / b.total) * 100) : 0,
    }));

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/beds/:id  — single bed record
router.get('/:id', (req, res) => {
  try {
    const bed = getById('beds', req.params.id);
    if (!bed) return res.status(404).json({ success: false, message: 'Bed not found' });

    res.json({
      success: true,
      data: { ...bed, occupancyPct: bed.total ? Math.round((bed.occupied / bed.total) * 100) : 0 },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/beds  — add a new bed group record
router.post('/', (req, res) => {
  try {
    const { hospitalId, type, total, available, occupied, cleaning } = req.body;

    if (!hospitalId || !type) {
      return res.status(400).json({ success: false, message: 'hospitalId and type are required' });
    }

    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `type must be one of: ${VALID_TYPES.join(', ')}`,
      });
    }

    if (!getById('hospitals', hospitalId)) {
      return res.status(404).json({ success: false, message: 'Hospital not found' });
    }

    // Prevent duplicate type entry for the same hospital
    const duplicate = getAll('beds').find(
      (b) => b.hospitalId === hospitalId && b.type === type
    );
    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: `A "${type}" bed record already exists for this hospital. Use PUT to update it.`,
      });
    }

    const totalCount     = Number(total)     || 0;
    const availableCount = Number(available) || 0;
    const occupiedCount  = Number(occupied)  || 0;
    const cleaningCount  = Number(cleaning)  || 0;

    // Sanity check: counts must not exceed total
    if (availableCount + occupiedCount + cleaningCount > totalCount) {
      return res.status(400).json({
        success: false,
        message: 'available + occupied + cleaning cannot exceed total',
      });
    }

    const newBed = add('beds', {
      hospitalId,
      type,
      total:     totalCount,
      available: availableCount,
      occupied:  occupiedCount,
      cleaning:  cleaningCount,
    });

    res.status(201).json({ success: true, data: newBed });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/beds/:id  — update bed counts or transition a single bed's status
router.put('/:id', (req, res) => {
  try {
    const bed = getById('beds', req.params.id);
    if (!bed) return res.status(404).json({ success: false, message: 'Bed not found' });

    const { status, total, available, occupied, cleaning } = req.body;

    // Case 1: single-bed status transition (available ↔ occupied ↔ cleaning)
    if (status) {
      const normalised = status.toLowerCase();
      if (!VALID_STATUSES.includes(normalised)) {
        return res.status(400).json({
          success: false,
          message: `status must be one of: ${VALID_STATUSES.join(', ')}`,
        });
      }

      const patch = applyStatusTransition(bed, normalised);
      const updated = update('beds', req.params.id, patch);
      return res.json({ success: true, data: updated });
    }

    // Case 2: bulk count update (admin correction)
    const patch = {};
    if (total     !== undefined) patch.total     = Number(total);
    if (available !== undefined) patch.available = Number(available);
    if (occupied  !== undefined) patch.occupied  = Number(occupied);
    if (cleaning  !== undefined) patch.cleaning  = Number(cleaning);

    const newTotal     = patch.total     ?? bed.total;
    const newAvailable = patch.available ?? bed.available;
    const newOccupied  = patch.occupied  ?? bed.occupied;
    const newCleaning  = patch.cleaning  ?? bed.cleaning;

    if (newAvailable + newOccupied + newCleaning > newTotal) {
      return res.status(400).json({
        success: false,
        message: 'available + occupied + cleaning cannot exceed total',
      });
    }

    const updated = update('beds', req.params.id, patch);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/beds/:id  — remove bed record
router.delete('/:id', (req, res) => {
  try {
    const removed = remove('beds', req.params.id);
    if (!removed) return res.status(404).json({ success: false, message: 'Bed not found' });
    res.json({ success: true, message: 'Bed record removed', data: removed });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
