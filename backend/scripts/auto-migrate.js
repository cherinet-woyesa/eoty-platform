#!/usr/bin/env node
const knex = require('knex');
const config = require('../knexfile');

async function runMigrations() {
  console.log('🔄 Starting auto-migration...');
  
  const db = knex(config.production);
  
  try {
    // Run migrations
    console.log('📊 Running database migrations...');
    await db.migrate.latest();
    console.log('✅ Migrations completed successfully');
    
    // Run seeds
    console.log('🌱 Running database seeds...');
    await db.seed.run();
    console.log('✅ Seeds completed successfully');
    
    console.log('🎉 Database setup complete!');
  } catch (error) {
    console.error('❌ Migration/Seed error:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  runMigrations();
}

module.exports = runMigrations;
