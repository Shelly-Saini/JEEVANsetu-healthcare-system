const mongoose = require('mongoose');
const crypto = require('crypto');

// Every mutating action across the platform is recorded here — this is what
// powers the Activity Log screen and gives the Smart Admission decisions a
// permanent, reviewable trail (who admitted/referred/delayed which patient,
// and why).
const auditLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true, default: () => crypto.randomUUID() },
  hospitalId: { type: String, index: true },
  actorId: { type: String, required: true },
  actorName: { type: String, required: true },
  actorRole: { type: String, required: true },
  action: { type: String, required: true },       // e.g. 'bed.status_change', 'admission.decision'
  resourceType: { type: String, required: true }, // 'bed' | 'doctor' | 'inventory' | 'opd' | 'admission'
  resourceId: { type: String },
  summary: { type: String, required: true },       // human-readable one-liner shown in the feed
  metadata: { type: mongoose.Schema.Types.Mixed },  // structured detail (before/after, decision breakdown, etc.)
}, { timestamps: true });

auditLogSchema.index({ hospitalId: 1, createdAt: -1 });

auditLogSchema.set('toJSON', {
  transform: (doc, ret) => {
    if (!ret.id && ret._id) ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
