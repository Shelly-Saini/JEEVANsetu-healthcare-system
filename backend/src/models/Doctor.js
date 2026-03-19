const mongoose = require('mongoose');
const crypto = require('crypto');

const doctorSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true, default: () => crypto.randomUUID() },
  hospitalId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  department: { type: String, required: true },
  status: { type: String, default: 'available' },
  workload: { type: Number, default: 0, min: 0, max: 100 },
  patientsToday: { type: Number, default: 0 },
  maxPatients: { type: Number, default: 20 },
  shift: { type: String, default: 'morning' }
}, { timestamps: true });

doctorSchema.set('toJSON', {
  transform: (doc, ret) => {
    if (!ret.id && ret._id) {
      ret.id = ret._id.toString();
    }
    delete ret._id;
    delete ret.__v;
  }
});

module.exports = mongoose.model('Doctor', doctorSchema);
