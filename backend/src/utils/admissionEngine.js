const Hospital = require('../models/Hospital');
const { computeHospitalMetrics } = require('./hospitalMetrics');

// Every rule below is a plain, explainable condition over real, current
// hospital data — no opaque scoring model. Each decision carries a list of
// human-readable `reasons` so the UI (and an interviewer) can see exactly
// why the engine chose admit / delay / refer.

/**
 * evaluateAdmission — the read-only "what would happen" evaluation. Used both
 * by the live evaluate panel and, immediately before persisting, by the
 * POST /admissions route (so the decision that gets saved is always freshly
 * recomputed against current data, never trusted from client input).
 */
const evaluateAdmission = async (hospitalId, { department, bedType, severity = 'medium' }) => {
  const m = await computeHospitalMetrics(hospitalId);
  const reasons = [];

  const bedsOfType = m.beds.filter((b) => b.type === bedType);
  const bedTotal = bedsOfType.reduce((s, b) => s + (b.total || 0), 0);
  const bedAvailable = bedsOfType.reduce((s, b) => s + (b.available || 0), 0);
  const bedOccupancyPct = bedTotal ? Math.round(((bedTotal - bedAvailable) / bedTotal) * 100) : 100;

  const doctorsInDept = m.doctors.filter((d) => d.department === department);
  const doctorsAvailable = doctorsInDept.filter((d) => d.status === 'available');
  const bestDoctor = doctorsAvailable.sort((a, b) => (a.workload || 0) - (b.workload || 0))[0] || null;

  const metrics = {
    hospitalStressScore: m.stressScore,
    hospitalStressLabel: m.stressLabel,
    bedType, bedTotal, bedAvailable, bedOccupancyPct,
    department, doctorsInDeptCount: doctorsInDept.length, doctorsAvailableCount: doctorsAvailable.length,
    severity,
  };

  let decision;
  let recommendedBedId = null;
  let recommendedDoctorId = null;

  if (bedAvailable === 0) {
    reasons.push(`No ${bedType} beds currently available (0 of ${bedTotal}).`);
    if (doctorsAvailable.length > 0 && m.stressScore < 90) {
      decision = 'monitor';
      reasons.push(`${doctorsAvailable.length} ${department} doctor(s) are available, so the patient can be triaged while a bed clears.`);
    } else {
      decision = 'refer';
      reasons.push(doctorsAvailable.length === 0
        ? `No ${department} doctors are currently available either.`
        : `Hospital-wide stress score is ${m.stressScore}/100 (very high) — recommending referral rather than delaying.`);
    }
  } else {
    reasons.push(`${bedAvailable} of ${bedTotal} ${bedType} beds available (${bedOccupancyPct}% occupied).`);
    if (doctorsAvailable.length === 0) {
      decision = 'monitor';
      reasons.push(`A bed is available, but no ${department} doctor is free right now.`);
    } else if (m.stressScore >= 75 && severity !== 'critical') {
      decision = 'monitor';
      reasons.push(`Hospital stress score is ${m.stressScore}/100 (High). Non-critical admissions are held back to protect capacity for critical cases.`);
    } else {
      decision = 'admit';
      reasons.push(`${department} doctor ${bestDoctor?.name || ''} is available (workload ${bestDoctor?.workload ?? 0}%).`);
      recommendedBedId = bedsOfType.find((b) => (b.available || 0) > 0)?.id || null;
      recommendedDoctorId = bestDoctor?.id || null;
    }
  }

  let referral = null;
  if (decision === 'refer') {
    referral = await findBestAlternativeHospital(hospitalId, bedType);
  }

  return { decision, reasons, metrics, recommendedBedId, recommendedDoctorId, referral };
};

/**
 * findBestAlternativeHospital — when referring, look across the same city for
 * the hospital with the lowest stress score that actually has an available
 * bed of the required type. Reuses the same metrics function so the
 * recommendation is consistent with what the City dashboard shows.
 */
const findBestAlternativeHospital = async (excludeHospitalId, bedType) => {
  const current = await Hospital.findOne({ id: excludeHospitalId }).lean();
  if (!current) return null;

  const candidates = await Hospital.find({ city: current.city, id: { $ne: excludeHospitalId } }).lean();
  const scored = [];
  for (const h of candidates) {
    const m = await computeHospitalMetrics(h.id);
    const available = m.beds.filter((b) => b.type === bedType).reduce((s, b) => s + (b.available || 0), 0);
    if (available > 0) {
      scored.push({ hospitalId: h.id, name: h.name, stressScore: m.stressScore, availableBeds: available });
    }
  }
  scored.sort((a, b) => a.stressScore - b.stressScore);
  return scored[0] || null;
};

module.exports = { evaluateAdmission, findBestAlternativeHospital };
