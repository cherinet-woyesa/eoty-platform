// Verification script for Better Auth database schema
const knex = require('knex')(require('./knexfile').development);

async function verifySchema() {
  try {
    console.log('🔍 Verifying Better Auth database schema...\n');

    // Check Better Auth tables exist
    const tables = ['session', 'account', 'verification'];
    for (const table of tables) {
      const exists = await knex.schema.hasTable(table);
      if (exists) {
        console.log(`✅ Table '${table}' exists`);
      } else {
        console.log(`❌ Table '${table}' does NOT exist`);
      }
    }

    console.log('\n🔍 Verifying indexes on session table...');
    const sessionIndexes = await knex.raw(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'session'
    `);
    console.log('Session indexes:', sessionIndexes.rows.length);
    sessionIndexes.rows.forEach(idx => {
      console.log(`  - ${idx.indexname}`);
    });

    console.log('\n🔍 Verifying indexes on account table...');
    const accountIndexes = await knex.raw(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'account'
    `);
    console.log('Account indexes:', accountIndexes.rows.length);
    accountIndexes.rows.forEach(idx => {
      console.log(`  - ${idx.indexname}`);
    });

    console.log('\n🔍 Verifying users table columns...');
    const userColumns = ['email_verified', 'two_factor_enabled', 'two_factor_secret', 'migrated_to_better_auth'];
    for (const column of userColumns) {
      const exists = await knex.schema.hasColumn('users', column);
      if (exists) {
        console.log(`✅ Column 'users.${column}' exists`);
      } else {
        console.log(`❌ Column 'users.${column}' does NOT exist`);
      }
    }

    console.log('\n🔍 Checking existing user data integrity...');
    const userCount = await knex('users').count('* as count').first();
    console.log(`Total users in database: ${userCount.count}`);

    const activeUsers = await knex('users').where('is_active', true).count('* as count').first();
    console.log(`Active users: ${activeUsers.count}`);

    console.log('\n✅ Schema verification complete!');
    
  } catch (error) {
    console.error('❌ Error during verification:', error.message);
    process.exit(1);
  } finally {
    await knex.destroy();
  }
}

verifySchema();
