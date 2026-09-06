const express = require('express');
const Bed = require('../models/Bed');
const Hospital = require('../models/Hospital');
const { BED_TYPES, BED_STATUSES } = require('../constants/enums');
const { requireAuth, requireRole, requireOwnHospital, requireHospitalAccess } = require('../middleware/auth');
const { recordAudit } = require('../utils/audit');
const { emitToHospital } = require('../realtime/socket');
const { rateLimiter } = require('../middleware/rateLimiter');
const asyncHandler = require('../utils/asyncHandler');
const { log } = require('../utils/logger');

const router = express.Router();

const safeId = (id) => {
  const s = String(id).replace(/[^a-zA-Z0-9_-]/g, '');
  if (!s) throw new Error('Invalid resource id');
  return s;
};

const VALID_TYPES = BED_TYPES;
const VALID_STATUSES = BED_STATUSES;

const applyStatusTransition = (bed, newStatus) => {
  const prev = bed.status?.toLowerCase() || 'available';
  const next = newStatus.toLowerCase();
  if (prev === next) return {};

  const patch = { status: next };
  const dec = (field) => Math.max(0, (bed[field] || 0) - 1);
  const inc = (field) => (bed[field] || 0) + 1;

  if (prev === 'available') patch.available = dec('available');
  if (prev === 'occupied') patch.occupied = dec('occupied');
  if (prev === 'cleaning') patch.cleaning = dec('cleaning');

  if (next === 'available') patch.available = inc('available');
  if (next === 'occupied') patch.occupied = inc('occupied');
  if (next === 'cleaning') patch.cleaning = inc('cleaning');

  return patch;
};

const mapDoc = (d) => {
  const { _id, __v, ...rest } = d;
  return { ...rest, id: rest.id || _id?.toString() };
};

const enrich = (bObj) => ({
  ...bObj,
  occupancyPct: bObj.total ? Math.round((bObj.occupied / bObj.total) * 100) : 0,
});

router.get('/', requireAuth, requireHospitalAccess((req) => req.query.hospitalId), asyncHandler(async (req, res) => {
  log('API', `GET /beds`);
  const { type } = req.query;
  const hospitalId = req.query.hospitalId || (req.user.role !== 'city_admin' ? req.user.hospitalId : undefined);
  const limit = parseInt(req.query.limit) || 20;
  const page = parseInt(req.query.page) || 1;

  const filter = {};
  if (hospitalId) filter.hospitalId = hospitalId;
  if (type) filter.type = { $regex: new RegExp(`^${type}$`, 'i') };

  const bedsData = await Bed.find(filter).skip((page - 1) * limit).limit(limit).lean();
  const enriched = bedsData.map(mapDoc).map(enrich);

  res.json({ success: true, count: enriched.length, data: enriched });
}));

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  log('API', `GET /beds/${req.params.id}`);
  const bedData = await Bed.findOne({ id: safeId(req.params.id) }).lean();
  if (!bedData) return res.status(404).json({ success: false, message: 'Bed not found' });
  res.json({ success: true, data: enrich(mapDoc(bedData)) });
}));

router.post(
  '/',
  requireAuth,
  requireRole('admin', 'staff'),
  requireOwnHospital((req) => req.body.hospitalId),
  asyncHandler(async (req, res) => {
    log('API', `POST /beds`);
    const { hospitalId, type, total, available, occupied, cleaning } = req.body;

    if (!hospitalId || !type) {
      return res.status(400).json({ success: false, message: 'hospitalId and type are required' });
    }
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ success: false, message: `type must be one of: ${VALID_TYPES.join(', ')}` });
    }

    const hospital = await Hospital.findOne({ id: hospitalId }).lean();
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' });

    const duplicate = await Bed.findOne({ hospitalId, type }).lean();
    if (duplicate) {
      return res.status(409).json({ success: false, message: `A "${type}" bed record already exists for this hospital. Use PUT to update it.` });
    }

    const totalCount = Number(total) || 0;
    const availableCount = Number(available) || 0;
    const occupiedCount = Number(occupied) || 0;
    const cleaningCount = Number(cleaning) || 0;

    if (availableCount + occupiedCount + cleaningCount > totalCount) {
      return res.status(400).json({ success: false, message: 'available + occupied + cleaning cannot exceed total' });
    }

    const newBed = await Bed.create({
      hospitalId, type, total: totalCount, available: availableCount, occupied: occupiedCount, cleaning: cleaningCount,
    });

    await recordAudit({
      user: req.user, hospitalId, action: 'bed.create', resourceType: 'bed', resourceId: newBed.id,
      summary: `Added ${totalCount} ${type} beds`,
      metadata: { created: { type, total: totalCount, available: availableCount, occupied: occupiedCount, cleaning: cleaningCount } },
    });
    emitToHospital(hospitalId, 'bed:update', enrich(mapDoc(newBed.toJSON())));

    res.status(201).json({ success: true, data: enrich(newBed.toJSON()) });
  })
);

