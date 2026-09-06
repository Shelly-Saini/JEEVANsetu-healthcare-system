/**
 * Single source of truth for every enum used across the API.
 * The frontend keeps a mirrored copy at frontend/src/constants/enums.js —
 * keep both in sync (see scripts/check-enum-sync.js).
 */

const BED_TYPES = ['ICU', 'General', 'Emergency'];
const BED_STATUSES = ['available', 'occupied', 'cleaning'];

const DOCTOR_STATUSES = ['available', 'busy', 'unavailable'];
const DOCTOR_DEPARTMENTS = [
  'Cardiology', 'Neurology', 'Orthopedics', 'General', 'Emergency',
  'Oncology', 'Pediatrics', 'Gynecology',
];

const OPD_SEVERITIES = ['critical', 'high', 'medium', 'low'];
const OPD_STATUSES = ['waiting', 'in-progress', 'completed', 'cancelled'];
const SEVERITY_WAIT_MINUTES = { critical: 5, high: 15, medium: 30, low: 50 };

const INVENTORY_CATEGORIES = ['oxygen', 'ppe', 'medicine', 'equipment'];
const INVENTORY_STATUSES = ['ok', 'low', 'critical'];

const ADMISSION_STATUSES = ['pending', 'admitted', 'discharged', 'referred', 'cancelled'];
const ADMISSION_DECISIONS = ['admit', 'refer', 'monitor'];

const STRESS_LABELS = ['Low', 'Medium', 'High'];

// admin      — full read/write access to their own hospital's operations
// city_admin — read-only access across every hospital in their assigned city
// doctor     — clinical staff: OPD queue, doctor board, admissions
// staff      — operations staff: beds, inventory
const USER_ROLES = ['admin', 'city_admin', 'doctor', 'staff'];

module.exports = {
  BED_TYPES, BED_STATUSES,
  DOCTOR_STATUSES, DOCTOR_DEPARTMENTS,
  OPD_SEVERITIES, OPD_STATUSES, SEVERITY_WAIT_MINUTES,
  INVENTORY_CATEGORIES, INVENTORY_STATUSES,
  ADMISSION_STATUSES, ADMISSION_DECISIONS,
  STRESS_LABELS,
  USER_ROLES,
};
