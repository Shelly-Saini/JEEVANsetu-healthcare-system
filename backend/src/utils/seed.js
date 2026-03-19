const Hospital  = require('../models/Hospital');
const User       = require('../models/User');
const Bed        = require('../models/Bed');
const Doctor     = require('../models/Doctor');
const OPDQueue   = require('../models/OPDQueue');
const Inventory  = require('../models/Inventory');
const Admission  = require('../models/Admission');

// ─── Deterministic helpers ────────────────────────────────────────────────────

const ri  = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const rf  = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(2));
const pick = (arr)     => arr[Math.floor(Math.random() * arr.length)];

// Clamp a value between min and max
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// ─── Load profile definitions ─────────────────────────────────────────────────
// Each hospital is assigned a profile that drives correlated data across all
// collections — beds, doctors, OPD, inventory all reflect the same pressure level.
const PROFILES = {
  low:      { bedOccMin: 0.30, bedOccMax: 0.55, doctorBusyPct: 0.25, opdMin: 5,  opdMax: 12, invCritPct: 0.05, invLowPct: 0.15 },
  moderate: { bedOccMin: 0.55, bedOccMax: 0.75, doctorBusyPct: 0.50, opdMin: 15, opdMax: 28, invCritPct: 0.15, invLowPct: 0.25 },
  // opdMin=38 guarantees OPD score ≥76 (38/50*100), which combined with bed≥75%
  // and doctor≥75% busy always produces stressScore≥75 → label='High'
  high:     { bedOccMin: 0.78, bedOccMax: 0.95, doctorBusyPct: 0.75, opdMin: 38, opdMax: 48, invCritPct: 0.30, invLowPct: 0.30 },
};

// ─── Static master data ───────────────────────────────────────────────────────

const SEED_PASSWORD_HASH =
  process.env.SEED_PASSWORD_HASH ||
  '$2a$10$replacethiswitharealhashdonotuseinproduction00000000000';

const HOSPITALS_DEF = [
  // Delhi — 4 hospitals: one of each profile + one extra moderate
  { id: 'h1', name: 'Apollo Hospital',          city: 'Delhi',     cityId: 'city1', address: 'Sarita Vihar, New Delhi - 110076',          phone: '+91-11-71791090', lat: 28.5355, lng: 77.2510, profile: 'moderate' },
  { id: 'h2', name: 'AIIMS Delhi',              city: 'Delhi',     cityId: 'city1', address: 'Ansari Nagar, New Delhi - 110029',           phone: '+91-11-26588500', lat: 28.5672, lng: 77.2100, profile: 'high'     },
  { id: 'h3', name: 'Fortis Hospital',          city: 'Delhi',     cityId: 'city1', address: 'Aruna Asaf Ali Marg, New Delhi - 110070',    phone: '+91-11-42776222', lat: 28.5700, lng: 77.1800, profile: 'low'      },
  { id: 'h4', name: 'Max Super Speciality',     city: 'Delhi',     cityId: 'city1', address: 'Press Enclave Road, Saket, New Delhi',       phone: '+91-11-26515050', lat: 28.5244, lng: 77.2066, profile: 'moderate' },
  // Mumbai — 3 hospitals
  { id: 'h5', name: 'Lilavati Hospital',        city: 'Mumbai',    cityId: 'city2', address: 'A-791, Bandra Reclamation, Mumbai - 400050', phone: '+91-22-26751000', lat: 19.0544, lng: 72.8322, profile: 'moderate' },
  { id: 'h6', name: 'KEM Hospital',             city: 'Mumbai',    cityId: 'city2', address: 'Acharya Donde Marg, Parel, Mumbai - 400012', phone: '+91-22-24136051', lat: 19.0007, lng: 72.8416, profile: 'high'     },
  { id: 'h7', name: 'Hinduja Hospital',         city: 'Mumbai',    cityId: 'city2', address: 'Veer Savarkar Marg, Mahim, Mumbai - 400016', phone: '+91-22-24452222', lat: 19.0390, lng: 72.8419, profile: 'low'      },
  // Bangalore — 3 hospitals
  { id: 'h8', name: 'Manipal Hospital',         city: 'Bangalore', cityId: 'city3', address: '98, HAL Airport Road, Bangalore - 560017',   phone: '+91-80-25024444', lat: 12.9716, lng: 77.6412, profile: 'moderate' },
  { id: 'h9', name: 'Narayana Health City',     city: 'Bangalore', cityId: 'city3', address: '258/A, Bommasandra, Bangalore - 560099',      phone: '+91-80-71222222', lat: 12.8399, lng: 77.6770, profile: 'high'     },
  { id: 'h10', name: 'Sakra World Hospital',    city: 'Bangalore', cityId: 'city3', address: 'SY No. 52/2, Devarabeesanahalli, Bangalore',  phone: '+91-80-49694969', lat: 12.9784, lng: 77.6408, profile: 'low'      },
];

