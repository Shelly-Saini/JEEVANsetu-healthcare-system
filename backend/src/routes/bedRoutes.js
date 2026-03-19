const express = require('express');
const Bed = require('../models/Bed');
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

const VALID_TYPES    = ['ICU', 'General', 'Emergency'];
const VALID_STATUSES = ['available', 'occupied', 'cleaning'];

const applyStatusTransition = (bed, newStatus) => {
  const prev = bed.status?.toLowerCase() || 'available';
  const next = newStatus.toLowerCase();
  
  if (prev === next) return {};

  const patch = { status: next };

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

const mapDoc = (d) => {
  const { _id, __v, ...rest } = d;
  return { ...rest, id: rest.id || _id?.toString() };
};

router.get('/', asyncHandler(async (req, res) => {
  log('API', `GET /beds`);
  const { hospitalId, type } = req.query;
  const limit = parseInt(req.query.limit) || 20;
  const page = parseInt(req.query.page) || 1;

  const filter = {};
  if (hospitalId) filter.hospitalId = hospitalId;
  if (type) {
      filter.type = { $regex: new RegExp(`^${type}$`, "i") };
  }

  const bedsData = await Bed.find(filter)
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
  const beds = bedsData.map(mapDoc);

  const enriched = beds.map((bObj) => {
    return {
      ...bObj,
      occupancyPct: bObj.total ? Math.round((bObj.occupied / bObj.total) * 100) : 0,
    };
  });

  res.json({ success: true, count: enriched.length, data: enriched });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  log('API', `GET /beds/${req.params.id}`);
  const bedData = await Bed.findOne({ id: safeId(req.params.id) }).lean();
  if (!bedData) return res.status(404).json({ success: false, message: 'Bed not found' });

  const bObj = mapDoc(bedData);
  res.json({
    success: true,
    data: { ...bObj, occupancyPct: bObj.total ? Math.round((bObj.occupied / bObj.total) * 100) : 0 },
  });
}));

// csrf: Double Submit Cookie — validates x-csrf-token header against csrf-token cookie
router.post('/', csrf, asyncHandler(async (req, res) => {
  log('API', `POST /beds`);
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

  const hospital = await Hospital.findOne({ id: hospitalId }).lean();
  if (!hospital) {
    return res.status(404).json({ success: false, message: 'Hospital not found' });
  }

  const duplicate = await Bed.findOne({ hospitalId, type }).lean();
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

  if (availableCount + occupiedCount + cleaningCount > totalCount) {
    return res.status(400).json({
      success: false,
      message: 'available + occupied + cleaning cannot exceed total',
    });
  }

  const newBed = await Bed.create({
    hospitalId,
    type,
    total:     totalCount,
    available: availableCount,
    occupied:  occupiedCount,
    cleaning:  cleaningCount,
  });

  res.status(201).json({ success: true, data: newBed.toJSON() });
}));

// csrf: Double Submit Cookie — validates x-csrf-token header against csrf-token cookie
router.put('/:id', csrf, asyncHandler(async (req, res) => {
  log('API', `PUT /beds/${req.params.id}`);
  const safeParamId = safeId(req.params.id);
  const bed = await Bed.findOne({ id: safeParamId }).lean();
  if (!bed) return res.status(404).json({ success: false, message: 'Bed not found' });

  const { status, total, available, occupied, cleaning } = req.body;

  if (status) {
    const normalised = status.toLowerCase();
    if (!VALID_STATUSES.includes(normalised)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    const patch = applyStatusTransition(bed, normalised);
    const updated = await Bed.findOneAndUpdate({ id: safeParamId }, patch, { new: true }).lean();
    return res.json({ success: true, data: mapDoc(updated) });
  }

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

  const updated = await Bed.findOneAndUpdate({ id: safeParamId }, patch, { new: true }).lean();
  res.json({ success: true, data: mapDoc(updated) });
}));

// csrf: Double Submit Cookie — validates x-csrf-token header against csrf-token cookie
router.delete('/:id', csrf, asyncHandler(async (req, res) => {
  log('API', `DELETE /beds/${req.params.id}`);
  const removed = await Bed.findOneAndDelete({ id: safeId(req.params.id) }).lean();
  if (!removed) return res.status(404).json({ success: false, message: 'Bed not found' });
  res.json({ success: true, message: 'Bed record removed', data: mapDoc(removed) });
}));

module.exports = router;
