const OPDQueue = require('../models/OPDQueue');
const { SEVERITY_WAIT_MINUTES } = require('../constants/enums');
const { emitToHospital } = require('../realtime/socket');
const { errorLog } = require('./logger');

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

/**
 * recalcWaitTimes — recomputes estimatedWait for every 'waiting' patient in a
 * hospital based on their actual position in the priority queue, not a flat
 * per-severity constant. Each patient's wait is the sum of the average
 * consult time (SEVERITY_WAIT_MINUTES) for everyone ahead of them in
 * priority order, plus a small allowance for whoever is currently
 * in-progress. This is what makes "Avg wait" on the OPD page a real,
 * moving number instead of a value fixed at registration time — it changes
 * whenever someone is registered, starts, completes, or is cancelled.
 *
 * Called after every OPD mutation. Broadcasts the updated wait time for any
 * entry that actually changed, so connected clients see it live.
 */
const recalcWaitTimes = async (hospitalId) => {
  try {
    const [waiting, inProgress] = await Promise.all([
      OPDQueue.find({ hospitalId, status: 'waiting' }),
      OPDQueue.find({ hospitalId, status: 'in-progress' }).lean(),
    ]);

    waiting.sort((a, b) => PRIORITY_ORDER[a.severity] - PRIORITY_ORDER[b.severity] || new Date(a.registeredAt) - new Date(b.registeredAt));

    // Patients currently being seen contribute half their average consult
    // time as a "how much longer until a doctor frees up" allowance.
    let cumulative = inProgress.reduce((sum, e) => sum + SEVERITY_WAIT_MINUTES[e.severity] / 2, 0);

    for (const entry of waiting) {
      cumulative += SEVERITY_WAIT_MINUTES[entry.severity];
      const rounded = Math.round(cumulative);
      if (entry.estimatedWait !== rounded) {
        entry.estimatedWait = rounded;
        await entry.save();
        const { _id, __v, ...rest } = entry.toJSON();
        emitToHospital(hospitalId, 'opd:update', { ...rest, id: rest.id || _id?.toString() });
      }
    }
  } catch (err) {
    errorLog('OPD', `Failed to recalc wait times for hospital ${hospitalId}`, err);
  }
};

module.exports = { recalcWaitTimes };
