const mongoose = require('mongoose');
const { log } = require('./logger');

/**
 * withOptionalTransaction — runs `fn(session)` inside a real MongoDB
 * transaction when the connection supports one (any replica set, which
 * includes every MongoDB Atlas cluster — even the free M0 tier). Standalone
 * `mongod` instances (common for quick local dev without replica-set setup)
 * don't support multi-document transactions at all; rather than crash for
 * those users, this catches exactly that failure mode and re-runs `fn(null)`
 * without a session, so the admission still gets recorded (just without the
 * atomicity guarantee) rather than the whole feature breaking locally.
 */
const withOptionalTransaction = async (fn) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } catch (err) {
    const noReplicaSet = /Transaction numbers are only allowed|IllegalOperation|Transactions are not supported/i.test(err.message || '');
    if (!noReplicaSet) throw err;
    log('DB', 'MongoDB is running as a standalone instance (no replica set) — falling back to a non-transactional write for this admission. Data is still saved correctly; only the all-or-nothing guarantee is unavailable locally.');
    return fn(null);
  } finally {
    await session.endSession();
  }
};

module.exports = { withOptionalTransaction };
