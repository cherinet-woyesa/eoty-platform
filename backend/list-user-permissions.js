const db = require('./config/database');

async function listUserPermissions() {
  try {
    console.log('Listing permissions for role: user');

    const permissions = await db('role_permissions as rp')
      .join('user_permissions as up', 'rp.permission_id', 'up.id')
      .where('rp.role', 'user')
      .select('up.permission_key');

    console.log('Permissions:', permissions.map(p => p.permission_key));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

listUserPermissions();
