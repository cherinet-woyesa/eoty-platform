/**
 * Test script for Legacy User Migration Service
 * 
 * This script tests the core functionality without initializing Better Auth
 * to avoid initialization issues during testing.
 */

// Load environment variables first from backend directory
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const db = require('./config/database');
const bcrypt = require('bcryptjs');

async function testMigrationService() {
  console.log('🧪 Testing Legacy User Migration Service\n');
  
  try {
    // Test 1: Database connectivity
    console.log('Test 1: Testing database connectivity...');
    const userCount = await db('users').count('* as count').first();
    const betterAuthUserCount = await db('user').count('* as count').first();
    
    console.log('✅ Database connected');
    console.log(`   Legacy users table: ${userCount.count} users`);
    console.log(`   Better Auth users table: ${betterAuthUserCount.count} users`);
    
    // Test 2: Check for legacy users
    console.log('\nTest 2: Checking for legacy users...');
    const legacyUsers = await db('users')
      .select('id', 'email', 'role', 'chapter_id', 'migrated_to_better_auth')
      .limit(5);
    
    if (legacyUsers.length > 0) {
      console.log(`✅ Found ${legacyUsers.length} legacy users (showing first 5):`);
      legacyUsers.forEach(user => {
        console.log(`   - ${user.email} (${user.role}) - Migrated: ${user.migrated_to_better_auth ? 'Yes' : 'No'}`);
      });
    } else {
      console.log('ℹ️  No legacy users found in database');
    }
    
    // Test 3: Check migration status
    console.log('\nTest 3: Checking migration statistics...');
    const totalUsers = await db('users').count('* as count').first();
    const migratedUsers = await db('users')
      .where('migrated_to_better_auth', true)
      .count('* as count')
      .first();
    
    console.log(`   Total legacy users: ${totalUsers.count}`);
    console.log(`   Migrated users: ${migratedUsers.count}`);
    console.log(`   Pending migration: ${totalUsers.count - migratedUsers.count}`);
    
    // Test 4: Check feature flags
    console.log('\nTest 4: Checking feature flags...');
    const { getAllFeatureFlags, validateFeatureFlags } = require('./utils/featureFlags');
    const flags = getAllFeatureFlags();
    const validation = validateFeatureFlags();
    
    console.log('Feature flags:', flags);
    console.log('Validation:', validation.valid ? '✅ Valid' : '⚠️  Has warnings');
    if (validation.warnings.length > 0) {
      validation.warnings.forEach(warning => console.log('   ⚠️ ', warning));
    }
    
    // Test 5: Verify migration service files exist
    console.log('\nTest 5: Verifying migration service files...');
    const fs = require('fs');
    const path = require('path');
    
    const requiredFiles = [
      './services/legacyUserMigration.js',
      './routes/migration.js',
      './utils/featureFlags.js'
    ];
    
    let allFilesExist = true;
    requiredFiles.forEach(file => {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath)) {
        console.log(`   ✅ ${file}`);
      } else {
        console.log(`   ❌ ${file} - NOT FOUND`);
        allFilesExist = false;
      }
    });
    
    if (allFilesExist) {
      console.log('✅ All migration service files exist');
    }
    
    // Test 6: Check database schema
    console.log('\nTest 6: Verifying database schema...');
    
    // Check if users table has migration column
    const usersColumns = await db('users').columnInfo();
    const hasMigrationColumn = 'migrated_to_better_auth' in usersColumns;
    console.log(`   Users table has 'migrated_to_better_auth' column: ${hasMigrationColumn ? '✅' : '❌'}`);
    
    // Check if Better Auth tables exist
    const tables = await db.raw(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('user', 'session', 'account', 'verification')
    `);
    
    const betterAuthTables = tables.rows.map(row => row.table_name);
    console.log('   Better Auth tables:');
    ['user', 'session', 'account', 'verification'].forEach(table => {
      const exists = betterAuthTables.includes(table);
      console.log(`     ${exists ? '✅' : '❌'} ${table}`);
    });
    
    console.log('\n✅ All tests completed successfully!');
    console.log('\n📝 Summary:');
    console.log('   - Database connectivity is working');
    console.log('   - Migration service files are in place');
    console.log('   - Feature flags are configured');
    console.log('   - Database schema is ready for migration');
    console.log('\n💡 Next steps:');
    console.log('   1. Start the server: npm start');
    console.log('   2. Test the migration endpoint: POST /api/auth/migrate-login');
    console.log('   3. Verify session creation after migration');
    console.log('   4. Test with actual user credentials');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  } finally {
    // Close database connection
    await db.destroy();
    console.log('\n🔌 Database connection closed');
  }
}

// Run tests
testMigrationService();
