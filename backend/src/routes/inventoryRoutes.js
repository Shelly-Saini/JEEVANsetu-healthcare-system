const express = require('express');
const Inventory = require('../models/Inventory');
const Hospital = require('../models/Hospital');
const { INVENTORY_CATEGORIES } = require('../constants/enums');
const { requireAuth, requireRole, requireOwnHospital, requireHospitalAccess } = require('../middleware/auth');
const { recordAudit } = require('../utils/audit');
const { emitToHospital } = require('../realtime/socket');
const asyncHandler = require('../utils/asyncHandler');
const { log } = require('../utils/logger');

const router = express.Router();

const safeId = (id) => {
  const s = String(id).replace(/[^a-zA-Z0-9_-]/g, '');
  if (!s) throw new Error('Invalid resource id');
  return s;
};

const VALID_CATEGORIES = INVENTORY_CATEGORIES;

const computeStatus = (quantity, threshold) => {
  if (quantity <= threshold * 0.5) return 'critical';
  if (quantity <= threshold) return 'low';
  return 'ok';
};

const computeShortagePercent = (quantity, threshold) => {
  if (quantity >= threshold) return 0;
  return Math.round(((threshold - quantity) / threshold) * 100);
};

const mapDoc = (d) => {
  const { _id, __v, ...rest } = d;
  return { ...rest, id: rest.id || _id?.toString() };
};

const enrich = (doc) => {
  const item = mapDoc(doc);
  const status = computeStatus(item.quantity, item.minThreshold);
  const shortagePercent = computeShortagePercent(item.quantity, item.minThreshold);
  return { ...item, status, shortagePercent, alert: status === 'critical' };
};

router.get('/', requireAuth, requireHospitalAccess((req) => req.query.hospitalId), asyncHandler(async (req, res) => {
  log('API', `GET /inventory`);
  const { category, status } = req.query;
  const hospitalId = req.query.hospitalId || (req.user.role !== 'city_admin' ? req.user.hospitalId : undefined);
  const limit = parseInt(req.query.limit) || 20;
  const page = parseInt(req.query.page) || 1;

  const filter = {};
  if (hospitalId) filter.hospitalId = hospitalId;
  if (category) filter.category = category.toLowerCase();

  const items = await Inventory.find(filter).skip((page - 1) * limit).limit(limit).lean();
  const enriched = items.map(enrich);
  const filtered = status ? enriched.filter((i) => i.status === status.toLowerCase()) : enriched;
  const alertCount = filtered.filter((i) => i.alert).length;

  res.json({ success: true, count: filtered.length, alertCount, data: filtered });
}));

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  log('API', `GET /inventory/${req.params.id}`);
  const item = await Inventory.findOne({ id: safeId(req.params.id) }).lean();
  if (!item) return res.status(404).json({ success: false, message: 'Inventory item not found' });
  res.json({ success: true, data: enrich(item) });
}));

router.post(
  '/',
  requireAuth,
  requireRole('admin', 'staff'),
  requireOwnHospital((req) => req.body.hospitalId),
  asyncHandler(async (req, res) => {
    log('API', `POST /inventory`);
    const { hospitalId, item, category, quantity, unit, minThreshold } = req.body;

    if (!hospitalId || !item || quantity === undefined || !minThreshold) {
      return res.status(400).json({ success: false, message: 'hospitalId, item, quantity, and minThreshold are required' });
    }

    const hospital = await Hospital.findOne({ id: hospitalId }).lean();
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' });

    if (category && !VALID_CATEGORIES.includes(category.toLowerCase())) {
      return res.status(400).json({ success: false, message: `category must be one of: ${VALID_CATEGORIES.join(', ')}` });
    }

    const qty = Number(quantity);
    const threshold = Number(minThreshold);
    if (qty < 0) return res.status(400).json({ success: false, message: 'quantity must be ≥ 0' });
    if (threshold <= 0) return res.status(400).json({ success: false, message: 'minThreshold must be > 0' });

    const newItem = await Inventory.create({
      hospitalId, item: item.trim(), category: category?.toLowerCase() || 'medicine', quantity: qty, unit: unit || 'units', minThreshold: threshold,
    });

    await recordAudit({
      user: req.user, hospitalId, action: 'inventory.create', resourceType: 'inventory', resourceId: newItem.id,
      summary: `Added inventory item "${item}" (${qty} ${unit || 'units'})`,
      metadata: { created: { item: item.trim(), category: category?.toLowerCase() || 'medicine', quantity: qty, minThreshold: threshold } },
    });
    emitToHospital(hospitalId, 'inventory:update', enrich(newItem.toJSON()));

    res.status(201).json({ success: true, data: enrich(newItem.toJSON()) });
  })
);

router.put(
  '/:id',
  requireAuth,
  requireRole('admin', 'staff'),
  asyncHandler(async (req, res) => {
    log('API', `PUT /inventory/${req.params.id}`);
    const safeParamId = safeId(req.params.id);
    const existing = await Inventory.findOne({ id: safeParamId }).lean();
    if (!existing) return res.status(404).json({ success: false, message: 'Inventory item not found' });

    if (req.user.hospitalId && existing.hospitalId !== req.user.hospitalId) {
      return res.status(403).json({ success: false, message: 'You can only modify inventory at your own hospital' });
    }

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

    const updated = await Inventory.findOneAndUpdate({ id: safeParamId }, patch, { new: true }).lean();

    await recordAudit({
      user: req.user, hospitalId: existing.hospitalId, action: 'inventory.update', resourceType: 'inventory', resourceId: safeParamId,
      summary: `Updated "${existing.item}"${quantity !== undefined ? ` → ${quantity} ${existing.unit}` : ''}`,
      metadata: {
        before: { quantity: existing.quantity, minThreshold: existing.minThreshold },
        after: { quantity: updated.quantity, minThreshold: updated.minThreshold },
      },
    });
    emitToHospital(existing.hospitalId, 'inventory:update', enrich(updated));

    res.json({ success: true, data: enrich(updated) });
  })
);

router.delete(
  '/:id',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    log('API', `DELETE /inventory/${req.params.id}`);
    const removed = await Inventory.findOneAndDelete({ id: safeId(req.params.id) }).lean();
    if (!removed) return res.status(404).json({ success: false, message: 'Inventory item not found' });

    await recordAudit({
      user: req.user, hospitalId: removed.hospitalId, action: 'inventory.delete', resourceType: 'inventory', resourceId: removed.id,
      summary: `Removed inventory item "${removed.item}"`,
      metadata: { deleted: { item: removed.item, category: removed.category, quantity: removed.quantity } },
    });
    emitToHospital(removed.hospitalId, 'inventory:delete', { id: removed.id });

    res.json({ success: true, message: 'Inventory item removed', data: enrich(removed) });
  })
);

module.exports = router;
