/**
 * Script to rollback and re-run the failed migration
 */

const knex = require('knex');
const knexConfig = require('./knexfile');

const db = knex(knexConfig.development);

async function fixMigration() {
  try {
    console.log('Rolling back the failed migration...');
    await db.migrate.rollback();
    
    console.log('\nRunning migrations again...');
    await db.migrate.latest();
    
    console.log('\n✅ Migration fixed successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await db.destroy();
  }
}

fixMigration();
