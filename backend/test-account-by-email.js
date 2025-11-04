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

async function testAccountByEmail() {
  try {
    const email = 'teacher@eoty.org';
    
    console.log('\n🔍 Testing account lookup by email (Better Auth credential flow)...\n');
    
    // This is how Better Auth looks up credential accounts
    console.log(`Searching for credential account with email: ${email}`);
    const account = await db
      .selectFrom('account')
      .selectAll()
      .where('email', '=', email)
      .where('provider', '=', 'credential')
      .executeTakeFirst();
    
    if (!account) {
      console.log('❌ Account not found by email!');
      console.log('\nThis means Better Auth will fail to authenticate.');
      await pgPool.end();
      process.exit(1);
    }
    
    console.log('✅ Account found by email!');
    console.log(`   ID: ${account.id}`);
    console.log(`   Email: ${account.email}`);
    console.log(`   User ID: ${account.userId}`);
    console.log(`   Provider: ${account.provider}`);
    console.log(`   Has password: ${!!account.password}`);
    console.log(`   Password hash: ${account.password?.substring(0, 30)}...`);
    
    console.log('\n🎉 Better Auth should now be able to authenticate!');
    console.log('   The account can be found by email with credential provider.\n');
    
    await pgPool.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    await pgPool.end();
    process.exit(1);
  }
}

testAccountByEmail();
