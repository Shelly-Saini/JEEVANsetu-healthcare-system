const mongoose = require('mongoose');
const crypto = require('crypto');

const hospitalSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true, default: () => crypto.randomUUID() },
  name: { type: String, required: true },
  city: { type: String },
  cityId: { type: String },
  address: { type: String },
  phone: { type: String },
  lat: { type: Number },
  lng: { type: Number },
  totalBeds: { type: Number },
  stressScore: { type: Number },
  status: { type: String, default: 'moderate' },
  departments: [{ type: String }]
}, { timestamps: true });

hospitalSchema.set('toJSON', {
  transform: (doc, ret) => {
    if (!ret.id && ret._id) {
      ret.id = ret._id.toString();
    }
    delete ret._id;
    delete ret.__v;
  }
});

module.exports = mongoose.model('Hospital', hospitalSchema);
