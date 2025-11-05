/**
 * Script to fix corrupted migration records in the database
 * This removes records of migrations that no longer exist as files
 * Run with: node fix-migrations.js
 */

require('dotenv').config();
const db = require('./config/database');

async function fixMigrations() {
  try {
    console.log('🔍 Checking migration records in database...\n');

    // Get all migration records from database
    const dbMigrations = await db('knex_migrations')
      .select('*')
      .orderBy('id');

    console.log(`Found ${dbMigrations.length} migration records in database:\n`);
    
    // List of missing migrations that need to be removed
    const missingMigrations = [
      '017_better_auth_setup.js',
      '018_modify_users_for_better_auth.js',
      '019_add_name_column_to_users.js',
      '020_create_user_view.js',
      '021_create_account_session_views.js',
      '022_rename_views_for_better_auth.js',
      '023_add_user_insert_trigger.js',
      '024_convert_all_user_ids_to_text.js',
      '026_add_password_to_account_table.js',
      '027_add_email_to_account_view.js'
    ];

    // Find which ones exist in the database
    const orphanedRecords = dbMigrations.filter(m => 
      missingMigrations.includes(m.name)
    );

    if (orphanedRecords.length === 0) {
      console.log('✅ No orphaned migration records found!');
      process.exit(0);
    }

    console.log(`❌ Found ${orphanedRecords.length} orphaned migration records:\n`);
    orphanedRecords.forEach(record => {
      console.log(`   - ${record.name} (batch: ${record.batch})`);
    });

    console.log('\n🗑️  Removing orphaned migration records...\n');

    // Delete the orphaned records
    for (const record of orphanedRecords) {
      await db('knex_migrations')
        .where({ name: record.name })
        .delete();
      console.log(`   ✅ Removed: ${record.name}`);
    }

    console.log('\n✅ Migration records cleaned up successfully!');
    console.log('\nYou can now run: npx knex migrate:latest');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixMigrations();
