const db = require('./config/database');

async function checkPermission() {
  try {
    const role = 'teacher';
    const permission = 'teacher:students:view';

    console.log(`Checking if role '${role}' has permission '${permission}'...`);

    const hasPermission = await db('role_permissions as rp')
      .join('user_permissions as up', 'rp.permission_id', 'up.id')
      .where('rp.role', role)
      .andWhere('up.permission_key', permission)
      .first();

    if (hasPermission) {
      console.log(`✅ Role '${role}' HAS permission '${permission}'`);
    } else {
      console.log(`❌ Role '${role}' does NOT have permission '${permission}'`);
      
      // Check if permission exists at all
      const permExists = await db('user_permissions').where('permission_key', permission).first();
      if (permExists) {
          console.log(`ℹ️ Permission '${permission}' exists in user_permissions table (ID: ${permExists.id})`);
          
          // Add the permission to the role
          console.log(`Adding permission '${permission}' to role '${role}'...`);
          await db('role_permissions').insert({
            role: role,
            permission_id: permExists.id
          });
          console.log(`✅ Permission added successfully!`);
      } else {
          console.log(`⚠️ Permission '${permission}' does NOT exist in user_permissions table`);
          
          // Create the permission and add it
          console.log(`Creating permission '${permission}'...`);
          const [newPerm] = await db('user_permissions').insert({
            permission_key: permission,
            name: 'View Students',
            description: 'View students enrolled in teacher courses'
          }).returning('id');
          
          console.log(`Permission created with ID: ${newPerm.id}`);
          
          console.log(`Adding permission '${permission}' to role '${role}'...`);
          await db('role_permissions').insert({
            role: role,
            permission_id: newPerm.id
          });
          console.log(`✅ Permission created and added successfully!`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkPermission();
