const AuditLog = require('../models/AuditLog');
const { log } = require('./logger');

/**
 * recordAudit — fire-and-forget audit trail write. Never throws into the
 * request path: a logging failure should not fail the user's action.
 */
const recordAudit = async ({ user, hospitalId, action, resourceType, resourceId, summary, metadata }) => {
  try {
    await AuditLog.create({
      hospitalId,
      actorId: user?.id || 'system',
      actorName: user?.name || 'System',
      actorRole: user?.role || 'system',
      action,
      resourceType,
      resourceId,
      summary,
      metadata,
    });
  } catch (err) {
    log('AUDIT', `Failed to write audit entry: ${err.message}`);
  }
};

module.exports = { recordAudit };
