/**
 * Script to run only the system configuration seeds
 */

const knex = require('knex');
const knexConfig = require('./knexfile');

const db = knex(knexConfig.development);

async function runConfigSeeds() {
  try {
    console.log('Running system configuration seeds...\n');

    // Run course categories seed
    console.log('Seeding course categories...');
    const categoriesSeed = require('./seeds/005_course_categories');
    await categoriesSeed.seed(db);

    // Run course levels seed
    console.log('Seeding course levels...');
    const levelsSeed = require('./seeds/006_course_levels');
    await levelsSeed.seed(db);

    // Run course durations seed
    console.log('Seeding course durations...');
    const durationsSeed = require('./seeds/007_course_durations');
    await durationsSeed.seed(db);

    console.log('\n✅ All system configuration seeds completed successfully!');
  } catch (error) {
    console.error('❌ Error running seeds:', error.message);
    console.error(error);
  } finally {
    await db.destroy();
  }
}

runConfigSeeds();
