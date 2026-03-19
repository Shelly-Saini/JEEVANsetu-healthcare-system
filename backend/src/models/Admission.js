const mongoose = require('mongoose');
const crypto = require('crypto');

const admissionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true, default: () => crypto.randomUUID() },
  hospitalId: { type: String, required: true, index: true },
  patientName: { type: String, required: true },
  age: { type: Number },
  department: { type: String, required: true },
  bedType: { type: String, required: true },
  decision: { type: String, required: true },
  bedId: { type: String, required: true },
  doctorId: { type: String, required: true },
  reason: { type: String },
  admittedAt: { type: Date, default: Date.now },
  status: { type: String, default: 'pending' }
}, { timestamps: true });

admissionSchema.set('toJSON', {
  transform: (doc, ret) => {
    if (!ret.id && ret._id) {
      ret.id = ret._id.toString();
    }
    delete ret._id;
    delete ret.__v;
  }
});

module.exports = mongoose.model('Admission', admissionSchema);
