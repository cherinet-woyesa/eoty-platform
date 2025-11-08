const knex = require('./knexfile');
const db = require('knex')(knex.development);

async function checkUsersTable() {
  try {
    const result = await db('information_schema.columns')
      .where({ table_name: 'users', column_name: 'id' })
      .select('data_type', 'udt_name');
    
    console.log('Users table ID column type:', result[0]);
    
    await db.destroy();
  } catch (error) {
    console.error('Error:', error.message);
    await db.destroy();
  }
}

checkUsersTable();
