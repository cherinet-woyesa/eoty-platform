const db = require('./config/database');

async function checkPermission() {
  try {
    const role = 'teacher';
    const permission = 'teacher:students:view';

    console.log(`Checking if role '${role}' has permission '${permission}'...`);

    const hasPermission = await db('role_permissions')
      .join('permissions', 'role_permissions.permission_id', 'permissions.id')
      .where('role_permissions.role', role)
      .andWhere('permissions.slug', permission)
      .first();

    if (hasPermission) {
      console.log(`✅ Role '${role}' HAS permission '${permission}'`);
    } else {
      console.log(`❌ Role '${role}' does NOT have permission '${permission}'`);
      
      // Check if permission exists at all
      const permExists = await db('permissions').where('slug', permission).first();
      if (permExists) {
          console.log(`ℹ️ Permission '${permission}' exists in permissions table (ID: ${permExists.id})`);
      } else {
          console.log(`⚠️ Permission '${permission}' does NOT exist in permissions table`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkPermission();
