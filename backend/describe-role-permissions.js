const db = require('./config/database');

async function describeRolePermissions() {
  try {
    const columns = await db('role_permissions').columnInfo();
    console.log('role_permissions columns:', columns);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

describeRolePermissions();
