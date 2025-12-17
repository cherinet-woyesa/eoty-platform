const knex = require('knex')(require('./knexfile').development);

async function checkUsers() {
  try {
    const users = await knex('users').select('id', 'email', 'role', 'chapter_id').orderBy('id');
    console.log('Users:', users);
    console.log('Total users:', users.length);
  } catch (error) {
    console.error('Error checking users:', error);
  } finally {
    process.exit(0);
  }
}

checkUsers();