const DEPARTMENTS = ['Cardiology', 'Neurology', 'Orthopedics', 'General', 'Emergency', 'Oncology', 'Pediatrics', 'Gynecology'];

const DOCTOR_FIRST = ['Arun', 'Sunita', 'Rajesh', 'Priya', 'Vikram', 'Meena', 'Suresh', 'Anita', 'Mohan', 'Kavita',
                      'Amit', 'Pooja', 'Ravi', 'Deepa', 'Sanjay', 'Nisha', 'Arjun', 'Rekha', 'Kiran', 'Manoj'];
const DOCTOR_LAST  = ['Sharma', 'Mehta', 'Rao', 'Singh', 'Gupta', 'Kumar', 'Patel', 'Nair', 'Joshi', 'Verma',
                      'Iyer', 'Reddy', 'Bose', 'Pillai', 'Malhotra', 'Chopra', 'Saxena', 'Mishra', 'Tiwari', 'Pandey'];

const PATIENT_NAMES = ['Ramesh Yadav', 'Sunita Devi', 'Mohan Lal', 'Anita Kumari', 'Suresh Babu',
                       'Kavita Sharma', 'Amit Verma', 'Pooja Singh', 'Ravi Shankar', 'Meera Nair',
                       'Sanjay Gupta', 'Priya Patel', 'Arjun Mehta', 'Vikram Rao', 'Deepa Iyer',
                       'Kiran Reddy', 'Manoj Tiwari', 'Rekha Mishra', 'Arun Bose', 'Nisha Pillai'];

// Inventory catalogue: [name, category, unit, baseQty, baseThreshold]
const INV_CATALOGUE = [
  ['Oxygen Cylinders',      'oxygen',    'cylinders', 120, 30],
  ['Ventilators',           'equipment', 'units',      40, 10],
  ['ICU Kits',              'icu',       'kits',        80, 20],
  ['Paracetamol 500mg',     'medicine',  'strips',     500, 100],
  ['Amoxicillin 250mg',     'medicine',  'strips',     300, 80],
  ['IV Fluids (NS 500ml)',  'medicine',  'bags',       200, 50],
  ['Surgical Gloves (L)',   'ppe',       'boxes',      150, 40],
  ['N95 Masks',             'ppe',       'units',      400, 100],
  ['Surgical Masks',        'ppe',       'boxes',      300, 60],
  ['Syringes 5ml',          'equipment', 'units',      600, 150],
  ['BP Monitors',           'equipment', 'units',       25, 5],
  ['Pulse Oximeters',       'equipment', 'units',       30, 8],
  ['Defibrillators',        'equipment', 'units',       10, 3],
  ['Blood Bags (O+)',       'blood',     'units',       80, 20],
  ['Morphine Injections',   'medicine',  'vials',       60, 15],
];

// ─── Counters — declared here, initialised inside seedData() on every call ───
let bedId, docId, invId, opdId, admId;

// ─── Bed generator ────────────────────────────────────────────────────────────
// Returns 3 aggregated bed rows (ICU / General / Emergency) per hospital.
// Occupancy is driven by the hospital's load profile.
const BED_CONFIG = {
  ICU:       { base: 30,  emergencyBoost: 15 },
  General:   { base: 120, emergencyBoost: 30 },
  Emergency: { base: 40,  emergencyBoost: 20 },
};

function makeBeds(hospital, profile) {
  return ['ICU', 'General', 'Emergency'].map(type => {
    const cfg   = BED_CONFIG[type];
    // High-profile hospitals get more beds (busier, larger)
    const total = cfg.base + (profile === 'high' ? cfg.emergencyBoost : profile === 'moderate' ? Math.round(cfg.emergencyBoost / 2) : 0);

    // Occupancy range from profile, with per-ward jitter
    const occRate  = rf(profile === 'high' && type === 'ICU' ? 0.82 : PROFILES[profile].bedOccMin,
                        profile === 'high' && type === 'ICU' ? 0.98 : PROFILES[profile].bedOccMax);
    const occupied = clamp(Math.round(total * occRate), 0, total);
    // Cleaning: 2–8% of total, but can't exceed remaining
    const cleaning = clamp(ri(1, Math.max(1, Math.round(total * 0.08))), 0, total - occupied);
    const available = total - occupied - cleaning;

    return {
      id:         `b_${bedId++}`,
      hospitalId: hospital.id,
      type,
      total,
      available:  Math.max(0, available),
      occupied,
      cleaning,
    };
  });
}

