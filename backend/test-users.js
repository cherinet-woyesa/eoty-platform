const db = require('./config/database');

async function checkUsers() {
  try {
    console.log('Querying users table...');
    const users = await db('users').select('id', 'email', 'role', 'password_hash');
    console.log('Users found in database:');
    console.table(users);
  } catch (error) {
    console.error('Error querying users:', error);
  } finally {
    db.destroy();
  }
}

checkUsers();
