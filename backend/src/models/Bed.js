const mongoose = require('mongoose');
const crypto = require('crypto');

const bedSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true, default: () => crypto.randomUUID() },
  hospitalId: { type: String, required: true, index: true },
  type: { type: String, required: true },
  total: { type: Number, default: 0 },
  available: { type: Number, default: 0 },
  occupied: { type: Number, default: 0 },
  cleaning: { type: Number, default: 0 },
  status: { type: String, default: 'available' },
  patientId: { type: String },
  patientName: { type: String }
}, { timestamps: true });

bedSchema.set('toJSON', {
  transform: (doc, ret) => {
    if (!ret.id && ret._id) {
      ret.id = ret._id.toString();
    }
    delete ret._id;
    delete ret.__v;
  }
});

module.exports = mongoose.model('Bed', bedSchema);