// ─── Doctor generator ─────────────────────────────────────────────────────────
// 15–20 doctors per hospital. Status distribution is driven by load profile.
// workload = Math.round((patientsToday / maxPatients) * 100)
function makeDoctors(hospital, profile) {
  const count = ri(15, 20);
  const p     = PROFILES[profile];
  const docs  = [];

  // Distribute departments evenly then randomise the tail
  const deptCycle = [...DEPARTMENTS];

  for (let i = 0; i < count; i++) {
    const dept = deptCycle[i % deptCycle.length];
    const maxPatients = ri(18, 25);

    // Determine status bucket
    const roll = Math.random();
    let status, patientsToday;

    if (roll < p.doctorBusyPct * 0.35) {
      // unavailable / overloaded — patientsToday capped at maxPatients to keep DB consistent
      status        = 'unavailable';
      patientsToday = maxPatients; // at capacity; workload = 100
    } else if (roll < p.doctorBusyPct) {
      status        = 'busy';
      patientsToday = ri(Math.round(maxPatients * 0.6), maxPatients - 1);
    } else {
      status        = 'available';
      patientsToday = ri(0, Math.round(maxPatients * 0.5));
    }

    const workload = clamp(Math.round((patientsToday / maxPatients) * 100), 0, 100);

    docs.push({
      id:           `d${docId++}`,
      hospitalId:   hospital.id,
      name:         `Dr. ${pick(DOCTOR_FIRST)} ${pick(DOCTOR_LAST)}`,
      department:   dept,
      status,
      workload,
      patientsToday,
      maxPatients,
      shift:        pick(['morning', 'afternoon', 'night']),
    });
  }
  return docs;
}

// ─── Inventory generator ──────────────────────────────────────────────────────
// 15 items per hospital. Stock level is biased by load profile:
//   high   → more critical/low items
//   low    → mostly ok
function makeInventory(hospital, profile) {
  const p = PROFILES[profile];
  return INV_CATALOGUE.map(([name, category, unit, baseQty, baseThreshold]) => {
    const threshold    = ri(Math.round(baseThreshold * 0.8), Math.round(baseThreshold * 1.2));
    const minThreshold = threshold;

    // Decide stock tier for this item
    const roll = Math.random();
    let quantity;
    if (roll < p.invCritPct) {
      // critical: below 50% of threshold
      quantity = ri(0, Math.floor(threshold * 0.49));
    } else if (roll < p.invCritPct + p.invLowPct) {
      // low: 50–100% of threshold
      quantity = ri(Math.floor(threshold * 0.5), threshold);
    } else {
      // ok: 100–250% of threshold
      quantity = ri(threshold + 1, Math.round(baseQty * rf(1.0, 2.5)));
    }

    return {
      id:           `i${invId++}`,
      hospitalId:   hospital.id,
      item:         name,
      category,
      quantity,
      unit,
      threshold,
      minThreshold,
    };
  });
}

// ─── OPD queue generator ──────────────────────────────────────────────────────
// Patient count and severity distribution are driven by load profile.
// High-profile hospitals get emergency spikes (more critical/high severity).
const SEVERITY_WEIGHTS = {
  low:      [0.05, 0.15, 0.40, 0.40], // [critical, high, medium, low]
  moderate: [0.15, 0.30, 0.35, 0.20],
  high:     [0.30, 0.35, 0.25, 0.10], // emergency spike
};
const SEVERITIES = ['critical', 'high', 'medium', 'low'];

function pickSeverity(profile) {
  const weights = SEVERITY_WEIGHTS[profile];
  const r = Math.random();
  let cum = 0;
  for (let i = 0; i < weights.length - 1; i++) {
    cum += weights[i];
    if (r < cum) return SEVERITIES[i];
  }
  // Last bucket absorbs floating-point remainder — no silent skew
  return SEVERITIES[weights.length - 1];
}

// Token prefix per hospital
const TOKEN_PREFIX = { h1:'A', h2:'B', h3:'C', h4:'D', h5:'E', h6:'F', h7:'G', h8:'H', h9:'I', h10:'J' };

