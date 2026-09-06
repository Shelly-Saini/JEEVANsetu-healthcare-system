const Hospital = require('../models/Hospital');
const MetricSnapshot = require('../models/MetricSnapshot');
const { computeHospitalMetrics } = require('./hospitalMetrics');
const { log, errorLog } = require('./logger');

/**
 * takeSnapshots — computes and stores one MetricSnapshot per hospital.
 * Called on an interval by startSnapshotScheduler (long-running Node process)
 * and can also be invoked on-demand (e.g. from a `node scripts/snapshot.js`
 * cron entry if this were deployed as scheduled serverless functions instead
 * of a persistent server — documented in the README's deployment notes).
 */
const takeSnapshots = async () => {
  const hospitals = await Hospital.find({}).lean();
  let written = 0;
  for (const hospital of hospitals) {
    try {
      const m = await computeHospitalMetrics(hospital.id);
      await MetricSnapshot.create({
        hospitalId: hospital.id,
        stressScore: m.stressScore,
        opdLoad: m.breakdown.opdLoad,
        bedOccupancy: m.breakdown.bedOccupancy,
        doctorPressure: m.breakdown.doctorPressure,
        activeOpdPatients: m.activeQueue.length,
        availableBeds: m.availableBeds,
        totalBeds: m.totalBeds,
      });
      written += 1;
    } catch (err) {
      errorLog('SNAPSHOT', `Failed for hospital ${hospital.id}`, err);
    }
  }
  log('SNAPSHOT', `Recorded ${written}/${hospitals.length} hospital snapshots`);
  return written;
};

/**
 * startSnapshotScheduler — fires takeSnapshots() immediately and then every
 * `intervalMs`. Intended for the long-running Node process (local dev / a
 * persistent host). On serverless platforms without a background worker,
 * trigger `takeSnapshots()` from a scheduled function instead.
 */
const startSnapshotScheduler = (intervalMs = 5 * 60 * 1000) => {
  takeSnapshots().catch((err) => errorLog('SNAPSHOT', 'Initial snapshot failed', err));
  return setInterval(() => {
    takeSnapshots().catch((err) => errorLog('SNAPSHOT', 'Scheduled snapshot failed', err));
  }, intervalMs);
};

module.exports = { takeSnapshots, startSnapshotScheduler };
