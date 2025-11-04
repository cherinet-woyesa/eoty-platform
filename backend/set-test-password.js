const knex = require('knex')(require('./knexfile').development);
const bcrypt = require('bcryptjs');

async function setTestPassword() {
  try {
    const email = process.argv[2] || 'student@eoty.org';
    const password = process.argv[3] || 'Test123!';
    
    console.log(`\n🔐 Setting test password for: ${email}`);
    
    // Check if user exists
    const user = await knex('users').where({ email }).first();
    
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      console.log('\n📋 Available users:');
      const users = await knex('users').select('email').orderBy('id');
      users.forEach(u => console.log(`   - ${u.email}`));
      process.exit(1);
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update the user
    await knex('users')
      .where({ email })
      .update({
        password_hash: hashedPassword,
        updated_at: knex.fn.now()
      });
    
    console.log('✅ Password updated successfully!\n');
    console.log('📝 Test Credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Name: ${user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim()}`);
    
    console.log('\n🧪 You can now test login with these credentials!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setTestPassword();
