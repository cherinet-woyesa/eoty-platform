const knex = require('knex')(require('./knexfile').development);

async function verifyMigration() {
  try {
    // Check users table
    const userIdType = await knex.raw(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'id'
    `);
    console.log('✅ Users.id type:', userIdType.rows[0].data_type);
    
    // Check a few foreign key tables
    const tables = ['account_table', 'session_table', 'courses', 'user_roles'];
    for (const table of tables) {
      const fkType = await knex.raw(`
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = '${table}' AND column_name LIKE '%user_id%' OR column_name LIKE '%created_by%'
        LIMIT 1
      `);
      if (fkType.rows[0]) {
        console.log(`✅ ${table} foreign key type:`, fkType.rows[0].data_type);
      }
    }
    
    // Check views exist
    const views = await knex.raw(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' AND table_name IN ('user', 'account', 'session')
    `);
    console.log('\n✅ Views created:', views.rows.map(r => r.table_name).join(', '));
    
    // Test a sample user
    const users = await knex('users').select('id', 'email').limit(1);
    if (users.length > 0) {
      console.log('\n✅ Sample user ID:', users[0].id, '(type:', typeof users[0].id, ')');
    }
    
    console.log('\n🎉 Migration verification complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyMigration();
