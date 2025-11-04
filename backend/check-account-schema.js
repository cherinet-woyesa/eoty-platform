const knex = require('knex')(require('./knexfile').development);

async function checkAccountSchema() {
  try {
    console.log('\n🔍 Checking account_table schema...\n');
    
    // Get column information
    const columns = await knex.raw(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'account_table'
      ORDER BY ordinal_position
    `);
    
    console.log('Columns in account_table:');
    console.log('='.repeat(80));
    columns.rows.forEach(col => {
      console.log(`${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    console.log('='.repeat(80));
    
    // Check existing accounts
    const accounts = await knex('account_table').select('*').limit(3);
    console.log(`\n📊 Sample accounts (${accounts.length}):`);
    accounts.forEach((acc, i) => {
      console.log(`\n${i + 1}.`, JSON.stringify(acc, null, 2));
    });
    
    // Check account view
    console.log('\n🔍 Checking account view...');
    const viewColumns = await knex.raw(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'account'
      ORDER BY ordinal_position
    `);
    
    console.log('\nColumns in account view:');
    console.log('='.repeat(80));
    viewColumns.rows.forEach(col => {
      console.log(`${col.column_name.padEnd(25)} ${col.data_type}`);
    });
    console.log('='.repeat(80));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAccountSchema();
