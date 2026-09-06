/**
 * Frontend mirror of backend/src/constants/enums.js.
 * This is the single place the UI is allowed to know about status strings —
 * no page should hardcode 'Occupied', 'Overloaded', 'Critical', etc.
 * Keeping this identical to the backend file is what prevents the
 * capitalisation-mismatch class of bug the app used to have.
 */

export const BED_TYPES = ['ICU', 'General', 'Emergency'];
export const BED_STATUSES = ['available', 'occupied', 'cleaning'];

export const DOCTOR_STATUSES = ['available', 'busy', 'unavailable'];
export const DOCTOR_DEPARTMENTS = [
  'Cardiology', 'Neurology', 'Orthopedics', 'General', 'Emergency',
  'Oncology', 'Pediatrics', 'Gynecology',
];

export const OPD_SEVERITIES = ['critical', 'high', 'medium', 'low'];
export const OPD_STATUSES = ['waiting', 'in-progress', 'completed', 'cancelled'];
export const SEVERITY_WAIT_MINUTES = { critical: 5, high: 15, medium: 30, low: 50 };

export const INVENTORY_CATEGORIES = ['oxygen', 'ppe', 'medicine', 'equipment'];
export const INVENTORY_STATUSES = ['ok', 'low', 'critical'];

export const ADMISSION_STATUSES = ['pending', 'admitted', 'discharged', 'referred', 'cancelled'];
export const ADMISSION_DECISIONS = ['admit', 'refer', 'monitor'];

export const STRESS_LABELS = ['Low', 'Medium', 'High'];

export const USER_ROLES = ['admin', 'city_admin', 'doctor', 'staff'];

export const ROLE_META = {
  admin:      { label: 'Hospital Admin', home: '/dashboard', scope: 'hospital' },
  city_admin: { label: 'City Admin',     home: '/city',      scope: 'city' },
  doctor:     { label: 'Doctor',         home: '/opd',        scope: 'hospital' },
  staff:      { label: 'Operations Staff', home: '/beds',    scope: 'hospital' },
};

// ── Display helpers (label + color token) — used by badges/pills everywhere ──
export const BED_STATUS_META = {
  available: { label: 'Available', tone: 'success' },
  occupied:  { label: 'Occupied',  tone: 'critical' },
  cleaning:  { label: 'Cleaning',  tone: 'warning' },
};

export const DOCTOR_STATUS_META = {
  available:   { label: 'Available',   tone: 'success' },
  busy:        { label: 'Busy',        tone: 'warning' },
  unavailable: { label: 'Unavailable', tone: 'critical' },
};

export const OPD_SEVERITY_META = {
  critical: { label: 'Critical', tone: 'critical' },
  high:     { label: 'High',     tone: 'warning' },
  medium:   { label: 'Medium',   tone: 'info' },
  low:      { label: 'Low',      tone: 'success' },
};

export const INVENTORY_STATUS_META = {
  ok:       { label: 'OK',       tone: 'success' },
  low:      { label: 'Low',      tone: 'warning' },
  critical: { label: 'Critical', tone: 'critical' },
};

export const ADMISSION_DECISION_META = {
  admit:   { label: 'Admit',   tone: 'success' },
  monitor: { label: 'Monitor', tone: 'warning' },
  refer:   { label: 'Refer',   tone: 'critical' },
};

// Past-tense, for already-confirmed admission records (Recent Decisions list).
// Deliberately distinct wording from ADMISSION_DECISION_META's present-tense
// verbs ("Admit") so a recorded outcome can never be mistaken for an
// actionable recommendation still awaiting confirmation.
export const ADMISSION_STATUS_META = {
  admitted: { label: 'Admitted', tone: 'success' },
  pending:  { label: 'Monitoring', tone: 'warning' },
  referred: { label: 'Referred', tone: 'critical' },
  discharged: { label: 'Discharged', tone: 'info' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};

export const STRESS_LABEL_META = {
  Low:    { tone: 'success' },
  Medium: { tone: 'warning' },
  High:   { tone: 'critical' },
};

// Flat value → tone lookup used by the generic <Badge value="..."> API.
// Later entries win on key collision, which is fine since colliding keys
// (e.g. 'critical' in both severity and inventory) always agree on tone.
export const STATUS_TONE = Object.fromEntries(
  [BED_STATUS_META, DOCTOR_STATUS_META, OPD_SEVERITY_META, INVENTORY_STATUS_META, ADMISSION_DECISION_META, ADMISSION_STATUS_META, STRESS_LABEL_META]
    .flatMap((meta) => Object.entries(meta).map(([k, v]) => [k, v.tone]))
);
