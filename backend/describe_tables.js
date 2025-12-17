const db = require('./config/database');

async function describeTables() {
  try {
    console.log('Checking users table columns...');
    const usersColumns = await db('users').columnInfo();
    console.log('Users columns:', Object.keys(usersColumns));

    console.log('\nChecking teachers table columns...');
    const teachersColumns = await db('teachers').columnInfo();
    console.log('Teachers columns:', Object.keys(teachersColumns));

  } catch (error) {
    console.error('Error describing tables:', error);
  } finally {
    process.exit();
  }
}

describeTables();
