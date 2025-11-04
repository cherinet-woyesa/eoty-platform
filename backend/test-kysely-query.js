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

async function testKyselyQuery() {
  try {
    console.log('\n🔍 Testing Kysely queries (what Better Auth uses)...\n');
    
    const email = 'teacher@eoty.org';
    
    // Test 1: Query user table/view
    console.log('Test 1: Querying "user" (view)...');
    const user = await db
      .selectFrom('user')
      .selectAll()
      .where('email', '=', email)
      .executeTakeFirst();
    
    if (!user) {
      console.log('❌ User not found!');
      process.exit(1);
    }
    
    console.log('✅ User found:');
    console.log(`   ID: ${user.id} (type: ${typeof user.id})`);
    console.log(`   Email: ${user.email}`);
    
    // Test 2: Query account table/view
    console.log('\nTest 2: Querying "account" (view)...');
    const account = await db
      .selectFrom('account')
      .selectAll()
      .where('userId', '=', user.id)
      .where('provider', '=', 'credential')
      .executeTakeFirst();
    
    if (!account) {
      console.log('❌ Account not found!');
      console.log(`   Searched for: userId=${user.id}, provider=credential`);
      
      // Debug: Check what accounts exist
      console.log('\nDebug: Checking all accounts...');
      const allAccounts = await db
        .selectFrom('account')
        .select(['id', 'userId', 'provider'])
        .execute();
      
      console.log(`   Total accounts: ${allAccounts.length}`);
      allAccounts.slice(0, 5).forEach((acc, i) => {
        console.log(`   ${i + 1}. userId=${acc.userId}, provider=${acc.provider}`);
      });
      
      process.exit(1);
    }
    
    console.log('✅ Account found:');
    console.log(`   ID: ${account.id}`);
    console.log(`   User ID: ${account.userId}`);
    console.log(`   Provider: ${account.provider}`);
    console.log(`   Has password: ${!!account.password}`);
    
    console.log('\n🎉 Kysely queries work correctly!');
    console.log('   Better Auth should be able to find the account.\n');
    
    await pgPool.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    await pgPool.end();
    process.exit(1);
  }
}

testKyselyQuery();
