// Shared stress-score helpers used by both dashboard and city routes

const MAX_OPD_CAPACITY = 50; // active patients = 100% OPD load

// OPD load score (0–100)
const calcOpdScore = (queue) => {
  const active = queue.filter((q) => ['waiting', 'in-progress'].includes(q.status)).length;
  return Math.min((active / MAX_OPD_CAPACITY) * 100, 100);
};

// Bed occupancy score (0–100)
const calcBedScore = (beds) => {
  if (!beds.length) return 0;
  const { total, occupied } = beds.reduce(
    (acc, b) => ({ total: acc.total + b.total, occupied: acc.occupied + b.occupied }),
    { total: 0, occupied: 0 }
  );
  return total ? (occupied / total) * 100 : 0;
};

// Doctor pressure score (0–100): % not available
const calcDoctorScore = (doctors) => {
  if (!doctors.length) return 0;
  const notAvailable = doctors.filter((d) => d.status !== 'available').length;
  return (notAvailable / doctors.length) * 100;
};

// Final stress score: 40% OPD + 40% Bed + 20% Doctor
const calcStressScore = (opdScore, bedScore, doctorScore) => {
  const score   = opdScore * 0.4 + bedScore * 0.4 + doctorScore * 0.2;
  const rounded = Math.round(score);
  const label   = rounded >= 75 ? 'High' : rounded >= 45 ? 'Medium' : 'Low';
  return { score: rounded, label };
};

// Convenience: compute all scores for a hospital's data in one call
const computeHospitalScores = (queue, beds, doctors) => {
  const opdScore    = calcOpdScore(queue);
  const bedScore    = calcBedScore(beds);
  const doctorScore = calcDoctorScore(doctors);
  return {
    ...calcStressScore(opdScore, bedScore, doctorScore),
    opdLoad:           Math.round(opdScore),
    bedOccupancy:      Math.round(bedScore),
    doctorPressure:    Math.round(doctorScore),
    doctorAvailability: doctors.length
      ? Math.round(((doctors.length - doctors.filter((d) => d.status !== 'available').length) / doctors.length) * 100)
      : 0,
  };
};

module.exports = { calcOpdScore, calcBedScore, calcDoctorScore, calcStressScore, computeHospitalScores };
