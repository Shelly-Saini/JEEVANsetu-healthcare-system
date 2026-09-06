const Bed = require('../models/Bed');
const Doctor = require('../models/Doctor');
const OPDQueue = require('../models/OPDQueue');
const Inventory = require('../models/Inventory');
const { calcOpdScore, calcBedScore, calcDoctorScore, calcStressScore } = require('./scoring');

const mapDoc = (d) => {
  const { _id, __v, ...rest } = d;
  return { ...rest, id: rest.id || _id?.toString() };
};

const computeInventoryStatus = (quantity, threshold) => {
  if (quantity <= threshold * 0.5) return 'critical';
  if (quantity <= threshold) return 'low';
  return 'ok';
};

/**
 * computeHospitalMetrics — the single place that reads beds/doctors/OPD/inventory
 * for a hospital and derives every downstream number (stress score, occupancy,
 * alerts). Dashboard, city summary, snapshot job, and the admission engine all
 * call this instead of each re-implementing the same aggregation, which is what
 * previously caused the dashboard and city routes to duplicate this logic.
 */
const computeHospitalMetrics = async (hospitalId) => {
  const [bedsData, doctorsData, queueData, inventoryData] = await Promise.all([
    Bed.find({ hospitalId }).lean(),
    Doctor.find({ hospitalId }).lean(),
    OPDQueue.find({ hospitalId }).lean(),
    Inventory.find({ hospitalId }).lean(),
  ]);

  const beds = bedsData.map(mapDoc);
  const doctors = doctorsData.map(mapDoc);
  const queue = queueData.map(mapDoc);
  const inventory = inventoryData.map(mapDoc);

  const activeQueue = queue.filter((q) => ['waiting', 'in-progress'].includes(q.status));
  const totalBeds = beds.reduce((s, b) => s + (b.total || 0), 0);
  const availableBeds = beds.reduce((s, b) => s + (b.available || 0), 0);
  const occupiedBeds = beds.reduce((s, b) => s + (b.occupied || 0), 0);

  const opdScore = calcOpdScore(queue);
  const bedScore = calcBedScore(beds);
  const doctorScore = calcDoctorScore(doctors);
  const { score: stressScore, label: stressLabel } = calcStressScore(opdScore, bedScore, doctorScore);

  const inventoryAlerts = inventory
    .filter((i) => ['low', 'critical'].includes(computeInventoryStatus(i.quantity, i.minThreshold)))
    .map((i) => ({ ...i, status: computeInventoryStatus(i.quantity, i.minThreshold) }));

  return {
    beds, doctors, queue, inventory, activeQueue,
    totalBeds, availableBeds, occupiedBeds,
    stressScore, stressLabel,
    breakdown: { opdLoad: Math.round(opdScore), bedOccupancy: Math.round(bedScore), doctorPressure: Math.round(doctorScore) },
    inventoryAlerts,
    availableDoctors: doctors.filter((d) => d.status === 'available').length,
    busyDoctors: doctors.filter((d) => d.status === 'busy').length,
    unavailableDoctors: doctors.filter((d) => d.status === 'unavailable').length,
  };
};

module.exports = { computeHospitalMetrics, mapDoc, computeInventoryStatus };
