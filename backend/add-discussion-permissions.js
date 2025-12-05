const db = require('./config/database');

async function addDiscussionPermissions() {
  try {
    console.log('Adding discussion permissions...');

    // 1. Check if permission exists, if not create it
    let permission = await db('user_permissions')
      .where({ permission_key: 'discussion:create' })
      .first();

    if (!permission) {
      console.log('Creating discussion:create permission...');
      const result = await db('user_permissions').insert({
        permission_key: 'discussion:create',
        name: 'Create Discussions',
        description: 'Create new discussions and topics',
        category: 'forum',
        created_at: new Date(),
        updated_at: new Date()
      }).returning('id');
      
      permission = { id: result[0].id || result[0] };
    } else {
      console.log('discussion:create permission already exists.');
    }

    // 2. Assign to 'user' role
    const userRolePermission = await db('role_permissions')
      .where({ role: 'user', permission_id: permission.id })
      .first();

    if (!userRolePermission) {
      console.log('Assigning discussion:create to user role...');
      await db('role_permissions').insert({
        role: 'user',
        permission_id: permission.id,
        created_at: new Date()
      });
    } else {
      console.log('user role already has discussion:create permission.');
    }

    // 3. Assign to 'teacher' role (just in case)
    const teacherRolePermission = await db('role_permissions')
      .where({ role: 'teacher', permission_id: permission.id })
      .first();

    if (!teacherRolePermission) {
      console.log('Assigning discussion:create to teacher role...');
      await db('role_permissions').insert({
        role: 'teacher',
        permission_id: permission.id,
        created_at: new Date()
      });
    } else {
      console.log('teacher role already has discussion:create permission.');
    }

    console.log('Done.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addDiscussionPermissions();