router.put(
  '/:id',
  requireAuth,
  requireRole('admin', 'staff'),
  rateLimiter('bed-update'),
  asyncHandler(async (req, res) => {
    log('API', `PUT /beds/${req.params.id}`);
    const safeParamId = safeId(req.params.id);
    const bed = await Bed.findOne({ id: safeParamId }).lean();
    if (!bed) return res.status(404).json({ success: false, message: 'Bed not found' });

    // ownership check against the bed's own hospital (client can't spoof it via body)
    if (req.user.hospitalId && bed.hospitalId !== req.user.hospitalId) {
      return res.status(403).json({ success: false, message: 'You can only modify beds for your own hospital' });
    }

    const { status, total, available, occupied, cleaning } = req.body;
    let updated;

    if (status) {
      const normalised = status.toLowerCase();
      if (!VALID_STATUSES.includes(normalised)) {
        return res.status(400).json({ success: false, message: `status must be one of: ${VALID_STATUSES.join(', ')}` });
      }
      const patch = applyStatusTransition(bed, normalised);
      updated = await Bed.findOneAndUpdate({ id: safeParamId }, patch, { new: true }).lean();
    } else {
      const patch = {};
      if (total !== undefined) patch.total = Number(total);
      if (available !== undefined) patch.available = Number(available);
      if (occupied !== undefined) patch.occupied = Number(occupied);
      if (cleaning !== undefined) patch.cleaning = Number(cleaning);

      const newTotal = patch.total ?? bed.total;
      const newAvailable = patch.available ?? bed.available;
      const newOccupied = patch.occupied ?? bed.occupied;
      const newCleaning = patch.cleaning ?? bed.cleaning;

      if (newAvailable + newOccupied + newCleaning > newTotal) {
        return res.status(400).json({ success: false, message: 'available + occupied + cleaning cannot exceed total' });
      }
      updated = await Bed.findOneAndUpdate({ id: safeParamId }, patch, { new: true }).lean();
    }

    await recordAudit({
      user: req.user, hospitalId: bed.hospitalId, action: 'bed.update', resourceType: 'bed', resourceId: safeParamId,
      summary: `Updated ${bed.type} bed record${status ? ` → ${status}` : ''}`,
      metadata: {
        before: { status: bed.status, available: bed.available, occupied: bed.occupied, cleaning: bed.cleaning },
        after: { status: updated.status, available: updated.available, occupied: updated.occupied, cleaning: updated.cleaning },
      },
    });
    emitToHospital(bed.hospitalId, 'bed:update', enrich(mapDoc(updated)));

    res.json({ success: true, data: enrich(mapDoc(updated)) });
  })
);

router.delete(
  '/:id',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    log('API', `DELETE /beds/${req.params.id}`);
    const removed = await Bed.findOneAndDelete({ id: safeId(req.params.id) }).lean();
    if (!removed) return res.status(404).json({ success: false, message: 'Bed not found' });

    await recordAudit({
      user: req.user, hospitalId: removed.hospitalId, action: 'bed.delete', resourceType: 'bed', resourceId: removed.id,
      summary: `Removed ${removed.type} bed record`,
      metadata: { deleted: { type: removed.type, total: removed.total, available: removed.available, occupied: removed.occupied, cleaning: removed.cleaning } },
    });
    emitToHospital(removed.hospitalId, 'bed:delete', { id: removed.id });

    res.json({ success: true, message: 'Bed record removed', data: enrich(mapDoc(removed)) });
  })
);

module.exports = router;
