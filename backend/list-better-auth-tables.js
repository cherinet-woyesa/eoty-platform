const knex = require('knex')(require('./knexfile').development);

async function listBetterAuthTables() {
  try {
    console.log('\n🔍 Listing all tables and views...\n');
    
    // Get all tables
    const tables = await knex.raw(`
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND (table_name LIKE '%user%' OR table_name LIKE '%account%' OR table_name LIKE '%session%')
      ORDER BY table_type, table_name
    `);
    
    console.log('Tables and Views related to auth:');
    console.log('='.repeat(60));
    tables.rows.forEach(t => {
      console.log(`${t.table_type.padEnd(15)} ${t.table_name}`);
    });
    console.log('='.repeat(60));
    
    // Check if Better Auth created its own tables
    console.log('\n🔍 Checking for Better Auth default tables...');
    const betterAuthTables = ['user', 'account', 'session', 'verification'];
    
    for (const tableName of betterAuthTables) {
      const exists = await knex.schema.hasTable(tableName);
      const type = exists ? (tables.rows.find(t => t.table_name === tableName)?.table_type || 'UNKNOWN') : 'NOT FOUND';
      console.log(`   ${tableName.padEnd(15)} ${type}`);
    }
    
    // Check record counts
    console.log('\n📊 Record counts:');
    console.log('='.repeat(60));
    
    try {
      const userCount = await knex('user').count('* as count');
      console.log(`   user view:        ${userCount[0].count} records`);
    } catch (e) {
      console.log(`   user view:        ERROR - ${e.message}`);
    }
    
    try {
      const accountCount = await knex('account').count('* as count');
      console.log(`   account view:     ${accountCount[0].count} records`);
    } catch (e) {
      console.log(`   account view:     ERROR - ${e.message}`);
    }
    
    try {
      const accountTableCount = await knex('account_table').count('* as count');
      console.log(`   account_table:    ${accountTableCount[0].count} records`);
    } catch (e) {
      console.log(`   account_table:    ERROR - ${e.message}`);
    }
    
    console.log('='.repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

listBetterAuthTables();
