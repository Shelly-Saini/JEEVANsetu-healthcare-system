require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const EXPECTED_COLLECTIONS = ['beds', 'doctors', 'hospitals', 'inventories', 'opdqueues', 'users', 'admissions'];

async function verify() {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes('<db_user>')) {
    console.error('❌ MONGODB_URI is not set or still has placeholder values in .env');
    process.exit(1);
  }

  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('✅ Connected\n');

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  const names = collections.map(c => c.name).sort();

  console.log('─────────────────────────────────────');
  console.log('📋 COLLECTIONS FOUND IN DATABASE:');
  console.log('─────────────────────────────────────');

  if (names.length === 0) {
    console.log('  (none — database is empty)');
  } else {
    names.forEach(n => console.log(`  • ${n}`));
  }

  console.log('\n─────────────────────────────────────');
  console.log('🔍 VERIFICATION CHECKS:');
  console.log('─────────────────────────────────────');

  const leftover = EXPECTED_COLLECTIONS.filter(c => names.includes(c));
  const unexpected = names.filter(c => !EXPECTED_COLLECTIONS.includes(c));

  let clean = true;

  if (leftover.length > 0) {
    clean = false;
    console.log(`\n❌ LEFTOVER APP COLLECTIONS (should be deleted):`);
    leftover.forEach(c => console.log(`     db.${c}.drop()`));
  } else {
    console.log('\n✅ No leftover application collections found');
  }

  if (unexpected.length > 0) {
    console.log(`\n⚠️  UNEXPECTED COLLECTIONS (review manually):`);
    unexpected.forEach(c => console.log(`     • ${c}`));
  }

  // Check document counts in any remaining app collections
  if (leftover.length > 0) {
    console.log('\n─────────────────────────────────────');
    console.log('📊 DOCUMENT COUNTS IN LEFTOVER COLLECTIONS:');
    console.log('─────────────────────────────────────');
    for (const name of leftover) {
      const count = await db.collection(name).countDocuments();
      console.log(`  • ${name}: ${count} document(s)`);
    }
  }

  console.log('\n─────────────────────────────────────');
  if (clean) {
    console.log('✅ Database is clean and ready for reseeding');
  } else {
    console.log('❌ Database is NOT clean — drop the listed collections before reseeding');
    console.log('\n   Run in mongosh:');
    console.log(`   use jeevansetu`);
    leftover.forEach(c => console.log(`   db.${c}.drop()`));
  }
  console.log('─────────────────────────────────────\n');

  await mongoose.disconnect();
}

verify().catch(err => {
  console.error('❌ Verification failed:', err.message);
  process.exit(1);
});
