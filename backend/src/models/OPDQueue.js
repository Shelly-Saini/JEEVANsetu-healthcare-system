const mongoose = require('mongoose');
const crypto = require('crypto');

const opdQueueSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true, default: () => crypto.randomUUID() },
  hospitalId: { type: String, required: true, index: true },
  token: { type: String, required: true },
  patientName: { type: String, required: true },
  age: { type: Number },
  department: { type: String, required: true },
  severity: { type: String, required: true },
  status: { type: String, default: 'waiting' },
  estimatedWait: { type: Number, default: 0 },
  registeredAt: { type: Date, default: Date.now }
}, { timestamps: true });

opdQueueSchema.set('toJSON', {
  transform: (doc, ret) => {
    if (!ret.id && ret._id) {
      ret.id = ret._id.toString();
    }
    delete ret._id;
    delete ret.__v;
  }
});

module.exports = mongoose.model('OPDQueue', opdQueueSchema);
