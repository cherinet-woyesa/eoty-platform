exports.seed = async function(knex) {
  // Clear existing
  await knex('role_permissions').del();
  await knex('user_permissions').del();

  // Insert permissions (using the set from your migrations)
  const permissions = await knex('user_permissions').insert([
    // Course permissions
    { permission_key: 'course:view', description: 'View courses' },
    { permission_key: 'course:create', description: 'Create courses' },
    { permission_key: 'course:edit', description: 'Edit courses' },
    { permission_key: 'course:delete', description: 'Delete courses' },
    { permission_key: 'course:publish', description: 'Publish courses' },
    
    // Lesson permissions
    { permission_key: 'lesson:view', description: 'View lessons' },
    { permission_key: 'lesson:create', description: 'Create lessons' },
    { permission_key: 'lesson:edit', description: 'Edit lessons' },
    { permission_key: 'lesson:delete', description: 'Delete lessons' },
    
    // Video permissions
    { permission_key: 'video:upload', description: 'Upload video files' },
    { permission_key: 'video:stream', description: 'Stream video content' },
    { permission_key: 'video:manage', description: 'Manage video content' },
    
    // User management
    { permission_key: 'user:manage', description: 'Manage users' },
    { permission_key: 'user:view', description: 'View user profiles' },
    
    // Analytics
    { permission_key: 'analytics:view', description: 'View analytics' },
    
    // System
    { permission_key: 'system:admin', description: 'Full system administration' },
    { permission_key: 'content:moderate', description: 'Moderate user content' }
  ]).returning('id');

  console.log('✅ Permissions seeded');

  // Map permissions to roles (using role names from your migrations)
  const permissionMap = {};
  const allPermissions = await knex('user_permissions').select('id', 'permission_key');
  allPermissions.forEach(p => {
    permissionMap[p.permission_key] = p.id;
  });

  const rolePermissions = [
    // Student permissions
    { role: 'student', permission_id: permissionMap['course:view'] },
    { role: 'student', permission_id: permissionMap['lesson:view'] },
    { role: 'student', permission_id: permissionMap['video:stream'] },
    { role: 'student', permission_id: permissionMap['user:view'] },

    // Teacher permissions
    { role: 'teacher', permission_id: permissionMap['course:create'] },
    { role: 'teacher', permission_id: permissionMap['course:edit'] },
    { role: 'teacher', permission_id: permissionMap['course:delete'] },
    { role: 'teacher', permission_id: permissionMap['course:view'] },
    { role: 'teacher', permission_id: permissionMap['course:publish'] },
    { role: 'teacher', permission_id: permissionMap['lesson:create'] },
    { role: 'teacher', permission_id: permissionMap['lesson:edit'] },
    { role: 'teacher', permission_id: permissionMap['lesson:delete'] },
    { role: 'teacher', permission_id: permissionMap['lesson:view'] },
    { role: 'teacher', permission_id: permissionMap['video:upload'] },
    { role: 'teacher', permission_id: permissionMap['video:stream'] },
    { role: 'teacher', permission_id: permissionMap['video:manage'] },
    { role: 'teacher', permission_id: permissionMap['user:view'] },
    { role: 'teacher', permission_id: permissionMap['analytics:view'] },

    // Admin permissions (all)
    { role: 'admin', permission_id: permissionMap['course:create'] },
    { role: 'admin', permission_id: permissionMap['course:edit'] },
    { role: 'admin', permission_id: permissionMap['course:delete'] },
    { role: 'admin', permission_id: permissionMap['course:view'] },
    { role: 'admin', permission_id: permissionMap['course:publish'] },
    { role: 'admin', permission_id: permissionMap['lesson:create'] },
    { role: 'admin', permission_id: permissionMap['lesson:edit'] },
    { role: 'admin', permission_id: permissionMap['lesson:delete'] },
    { role: 'admin', permission_id: permissionMap['lesson:view'] },
    { role: 'admin', permission_id: permissionMap['video:upload'] },
    { role: 'admin', permission_id: permissionMap['video:stream'] },
    { role: 'admin', permission_id: permissionMap['video:manage'] },
    { role: 'admin', permission_id: permissionMap['user:manage'] },
    { role: 'admin', permission_id: permissionMap['user:view'] },
    { role: 'admin', permission_id: permissionMap['analytics:view'] },
    { role: 'admin', permission_id: permissionMap['system:admin'] },
    { role: 'admin', permission_id: permissionMap['content:moderate'] }
  ];

  await knex('role_permissions').insert(rolePermissions);
  console.log('✅ Role permissions seeded');
};