const knex = require('knex');
const knexConfig = require('./knexfile');

const db = knex(knexConfig.development);

async function listUsers() {
  try {
    const users = await db('users')
      .select('id', 'email', 'role', 'first_name', 'last_name', 'is_active')
      .orderBy('id');
    
    console.log('\n📋 Current users in database:\n');
    console.table(users);
    
    if (users.length === 0) {
      console.log('⚠️  No users found in database!\n');
    }
    
  } catch (error) {
    console.error('Error listing users:', error.message);
  } finally {
    await db.destroy();
  }
}

listUsers();
