const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

/**
 * PRODUCTION-GRADE CLEANUP UTILITY
 * Safely removes predefined temporary and debug JSON files.
 */

const TARGET_FILES = [
  'tmp_seed_results.json',
  'tmp_seed_results_atlas.json',
  'debug_beds.json',
  'final_bed_verify.json',
  'debug_beds_verify.json',
  'database.db',
  'out.log',
  'out_utf8.log',
  'test_run.log'
];

const BASE_DIR = path.resolve(__dirname, '..');

const log = (type, msg) => {
  const icons = { success: '✅', skip: '🟡', error: '❌', info: 'ℹ️' };
  console.log(`${icons[type] || '•'} [${type.toUpperCase()}] ${msg}`);
};

const ask = (query) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans.toLowerCase());
  }));
};

async function runCleanup() {
  const isDryRun = process.argv.includes('--dry-run');
  const skipConfirm = process.argv.includes('--yes');

  log('info', `Starting cleanup in ${BASE_DIR}...`);
  if (isDryRun) log('info', 'DRY-RUN MODE ENABLED: No files will be deleted.');

  const results = { deleted: 0, skipped: 0, errors: 0 };

  for (const filename of TARGET_FILES) {
    const filePath = path.join(BASE_DIR, filename);
    
    try {
      await fs.access(filePath);
      
      if (isDryRun) {
        log('info', `Would delete: ${filename}`);
        results.deleted++;
      } else {
        if (!skipConfirm) {
          const confirm = await ask(`Delete ${filename}? (y/n): `);
          if (confirm !== 'y') {
            log('skip', `User skipped: ${filename}`);
            results.skipped++;
            continue;
          }
        }
        await fs.unlink(filePath);
        log('success', `Deleted: ${filename}`);
        results.deleted++;
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        log('skip', `Not found: ${filename}`);
        results.skipped++;
      } else {
        log('error', `Error accessing ${filename}: ${err.message}`);
        results.errors++;
      }
    }
  }

  console.log('\n--- CLEANUP SUMMARY ---');
  console.log(`Files Processed: ${TARGET_FILES.length}`);
  console.log(`Files Deleted:   ${results.deleted}`);
  console.log(`Files Skipped:   ${results.skipped}`);
  console.log(`Errors:          ${results.errors}`);
  console.log('-----------------------\n');

  if (results.errors > 0) process.exit(1);
}

runCleanup();
