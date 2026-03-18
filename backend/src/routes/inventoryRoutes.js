const express = require('express');
const { getAll, getById, add, update, remove } = require('../utils/db');

const router = express.Router();

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_CATEGORIES = ['oxygen', 'ppe', 'medicine', 'equipment'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Derive status and shortagePercent from quantity vs threshold
const computeStatus = (quantity, threshold) => {
  if (quantity <= threshold * 0.5) return 'critical';
  if (quantity <= threshold)       return 'low';
  return 'ok';
};

const computeShortagePercent = (quantity, threshold) => {
  if (quantity >= threshold) return 0;
  return Math.round(((threshold - quantity) / threshold) * 100);
};

const enrich = (item) => {
  const status          = computeStatus(item.quantity, item.minThreshold);
  const shortagePercent = computeShortagePercent(item.quantity, item.minThreshold);
  return {
    ...item,
    status,
    shortagePercent,
    alert: status === 'critical',
  };
};

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/inventory  — optional ?hospitalId= &category= &status= filters
router.get('/', (req, res) => {
  try {
    const { hospitalId, category, status } = req.query;
    let items = getAll('inventory');

    if (hospitalId) items = items.filter((i) => i.hospitalId === hospitalId);
    if (category)   items = items.filter((i) => i.category   === category.toLowerCase());

    const enriched = items.map(enrich);

    // Apply status filter after enrichment (status is computed, not stored)
    const filtered = status ? enriched.filter((i) => i.status === status.toLowerCase()) : enriched;

    const alertCount = filtered.filter((i) => i.alert).length;

    res.json({ success: true, count: filtered.length, alertCount, data: filtered });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/inventory/:id
router.get('/:id', (req, res) => {
  try {
    const item = getById('inventory', req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Inventory item not found' });
    res.json({ success: true, data: enrich(item) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/inventory  — add new item
router.post('/', (req, res) => {
  try {
    const { hospitalId, item, category, quantity, unit, minThreshold } = req.body;

    if (!hospitalId || !item || quantity === undefined || !minThreshold) {
      return res.status(400).json({
        success: false,
        message: 'hospitalId, item, quantity, and minThreshold are required',
      });
    }

    if (!getById('hospitals', hospitalId)) {
      return res.status(404).json({ success: false, message: 'Hospital not found' });
    }

    if (category && !VALID_CATEGORIES.includes(category.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `category must be one of: ${VALID_CATEGORIES.join(', ')}`,
      });
    }

    const qty       = Number(quantity);
    const threshold = Number(minThreshold);

    if (qty < 0)       return res.status(400).json({ success: false, message: 'quantity must be ≥ 0' });
    if (threshold <= 0) return res.status(400).json({ success: false, message: 'minThreshold must be > 0' });

    const newItem = add('inventory', {
      hospitalId,
      item:         item.trim(),
      category:     category?.toLowerCase() || 'medicine',
      quantity:     qty,
      unit:         unit || 'units',
      minThreshold: threshold,
    });

    res.status(201).json({ success: true, data: enrich(newItem) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/inventory/:id  — update quantity or threshold
router.put('/:id', (req, res) => {
  try {
    const existing = getById('inventory', req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Inventory item not found' });

    const { quantity, minThreshold, unit } = req.body;
    const patch = {};

    if (quantity !== undefined) {
      const qty = Number(quantity);
      if (qty < 0) return res.status(400).json({ success: false, message: 'quantity must be ≥ 0' });
      patch.quantity = qty;
    }

    if (minThreshold !== undefined) {
      const threshold = Number(minThreshold);
      if (threshold <= 0) return res.status(400).json({ success: false, message: 'minThreshold must be > 0' });
      patch.minThreshold = threshold;
    }

    if (unit !== undefined) patch.unit = unit;

    const updated = update('inventory', req.params.id, patch);
    res.json({ success: true, data: enrich(updated) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/inventory/:id
router.delete('/:id', (req, res) => {
  try {
    const removed = remove('inventory', req.params.id);
    if (!removed) return res.status(404).json({ success: false, message: 'Inventory item not found' });
    res.json({ success: true, message: 'Inventory item removed', data: removed });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