function makeOPD(hospital, profile) {
  const p     = PROFILES[profile];
  const count = ri(p.opdMin, p.opdMax);
  const rows  = [];

  for (let i = 0; i < count; i++) {
    const severity = pickSeverity(profile);

    // Status: critical/high patients more likely to be in-progress
    const inProgressBias = severity === 'critical' ? 0.55 : severity === 'high' ? 0.40 : 0.20;
    const completedBias  = 0.15;
    const roll = Math.random();
    let status;
    if (roll < completedBias)                        status = 'completed';
    else if (roll < completedBias + inProgressBias)  status = 'in-progress';
    else                                             status = 'waiting';

    // Waiting time inversely proportional to severity
    const waitBase = { critical: 5, high: 15, medium: 30, low: 45 };
    const estimatedWait = status === 'waiting' ? ri(waitBase[severity], waitBase[severity] + 20) : 0;

    const prefix = TOKEN_PREFIX[hospital.id] || 'Z';
    rows.push({
      id:           `q${opdId++}`,
      hospitalId:   hospital.id,
      token:        `${prefix}${String(i + 1).padStart(3, '0')}`,
      patientName:  pick(PATIENT_NAMES),
      age:          ri(5, 80),
      department:   pick(DEPARTMENTS),
      severity,
      status,
      estimatedWait,
      registeredAt: new Date(Date.now() - ri(5, 180) * 60_000).toISOString(),
    });
  }
  return rows;
}

// ─── Admission generator ──────────────────────────────────────────────────────
// Admissions are relational — they reference real doctor IDs and bed IDs
// generated earlier in the same seed run.
const ADMISSION_REASONS = {
  admit:  ['Immediate care required', 'Post-surgery monitoring', 'Severe infection', 'Cardiac event', 'Trauma'],
  delay:  ['High occupancy — bed unavailable', 'Awaiting specialist', 'Pending lab results'],
  refer:  ['Requires advanced ICU', 'Specialist not available', 'Capacity exceeded'],
};

function makeAdmissions(hospital, profile, hospDoctors, hospBeds) {
  const count = ri(8, 18);
  const rows  = [];

  for (let i = 0; i < count; i++) {
    const doc = pick(hospDoctors);
    const bed = pick(hospBeds);

    // High-profile hospitals have more delays and referrals
    const roll = Math.random();
    let decision;
    if      (profile === 'high'     && roll < 0.35) decision = 'refer';
    else if (profile === 'high'     && roll < 0.60) decision = 'delay';
    else if (profile === 'moderate' && roll < 0.20) decision = 'delay';
    else                                            decision = 'admit';

    const status = decision === 'admit' ? pick(['admitted', 'discharged']) : 'pending';

    rows.push({
      id:          `a${admId++}`,
      hospitalId:  hospital.id,
      patientName: pick(PATIENT_NAMES),
      age:         ri(18, 75),
      department:  doc.department,
      bedType:     bed.type,
      decision,
      bedId:       bed.id,
      doctorId:    doc.id,
      reason:      pick(ADMISSION_REASONS[decision] || ADMISSION_REASONS.admit),
      admittedAt:  new Date(Date.now() - ri(1, 48) * 3_600_000).toISOString(),
      status,
    });
  }
  return rows;
}

// ─── Main seed function ───────────────────────────────────────────────────────

