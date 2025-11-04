const knex = require('knex')(require('./knexfile').development);
const crypto = require('crypto');

/**
 * Create Better Auth account records for existing users
 * Better Auth expects credentials in the 'account' table, not directly in 'user' table
 */
async function createBetterAuthAccounts() {
  try {
    console.log('\n🔄 Creating Better Auth account records for existing users...\n');
    
    // Get all users with password hashes
    const users = await knex('users')
      .whereNotNull('password_hash')
      .select('id', 'email', 'password_hash');
    
    console.log(`📊 Found ${users.length} users with passwords\n`);
    
    let created = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const user of users) {
      try {
        // Check if account already exists
        const existingAccount = await knex('account_table')
          .where({
            user_id: user.id,
            provider: 'credential'
          })
          .first();
        
        if (existingAccount) {
          console.log(`⏭️  Skipped ${user.email} - account already exists`);
          skipped++;
          continue;
        }
        
        // Generate a unique account ID
        const accountId = crypto.randomBytes(16).toString('hex');
        
        // Create account record for Better Auth
        // Better Auth stores the password hash in the account table
        await knex('account_table').insert({
          id: crypto.randomBytes(16).toString('hex'),
          user_id: user.id,
          account_id: accountId,
          provider: 'credential', // This tells Better Auth it's email/password auth
          password: user.password_hash, // Better Auth expects 'password' column
          created_at: knex.fn.now(),
          updated_at: knex.fn.now()
        });
        
        console.log(`✅ Created account for ${user.email}`);
        created++;
      } catch (error) {
        console.error(`❌ Error creating account for ${user.email}:`, error.message);
        errors++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log('='.repeat(60));
    
    if (created > 0) {
      console.log('\n🎉 Better Auth accounts created successfully!');
      console.log('   Users can now login with Better Auth\n');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

createBetterAuthAccounts();
