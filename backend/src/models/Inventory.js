const mongoose = require('mongoose');
const crypto = require('crypto');

const inventorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true, default: () => crypto.randomUUID() },
  hospitalId: { type: String, required: true, index: true },
  item: { type: String, required: true },
  category: { type: String, required: true },
  quantity: { type: Number, default: 0 },
  unit: { type: String, required: true },
  threshold: { type: Number, required: true },
  minThreshold: { type: Number },  // alias — routes use minThreshold; kept for compatibility
}, { timestamps: true });

inventorySchema.set('toJSON', {
  transform: (doc, ret) => {
    if (!ret.id && ret._id) {
      ret.id = ret._id.toString();
    }
    delete ret._id;
    delete ret.__v;
  }
});

module.exports = mongoose.model('Inventory', inventorySchema);