const seedData = async ({ force = false } = {}) => {
  try {
    if (!force) {
      const count = await Hospital.countDocuments();
      if (count > 0) {
        console.log('🌱 Database already seeded. Skipping...');
        return;
      }
    }

    console.log('🌱 Seeding database with large-scale realistic data...');

    // Reset counters on every call — prevents ID collisions in test environments
    bedId = 1; docId = 1; invId = 1; opdId = 1; admId = 1;

    // ── Users ──────────────────────────────────────────────────────────────────
    const users = [
      { id: 'u1',  name: 'City Admin — Delhi',     email: 'cityadmin@jeevansetu.in',  password: SEED_PASSWORD_HASH, role: 'city_admin', cityId: 'city1' },
      { id: 'u2',  name: 'City Admin — Mumbai',    email: 'cityadmin.mum@jeevansetu.in', password: SEED_PASSWORD_HASH, role: 'city_admin', cityId: 'city2' },
      { id: 'u3',  name: 'City Admin — Bangalore', email: 'cityadmin.blr@jeevansetu.in', password: SEED_PASSWORD_HASH, role: 'city_admin', cityId: 'city3' },
      { id: 'u4',  name: 'Admin — Apollo',         email: 'admin@apollo.in',          password: SEED_PASSWORD_HASH, role: 'doctor',     hospitalId: 'h1' },
      { id: 'u5',  name: 'Admin — AIIMS',          email: 'admin@aiims.in',           password: SEED_PASSWORD_HASH, role: 'doctor',     hospitalId: 'h2' },
      { id: 'u6',  name: 'Admin — Fortis',         email: 'admin@fortis.in',          password: SEED_PASSWORD_HASH, role: 'doctor',     hospitalId: 'h3' },
      { id: 'u7',  name: 'Admin — Max',            email: 'admin@max.in',             password: SEED_PASSWORD_HASH, role: 'doctor',     hospitalId: 'h4' },
      { id: 'u8',  name: 'Admin — Lilavati',       email: 'admin@lilavati.in',        password: SEED_PASSWORD_HASH, role: 'doctor',     hospitalId: 'h5' },
      { id: 'u9',  name: 'Admin — KEM',            email: 'admin@kem.in',             password: SEED_PASSWORD_HASH, role: 'doctor',     hospitalId: 'h6' },
      { id: 'u10', name: 'Admin — Hinduja',        email: 'admin@hinduja.in',         password: SEED_PASSWORD_HASH, role: 'doctor',     hospitalId: 'h7' },
      { id: 'u11', name: 'Admin — Manipal',        email: 'admin@manipal.in',         password: SEED_PASSWORD_HASH, role: 'doctor',     hospitalId: 'h8' },
      { id: 'u12', name: 'Admin — Narayana',       email: 'admin@narayana.in',        password: SEED_PASSWORD_HASH, role: 'doctor',     hospitalId: 'h9' },
      { id: 'u13', name: 'Admin — Sakra',          email: 'admin@sakra.in',           password: SEED_PASSWORD_HASH, role: 'doctor',     hospitalId: 'h10' },
      { id: 'u14', name: 'OPD Desk — Apollo',      email: 'opd@apollo.in',            password: SEED_PASSWORD_HASH, role: 'staff',      hospitalId: 'h1' },
      { id: 'u15', name: 'OPD Desk — AIIMS',       email: 'opd@aiims.in',             password: SEED_PASSWORD_HASH, role: 'staff',      hospitalId: 'h2' },
    ];

    // ── Hospitals ──────────────────────────────────────────────────────────────
    // totalBeds is computed from the bed rows generated below; placeholder here
    const hospitals = HOSPITALS_DEF.map(h => ({
      id:          h.id,
      name:        h.name,
      city:        h.city,
      cityId:      h.cityId,
      address:     h.address,
      phone:       h.phone,
      lat:         h.lat,
      lng:         h.lng,
      totalBeds:   0,          // patched after beds are generated
      stressScore: 0,          // computed by scoring.js at query time
      status:      h.profile === 'high' ? 'critical' : h.profile === 'moderate' ? 'moderate' : 'normal',
      departments: DEPARTMENTS,
    }));

    // ── Generate relational data per hospital ──────────────────────────────────
    // Build a Map for O(1) hospital lookup instead of find() inside forEach
    const hospitalMap = new Map(hospitals.map(h => [h.id, h]));

    const allBeds       = [];
    const allDoctors    = [];
    const allInventory  = [];
    const allOPD        = [];
    const allAdmissions = [];

    HOSPITALS_DEF.forEach(hDef => {
      const profile = hDef.profile;

      const beds      = makeBeds(hDef, profile);
      const doctors   = makeDoctors(hDef, profile);
      const inventory = makeInventory(hDef, profile);
      const opd       = makeOPD(hDef, profile);
      const admissions = makeAdmissions(hDef, profile, doctors, beds);

      // Patch totalBeds via O(1) Map lookup
      const hosp = hospitalMap.get(hDef.id);
      if (hosp) hosp.totalBeds = beds.reduce((s, b) => s + b.total, 0);

      allBeds.push(...beds);
      allDoctors.push(...doctors);
      allInventory.push(...inventory);
      allOPD.push(...opd);
      allAdmissions.push(...admissions);
    });

    // ── Insert ─────────────────────────────────────────────────────────────────
    await User.insertMany(users);
    await Hospital.insertMany(hospitals);
    await Bed.insertMany(allBeds);
    await Doctor.insertMany(allDoctors);
    await Inventory.insertMany(allInventory);
    await OPDQueue.insertMany(allOPD);
    await Admission.insertMany(allAdmissions);

    console.log(`✅ Seeded: ${hospitals.length} hospitals | ${allBeds.length} bed rows | ${allDoctors.length} doctors | ${allInventory.length} inventory items | ${allOPD.length} OPD patients | ${allAdmissions.length} admissions`);
  } catch (err) {
    console.error('❌ Seed error:', err);
  }
};

module.exports = seedData;
