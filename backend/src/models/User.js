const mongoose = require('mongoose');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true, default: () => crypto.randomUUID() },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  role: { type: String },
  cityId: { type: String },
  hospitalId: { type: String, index: true }
}, { timestamps: true });

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    if (!ret.id && ret._id) {
      ret.id = ret._id.toString();
    }
    delete ret._id;
    delete ret.__v;
  }
});

module.exports = mongoose.model('User', userSchema);
