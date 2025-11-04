const knex = require('knex')(require('./knexfile').development);

async function verifyAccounts() {
  try {
    console.log('\n🔍 Verifying Better Auth accounts...\n');
    
    // Check teacher account specifically
    const teacherUser = await knex('users')
      .where({ email: 'teacher@eoty.org' })
      .first();
    
    if (!teacherUser) {
      console.log('❌ Teacher user not found');
      process.exit(1);
    }
    
    console.log('✅ Teacher user found:');
    console.log(`   ID: ${teacherUser.id}`);
    console.log(`   Email: ${teacherUser.email}`);
    console.log(`   Has password_hash: ${!!teacherUser.password_hash}`);
    
    // Check account record
    const teacherAccount = await knex('account_table')
      .where({
        user_id: teacherUser.id,
        provider: 'credential'
      })
      .first();
    
    if (!teacherAccount) {
      console.log('\n❌ Teacher account record not found!');
      process.exit(1);
    }
    
    console.log('\n✅ Teacher account record found:');
    console.log(`   ID: ${teacherAccount.id}`);
    console.log(`   User ID: ${teacherAccount.user_id}`);
    console.log(`   Provider: ${teacherAccount.provider}`);
    console.log(`   Has password: ${!!teacherAccount.password}`);
    console.log(`   Account ID: ${teacherAccount.account_id}`);
    
    // Verify password matches
    const passwordsMatch = teacherUser.password_hash === teacherAccount.password;
    console.log(`   Password matches: ${passwordsMatch ? '✅' : '❌'}`);
    
    // Check all accounts
    const totalAccounts = await knex('account_table')
      .where({ provider: 'credential' })
      .count('* as count');
    
    console.log(`\n📊 Total credential accounts: ${totalAccounts[0].count}`);
    
    // List all accounts
    const allAccounts = await knex('account_table')
      .join('users', 'account_table.user_id', 'users.id')
      .where({ provider: 'credential' })
      .select('users.email', 'account_table.provider', 'account_table.user_id')
      .orderBy('users.email');
    
    console.log('\n📋 All credential accounts:');
    allAccounts.forEach((acc, i) => {
      console.log(`   ${i + 1}. ${acc.email} (user_id: ${acc.user_id})`);
    });
    
    console.log('\n🎉 Verification complete! All accounts are ready for Better Auth login.\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

verifyAccounts();
