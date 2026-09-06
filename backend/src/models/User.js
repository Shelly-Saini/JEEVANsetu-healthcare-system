const mongoose = require('mongoose');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { USER_ROLES } = require('../constants/enums');

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true, default: () => crypto.randomUUID() },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false }, // never returned by default
  role: { type: String, enum: USER_ROLES, required: true, default: 'staff' },
  cityId: { type: String },
  hospitalId: { type: String, index: true },
  refreshTokenVersion: { type: Number, default: 0 }, // bump to invalidate all refresh tokens (logout-everywhere)
}, { timestamps: true });

// Hash password on save if it changed (covers both create and update flows)
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    if (!ret.id && ret._id) {
      ret.id = ret._id.toString();
    }
    delete ret._id;
    delete ret.__v;
    delete ret.password;
  }
});

module.exports = mongoose.model('User', userSchema);
