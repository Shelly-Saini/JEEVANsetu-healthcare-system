/**
 * scripts/reseed.js
 *
 * Safe database reseed utility for development.
 *
 * Usage:
 *   node scripts/reseed.js          — prompts for confirmation
 *   node scripts/reseed.js --yes    — skips prompt (CI / automation)
 *
 * What it does:
 *   1. Loads .env
 *   2. Connects to MongoDB
 *   3. Asks for confirmation (unless --yes)
 *   4. Drops the database
 *   5. Runs seed.js
 *   6. Disconnects and exits
 */

'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const readline = require('readline');
const mongoose = require('mongoose');
const connectDB = require('../src/utils/mongodb');
const seedData  = require('../src/utils/seed');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ICONS = { info: 'ℹ️ ', success: '✅', warn: '⚠️ ', error: '❌', step: '🔹' };

const log = (type, msg) => {
  const ts = new Date().toLocaleTimeString('en-GB');
  console.log(`${ICONS[type] ?? '•'} [${ts}] ${msg}`);
};

const ask = (question) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve =>
    rl.question(question, answer => { rl.close(); resolve(answer.trim().toLowerCase()); })
  );
};

const exit = (code) => {
  // Give mongoose time to flush before hard exit
  setTimeout(() => process.exit(code), 200);
};

// ─── Main ─────────────────────────────────────────────────────────────────────

async function reseed() {
  const skipConfirm = process.argv.includes('--yes');
  const uri         = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jeevansetu';

  // Derive a display-safe URI (hide credentials)
  const safeUri = uri.replace(/:\/\/([^@]+)@/, '://<credentials>@');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  JEEVANsetu — Database Reseed Utility');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  log('info', `Target: ${safeUri}`);

  // ── Step 1: Confirmation ───────────────────────────────────────────────────
  if (!skipConfirm) {
    log('warn', 'This will DROP the entire database and reseed from scratch.');
    const answer = await ask('  Type "yes" to continue, anything else to abort: ');
    if (answer !== 'yes') {
      log('warn', 'Aborted by user. Database was NOT modified.');
      exit(0);
      return;
    }
  } else {
    log('info', '--yes flag detected. Skipping confirmation prompt.');
  }

  // ── Step 2: Connect ────────────────────────────────────────────────────────
  log('step', 'Connecting to MongoDB...');
  try {
    await connectDB();
  } catch (err) {
    log('error', `Connection failed: ${err.message}`);
    exit(1);
    return;
  }

  // ── Step 3: Drop database ──────────────────────────────────────────────────
  const dbName = mongoose.connection.db.databaseName;
  log('step', `Dropping database "${dbName}"...`);
  try {
    await mongoose.connection.db.dropDatabase();
    log('success', `Database "${dbName}" dropped.`);
  } catch (err) {
    log('error', `Drop failed: ${err.message}`);
    await mongoose.disconnect();
    exit(1);
    return;
  }

  // ── Step 4: Seed ───────────────────────────────────────────────────────────
  log('step', 'Running seed.js...');
  try {
    await seedData({ force: true });
    log('success', 'Database seeded successfully.');
  } catch (err) {
    log('error', `Seed failed: ${err.message}`);
    await mongoose.disconnect();
    exit(1);
    return;
  }

  // ── Step 5: Disconnect ─────────────────────────────────────────────────────
  await mongoose.disconnect();
  log('success', 'Disconnected from MongoDB.');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ✅  Reseed complete. Ready for development.');
  console.log('  🚀  Starting dev server...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  exit(0);
}

reseed().catch(err => {
  console.error('❌ Unexpected error:', err);
  exit(1);
});
