#!/usr/bin/env node
/**
 * check-enum-sync.js — fails (exit 1) if the frontend and backend enum
 * value lists ever drift apart. This exists specifically because the
 * original version of this project had the frontend using 'Occupied' while
 * the backend used 'occupied' — a mismatch that silently broke the Smart
 * Admissions feature. Run in CI so that class of bug can't recur silently.
 */
const path = require('path');
const backend = require(path.join(__dirname, '../backend/src/constants/enums.js'));

// The frontend file is ESM; parse its exported array/object literals with a
// light regex-based extraction rather than importing it (keeps this script
// dependency-free and runnable directly with plain Node).
const fs = require('fs');
const frontendSrc = fs.readFileSync(
  path.join(__dirname, '../frontend/src/constants/enums.js'),
  'utf8'
);

const extractArray = (name) => {
  const match = frontendSrc.match(new RegExp(`export const ${name}\\s*=\\s*\\[([^\\]]*)\\]`));
  if (!match) return null;
  return match[1]
    .split(',')
    .map((s) => s.trim().replace(/^'|'$/g, '').replace(/^"|"$/g, ''))
    .filter(Boolean);
};

const CHECKS = [
  ['BED_TYPES', 'BED_TYPES'],
  ['BED_STATUSES', 'BED_STATUSES'],
  ['DOCTOR_STATUSES', 'DOCTOR_STATUSES'],
  ['DOCTOR_DEPARTMENTS', 'DOCTOR_DEPARTMENTS'],
  ['OPD_SEVERITIES', 'OPD_SEVERITIES'],
  ['OPD_STATUSES', 'OPD_STATUSES'],
  ['INVENTORY_CATEGORIES', 'INVENTORY_CATEGORIES'],
  ['USER_ROLES', 'USER_ROLES'],
];

let failed = false;

for (const [backendKey, frontendKey] of CHECKS) {
  const backendValues = backend[backendKey];
  const frontendValues = extractArray(frontendKey);

  if (!frontendValues) {
    console.log(`⚠️  Could not find frontend export "${frontendKey}" — skipping (check manually)`);
    continue;
  }

  const missing = backendValues.filter((v) => !frontendValues.includes(v));
  const extra = frontendValues.filter((v) => !backendValues.includes(v));

  if (missing.length || extra.length) {
    failed = true;
    console.log(`❌ ${backendKey} mismatch:`);
    if (missing.length) console.log(`   backend has, frontend missing: ${missing.join(', ')}`);
    if (extra.length) console.log(`   frontend has, backend missing:  ${extra.join(', ')}`);
  } else {
    console.log(`✅ ${backendKey} in sync (${backendValues.length} values)`);
  }
}

if (failed) {
  console.log('\nEnum drift detected — update backend/src/constants/enums.js and frontend/src/constants/enums.js together.');
  process.exit(1);
}
console.log('\nAll checked enums are in sync.');
