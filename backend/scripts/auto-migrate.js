#!/usr/bin/env node
const knex = require('knex');
const config = require('../knexfile');

// Set timeout to prevent hanging (5 minutes max)
const MIGRATION_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// Retry database connection with exponential backoff
async function waitForDatabase(db, maxRetries = 5, delay = 2000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await db.raw('SELECT 1');
      console.log('✅ Database connection established');
      return true;
    } catch (error) {
      if (i < maxRetries - 1) {
        console.log(`⏳ Waiting for database... (attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 1.5; // Exponential backoff
      } else {
        console.error('❌ Could not connect to database after', maxRetries, 'attempts');
        throw error;
      }
    }
  }
}

async function runMigrations() {
  console.log('🔄 Starting auto-migration...');
  
  // Determine environment
  const env = process.env.NODE_ENV || 'production';
  const dbConfig = config[env] || config.production;
  
  const db = knex(dbConfig);
  
  let migrationTimeout;
  
  try {
    // Wait for database to be ready
    await waitForDatabase(db);
    
    // Set overall timeout for migrations
    const migrationPromise = (async () => {
      // Run migrations
      console.log('📊 Running database migrations...');
      await db.migrate.latest();
      console.log('✅ Migrations completed successfully');
      
      // Skip seeds in production to avoid timeout issues
      // Seeds should be run manually or via a separate script
      if (env !== 'production') {
        console.log('🌱 Running database seeds...');
        await db.seed.run();
        console.log('✅ Seeds completed successfully');
      } else {
        console.log('⏭️  Skipping seeds in production (run manually if needed)');
      }
      
      console.log('🎉 Database setup complete!');
    })();
    
    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      migrationTimeout = setTimeout(() => {
        reject(new Error('Migration timeout: Process took longer than 5 minutes'));
      }, MIGRATION_TIMEOUT);
    });
    
    // Race between migration and timeout
    await Promise.race([migrationPromise, timeoutPromise]);
    
    // Clear timeout if migration completed
    clearTimeout(migrationTimeout);
    
  } catch (error) {
    // Clear timeout on error
    if (migrationTimeout) {
      clearTimeout(migrationTimeout);
    }
    
    console.error('❌ Migration/Seed error:', error.message);
    console.error('Stack:', error.stack);
    
    // Don't exit on migration errors - let the server start anyway
    // This prevents deployment failures if migrations are already up to date
    if (error.message.includes('timeout')) {
      console.error('⚠️  Migration timed out, but continuing with server start...');
    } else if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      console.error('⚠️  Migration conflict detected, but continuing with server start...');
    } else {
      console.error('⚠️  Migration error occurred, but continuing with server start...');
      console.error('⚠️  Please check database connection and migration status manually');
    }
  } finally {
    try {
      await db.destroy();
    } catch (destroyError) {
      console.error('⚠️  Error closing database connection:', destroyError.message);
    }
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  runMigrations().catch((error) => {
    console.error('Fatal error in migration script:', error);
    // Don't exit - let the server try to start anyway
    process.exit(0);
  });
}

module.exports = runMigrations;
