const knex = require('knex')(require('./knexfile').development);
const bcrypt = require('bcryptjs');

async function testLogin() {
  try {
    const email = process.argv[2] || 'student@eoty.org';
    const password = process.argv[3] || 'Test123!';
    
    console.log(`\n🔐 Testing login for: ${email}\n`);
    
    // Fetch user
    const user = await knex('users')
      .where({ email })
      .first();
    
    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }
    
    console.log('✅ User found in database');
    console.log(`   ID: ${user.id} (type: ${typeof user.id})`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Active: ${user.is_active ? '✅' : '❌'}`);
    console.log(`   Email Verified: ${user.email_verified ? '✅' : '❌'}`);
    
    // Check password
    if (!user.password_hash) {
      console.log('\n❌ No password set for this user');
      console.log('   Run: node backend/set-test-password.js', email, '<password>');
      process.exit(1);
    }
    
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    
    if (passwordMatch) {
      console.log('\n✅ Password verification: SUCCESS');
      console.log('\n🎉 Login test PASSED!');
      console.log('\n📝 User can login with:');
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
    } else {
      console.log('\n❌ Password verification: FAILED');
      console.log('   The password does not match');
    }
    
    // Check Better Auth compatibility
    console.log('\n🔍 Better Auth Compatibility Check:');
    console.log(`   ✅ User ID is text: ${typeof user.id === 'string'}`);
    console.log(`   ✅ Has email: ${!!user.email}`);
    console.log(`   ✅ Has password_hash: ${!!user.password_hash}`);
    console.log(`   ✅ Has name: ${!!user.name}`);
    
    // Check if user has any sessions
    const sessions = await knex('session_table')
      .where({ user_id: user.id })
      .count('* as count');
    
    console.log(`\n📊 Active sessions: ${sessions[0].count}`);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testLogin();
