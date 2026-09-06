const mongoose = require('mongoose');
const crypto = require('crypto');

// A lightweight point-in-time snapshot of a hospital's operational load.
// Written on a fixed interval (see utils/snapshotJob.js) rather than on every
// request, so the time series has a predictable, storage-cheap cadence.
// This is what makes "stress trend over time" and "bed shortage forecast"
// possible — the rest of the schema only stores current state.
const metricSnapshotSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true, default: () => crypto.randomUUID() },
  hospitalId: { type: String, required: true, index: true },
  stressScore: { type: Number, required: true },
  opdLoad: { type: Number, required: true },
  bedOccupancy: { type: Number, required: true },
  doctorPressure: { type: Number, required: true },
  activeOpdPatients: { type: Number, required: true },
  availableBeds: { type: Number, required: true },
  totalBeds: { type: Number, required: true },
  capturedAt: { type: Date, default: Date.now, index: true },
});

metricSnapshotSchema.index({ hospitalId: 1, capturedAt: 1 });

metricSnapshotSchema.set('toJSON', {
  transform: (doc, ret) => {
    if (!ret.id && ret._id) ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});

module.exports = mongoose.model('MetricSnapshot', metricSnapshotSchema);
