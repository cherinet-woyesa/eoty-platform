const knex = require('knex')(require('./knexfile').development);

async function testBetterAuthQuery() {
  try {
    const email = 'teacher@eoty.org';
    
    console.log(`\n🔍 Testing Better Auth query for: ${email}\n`);
    
    // Step 1: Find user by email (what Better Auth does first)
    console.log('Step 1: Finding user by email...');
    const user = await knex('user')
      .where({ email })
      .first();
    
    if (!user) {
      console.log('❌ User not found in user view!');
      process.exit(1);
    }
    
    console.log('✅ User found:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    
    // Step 2: Find account by user_id and provider (what Better Auth does next)
    console.log('\nStep 2: Finding account by userId and provider...');
    const account = await knex('account')
      .where({
        userId: user.id,
        provider: 'credential'
      })
      .first();
    
    if (!account) {
      console.log('❌ Account not found in account view!');
      console.log('\nDebugging: Checking account_table directly...');
      
      const directAccount = await knex('account_table')
        .where({
          user_id: user.id,
          provider: 'credential'
        })
        .first();
      
      if (directAccount) {
        console.log('✅ Account EXISTS in account_table but NOT in account view!');
        console.log('   This means the view is not working correctly.');
        console.log('\n   Account in table:');
        console.log(`   - ID: ${directAccount.id}`);
        console.log(`   - User ID: ${directAccount.user_id}`);
        console.log(`   - Provider: ${directAccount.provider}`);
        console.log(`   - Has password: ${!!directAccount.password}`);
      } else {
        console.log('❌ Account not found in account_table either!');
      }
      
      process.exit(1);
    }
    
    console.log('✅ Account found:');
    console.log(`   ID: ${account.id}`);
    console.log(`   User ID: ${account.userId}`);
    console.log(`   Provider: ${account.provider}`);
    console.log(`   Has password: ${!!account.password}`);
    console.log(`   Password hash: ${account.password?.substring(0, 20)}...`);
    
    // Step 3: Verify password format
    console.log('\nStep 3: Verifying password format...');
    if (account.password && account.password.startsWith('$2')) {
      console.log('✅ Password is in bcrypt format');
    } else {
      console.log('❌ Password format looks wrong');
    }
    
    console.log('\n🎉 Better Auth query simulation successful!');
    console.log('   All data is accessible and in correct format.\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testBetterAuthQuery();
