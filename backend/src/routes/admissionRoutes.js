const express = require('express');
const { z } = require('zod');
const Admission = require('../models/Admission');
const Bed = require('../models/Bed');
const Doctor = require('../models/Doctor');
const { BED_TYPES, OPD_SEVERITIES } = require('../constants/enums');
const { evaluateAdmission } = require('../utils/admissionEngine');
const { withOptionalTransaction } = require('../utils/transaction');
const { requireAuth, requireRole, requireOwnHospital, requireHospitalAccess } = require('../middleware/auth');
const { recordAudit } = require('../utils/audit');
const { emitToHospital } = require('../realtime/socket');
const asyncHandler = require('../utils/asyncHandler');
const { log } = require('../utils/logger');

const router = express.Router();

const mapDoc = (d) => {
  const { _id, __v, ...rest } = d;
  return { ...rest, id: rest.id || _id?.toString() };
};

// decision → persisted admission status
const DECISION_STATUS = { admit: 'admitted', monitor: 'pending', refer: 'referred' };

const evalSchema = z.object({
  hospitalId: z.string().min(1),
  department: z.string().min(1),
  bedType: z.enum(BED_TYPES),
  severity: z.enum(OPD_SEVERITIES).optional(),
});

const decideSchema = evalSchema.extend({
  patientName: z.string().min(1),
  age: z.number().int().positive().optional(),
});

// GET /admissions?hospitalId=h1 — history
router.get('/', requireAuth, requireHospitalAccess((req) => req.query.hospitalId), asyncHandler(async (req, res) => {
  const hospitalId = req.query.hospitalId || (req.user.role !== 'city_admin' ? req.user.hospitalId : undefined);
  const filter = hospitalId ? { hospitalId } : {};
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const rows = await Admission.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  res.json({ success: true, count: rows.length, data: rows.map(mapDoc) });
}));

// GET /admissions/evaluate — read-only "what would happen right now"
router.get('/evaluate', requireAuth, requireHospitalAccess((req) => req.query.hospitalId), asyncHandler(async (req, res) => {
  const parsed = evalSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.issues[0].message });
  }
  log('API', `GET /admissions/evaluate ${JSON.stringify(parsed.data)}`);
  const result = await evaluateAdmission(parsed.data.hospitalId, parsed.data);
  res.json({ success: true, data: result });
}));

// POST /admissions — persist a decision. The decision is ALWAYS recomputed
// server-side against current data right before saving; a client can never
// submit its own decision value, which keeps this trustworthy as an audit record.
router.post(
  '/',
  requireAuth,
  requireRole('admin', 'doctor'),
  requireOwnHospital((req) => req.body.hospitalId),
  asyncHandler(async (req, res) => {
    const parsed = decideSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: parsed.error.issues[0].message });
    }
    const { hospitalId, department, bedType, severity, patientName, age } = parsed.data;

    // The evaluation itself reads current state outside any transaction — it's
    // the read that decides what to do. The writes that follow (bed, doctor,
    // admission record) are grouped into one unit of work so a hospital's
    // bed/doctor/admission state can't end up half-updated if something fails
    // partway through.
    const result = await evaluateAdmission(hospitalId, { department, bedType, severity });

    const { admission, bedGroup, doctor } = await withOptionalTransaction(async (session) => {
      let bedId = null;
      let doctorId = null;
      let updatedBed = null;
      let updatedDoctor = null;

      if (result.decision === 'admit' && result.recommendedBedId) {
        bedId = result.recommendedBedId;
        doctorId = result.recommendedDoctorId;

        const bedGroupDoc = await Bed.findOne({ id: bedId }).session(session);
        if (bedGroupDoc && bedGroupDoc.available > 0) {
          bedGroupDoc.available -= 1;
          bedGroupDoc.occupied += 1;
          await bedGroupDoc.save({ session });
          updatedBed = bedGroupDoc;
        }

        if (doctorId) {
          const doctorDoc = await Doctor.findOne({ id: doctorId }).session(session);
          if (doctorDoc) {
            doctorDoc.patientsToday = (doctorDoc.patientsToday || 0) + 1;
            doctorDoc.workload = Math.min(100, (doctorDoc.workload || 0) + 5);
            if (doctorDoc.workload > 80) doctorDoc.status = 'busy';
            await doctorDoc.save({ session });
            updatedDoctor = doctorDoc;
          }
        }
      }

      const [admissionDoc] = await Admission.create(
        [{
          hospitalId, patientName, age, department, bedType,
          decision: result.decision,
          bedId: bedId || 'none',
          doctorId: doctorId || 'none',
          reason: result.reasons.join(' '),
          status: DECISION_STATUS[result.decision],
        }],
        { session }
      );

      return { admission: admissionDoc, bedGroup: updatedBed, doctor: updatedDoctor };
    });

    if (bedGroup) emitToHospital(hospitalId, 'bed:update', mapDoc(bedGroup.toJSON()));
    if (doctor) emitToHospital(hospitalId, 'doctor:update', mapDoc(doctor.toJSON()));

    await recordAudit({
      user: req.user,
      hospitalId,
      action: 'admission.decision',
      resourceType: 'admission',
      resourceId: admission.id,
      summary: `${result.decision.toUpperCase()} — ${patientName} (${department}/${bedType})`,
      metadata: { reasons: result.reasons, metrics: result.metrics, referral: result.referral },
    });

    emitToHospital(hospitalId, 'admission:decided', { admission: mapDoc(admission.toJSON()), result });

    res.status(201).json({ success: true, data: { admission: mapDoc(admission.toJSON()), result } });
  })
);

module.exports = router;
