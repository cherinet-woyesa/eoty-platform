const knex = require('knex')(require('./knexfile').development);

async function listUsers() {
  try {
    const users = await knex('users')
      .select('id', 'email', 'name', 'first_name', 'last_name', 'role', 'is_active', 'email_verified')
      .orderBy('id');
    
    console.log('\n📋 Available Users for Testing:\n');
    console.log('═'.repeat(80));
    
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. User ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'N/A'}`);
      console.log(`   Role: ${user.role || 'N/A'}`);
      console.log(`   Active: ${user.is_active ? '✅' : '❌'}`);
      console.log(`   Email Verified: ${user.email_verified ? '✅' : '❌'}`);
    });
    
    console.log('\n' + '═'.repeat(80));
    console.log(`\n📊 Total Users: ${users.length}`);
    console.log('\n💡 Test Credentials:');
    console.log('   You can try logging in with any of the emails above.');
    console.log('   If you need to reset a password, use the forgot password flow.\n');
    
    // Check if any users have password hashes
    const usersWithPasswords = await knex('users')
      .whereNotNull('password_hash')
      .count('* as count');
    
    console.log(`🔐 Users with passwords: ${usersWithPasswords[0].count}`);
    
    // Show a sample user for testing
    const testUser = users.find(u => u.is_active && u.email);
    if (testUser) {
      console.log('\n🎯 Recommended test user:');
      console.log(`   Email: ${testUser.email}`);
      console.log(`   (You may need to reset the password if you don't know it)`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

listUsers();
