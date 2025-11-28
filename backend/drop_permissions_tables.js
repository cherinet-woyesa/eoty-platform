const db = require('./config/database');

async function dropTables() {
  try {
    console.log('Dropping permissions tables...');
    await db.schema.dropTableIfExists('role_permissions');
    await db.schema.dropTableIfExists('user_permissions');
    await db.schema.dropTableIfExists('roles');
    console.log('Dropped permissions tables');
    
    console.log('Removing migration record...');
    await db('knex_migrations')
      .where('name', 'like', '%20251122000001_create_permissions_tables.js%')
      .del();
    console.log('Removed migration record');
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

dropTables();
