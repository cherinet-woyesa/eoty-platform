const bcrypt = require('bcryptjs');
const { Kysely, PostgresDialect } = require("kysely");
const { Pool } = require("pg");

require('dotenv').config();

const pgPool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD),
  database: process.env.DB_NAME,
});

const db = new Kysely({
  dialect: new PostgresDialect({
    pool: pgPool,
  }),
});

async function testPasswordComparison() {
  try {
    const email = 'teacher@eoty.org';
    const password = 'Teacher123!';
    
    console.log('\n🔍 Testing password comparison (Better Auth flow)...\n');
    
    // Step 1: Find user
    console.log('Step 1: Finding user...');
    const user = await db
      .selectFrom('user')
      .selectAll()
      .where('email', '=', email)
      .executeTakeFirst();
    
    if (!user) {
      console.log('❌ User not found');
      await pgPool.end();
      process.exit(1);
    }
    
    console.log(`✅ User found: ${user.email} (ID: ${user.id})`);
    
    // Step 2: Find account with credential provider
    console.log('\nStep 2: Finding credential account...');
    const account = await db
      .selectFrom('account')
      .selectAll()
      .where('userId', '=', user.id)
      .where('provider', '=', 'credential')
      .executeTakeFirst();
    
    if (!account) {
      console.log('❌ Credential account not found');
      console.log(`   Searched for: userId=${user.id}, provider=credential`);
      await pgPool.end();
      process.exit(1);
    }
    
    console.log(`✅ Account found: ${account.id}`);
    console.log(`   Provider: ${account.provider}`);
    console.log(`   Has password field: ${!!account.password}`);
    console.log(`   Password hash: ${account.password?.substring(0, 30)}...`);
    
    // Step 3: Compare password
    console.log('\nStep 3: Comparing password...');
    if (!account.password) {
      console.log('❌ No password in account!');
      await pgPool.end();
      process.exit(1);
    }
    
    const passwordMatch = await bcrypt.compare(password, account.password);
    
    if (passwordMatch) {
      console.log('✅ Password matches!');
      console.log('\n🎉 Authentication would succeed!');
      console.log('   Better Auth should work with this account.\n');
    } else {
      console.log('❌ Password does NOT match!');
      console.log('\n   This is the problem - the password hash is wrong.');
      console.log('   Need to reset the password.\n');
    }
    
    await pgPool.end();
    process.exit(passwordMatch ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    await pgPool.end();
    process.exit(1);
  }
}

testPasswordComparison();
