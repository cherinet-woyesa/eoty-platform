const db = require('./config/database');

async function listAllPermissions() {
  try {
    console.log('Listing all permissions...');

    const permissions = await db('user_permissions').select('*');
    console.log('Permissions:', permissions);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

listAllPermissions();
