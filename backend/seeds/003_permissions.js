exports.seed = async function(knex) {
  // Clear existing
  await knex('role_permissions').del();
  await knex('user_permissions').del();

  // Insert all permissions
  const permissions = await knex('user_permissions').insert([
    // Course permissions
    { permission_key: 'course:view', description: 'View courses' },
    { permission_key: 'course:create', description: 'Create courses' },
    { permission_key: 'course:edit', description: 'Edit courses' },
    { permission_key: 'course:delete', description: 'Delete courses' },
    { permission_key: 'course:publish', description: 'Publish courses' },
    { permission_key: 'course:edit_own', description: 'Edit own courses' },
    { permission_key: 'course:delete_own', description: 'Delete own courses' },
    { permission_key: 'course:edit_any', description: 'Edit any courses' },
    { permission_key: 'course:delete_any', description: 'Delete any courses' },
    
    // Lesson permissions
    { permission_key: 'lesson:view', description: 'View lessons' },
    { permission_key: 'lesson:create', description: 'Create lessons' },
    { permission_key: 'lesson:edit', description: 'Edit lessons' },
    { permission_key: 'lesson:delete', description: 'Delete lessons' },
    { permission_key: 'lesson:edit_own', description: 'Edit own lessons' },
    { permission_key: 'lesson:delete_own', description: 'Delete own lessons' },
    { permission_key: 'lesson:edit_any', description: 'Edit any lessons' },
    { permission_key: 'lesson:delete_any', description: 'Delete any lessons' },
    
    // Video permissions
    { permission_key: 'video:upload', description: 'Upload video files' },
    { permission_key: 'video:stream', description: 'Stream video content' },
    { permission_key: 'video:manage', description: 'Manage video content' },
    { permission_key: 'video:delete_own', description: 'Delete own videos' },
    { permission_key: 'video:delete_any', description: 'Delete any videos' },
    
    // Quiz permissions
    { permission_key: 'quiz:take', description: 'Take quizzes' },
    { permission_key: 'quiz:create', description: 'Create quizzes' },
    { permission_key: 'quiz:edit_own', description: 'Edit own quizzes' },
    { permission_key: 'quiz:edit_any', description: 'Edit any quizzes' },
    
    // Discussion permissions
    { permission_key: 'discussion:view', description: 'View discussions' },
    { permission_key: 'discussion:create', description: 'Create discussions' },
    { permission_key: 'discussion:moderate', description: 'Moderate discussions' },
    { permission_key: 'discussion:delete_any', description: 'Delete any discussions' },
    
    // Content permissions
    { permission_key: 'content:moderate', description: 'Moderate user content' },
    { permission_key: 'content:flag', description: 'Flag content for review' },
    { permission_key: 'content:review', description: 'Review flagged content' },
    { permission_key: 'content:manage', description: 'Manage all content' },
    { permission_key: 'content:view', description: 'View content management' },
    
    // User management
    { permission_key: 'user:manage', description: 'Manage users' },
    { permission_key: 'user:view', description: 'View user profiles' },
    { permission_key: 'user:create', description: 'Create users' },
    { permission_key: 'user:edit_own', description: 'Edit own profile' },
    { permission_key: 'user:edit_any', description: 'Edit any user profile' },
    
    // Progress & Notes permissions
    { permission_key: 'progress:view', description: 'View progress' },
    { permission_key: 'notes:create', description: 'Create notes' },
    { permission_key: 'notes:view_own', description: 'View own notes' },
    
    // Analytics
    { permission_key: 'analytics:view', description: 'View analytics' },
    { permission_key: 'analytics:view_own', description: 'View own analytics' },
    
    // Chapter permissions
    { permission_key: 'chapter:view', description: 'View chapters' },
    { permission_key: 'chapter:manage', description: 'Manage chapters' },
    
    // System & Admin
    { permission_key: 'system:admin', description: 'Full system administration' },
    { permission_key: 'admin:view', description: 'View admin panel' },
    { permission_key: 'admin:moderate', description: 'Admin moderation access' },
    
    // Data & Audit
    { permission_key: 'data:export', description: 'Export data' },
    { permission_key: 'audit:view', description: 'View audit logs' }
  ]).returning('id');

  console.log('✅ Permissions seeded');

  // Map permissions to roles
  const permissionMap = {};
  const allPermissions = await knex('user_permissions').select('id', 'permission_key');
  allPermissions.forEach(p => {
    permissionMap[p.permission_key] = p.id;
  });

  // Helper function to get permission IDs
  const getPermIds = (...keys) => keys.map(key => permissionMap[key]).filter(Boolean);

  const rolePermissions = [
    // Guest permissions - minimal view-only access
    ...getPermIds('course:view', 'lesson:view').map(id => ({ role: 'guest', permission_id: id })),

    // Youth permissions - same as base user but with privacy protections
    ...getPermIds(
      'course:view', 'lesson:view', 'quiz:take',
      'discussion:view', 'discussion:create', 'user:edit_own',
      'progress:view', 'notes:create', 'notes:view_own', 'video:stream'
    ).map(id => ({ role: 'youth', permission_id: id })),

    // Base user permissions (formerly student)
    ...getPermIds(
      'course:view', 'lesson:view', 'quiz:take',
      'discussion:view', 'discussion:create', 'user:edit_own',
      'progress:view', 'notes:create', 'notes:view_own',
      'video:stream', 'user:view'
    ).map(id => ({ role: 'user', permission_id: id })),

    // Moderator permissions
    ...getPermIds(
      'course:view', 'lesson:view', 'quiz:take',
      'discussion:view', 'discussion:create', 'discussion:moderate', 'discussion:delete_any',
      'content:moderate', 'content:flag', 'content:review',
      'user:view', 'user:edit_own', 'analytics:view_own'
    ).map(id => ({ role: 'moderator', permission_id: id })),

    // Teacher permissions
    ...getPermIds(
      'course:view', 'course:create', 'course:edit_own', 'course:delete_own', 'course:publish',
      'lesson:view', 'lesson:create', 'lesson:edit_own', 'lesson:delete_own',
      'video:upload', 'video:stream', 'video:manage', 'video:delete_own',
      'quiz:take', 'quiz:create', 'quiz:edit_own',
      'discussion:view', 'discussion:create',
      'user:edit_own', 'user:view', 'analytics:view_own',
      'progress:view', 'notes:create', 'notes:view_own'
    ).map(id => ({ role: 'teacher', permission_id: id })),

    // Chapter Admin permissions
    ...getPermIds(
      'course:view', 'course:create', 'course:edit_own', 'course:edit_any',
      'course:delete_own', 'course:delete_any', 'course:publish',
      'lesson:view', 'lesson:create', 'lesson:edit_own', 'lesson:edit_any',
      'lesson:delete_own', 'lesson:delete_any',
      'video:upload', 'video:stream', 'video:manage', 'video:delete_own', 'video:delete_any',
      'quiz:take', 'quiz:create', 'quiz:edit_own', 'quiz:edit_any',
      'discussion:view', 'discussion:create', 'discussion:moderate', 'discussion:delete_any',
      'content:moderate', 'content:flag', 'content:review', 'content:view',
      'user:view', 'user:edit_own', 'user:edit_any', 'user:manage',
      'chapter:view', 'chapter:manage',
      'analytics:view', 'analytics:view_own',
      'progress:view', 'notes:create', 'notes:view_own'
    ).map(id => ({ role: 'chapter_admin', permission_id: id })),

    // Admin permissions (all permissions)
    ...getPermIds(
      'course:view', 'course:create', 'course:edit', 'course:edit_own', 'course:edit_any',
      'course:delete', 'course:delete_own', 'course:delete_any', 'course:publish',
      'lesson:view', 'lesson:create', 'lesson:edit', 'lesson:edit_own', 'lesson:edit_any',
      'lesson:delete', 'lesson:delete_own', 'lesson:delete_any',
      'video:upload', 'video:stream', 'video:manage', 'video:delete_own', 'video:delete_any',
      'quiz:take', 'quiz:create', 'quiz:edit_own', 'quiz:edit_any',
      'discussion:view', 'discussion:create', 'discussion:moderate', 'discussion:delete_any',
      'content:moderate', 'content:flag', 'content:review', 'content:manage', 'content:view',
      'user:manage', 'user:view', 'user:create', 'user:edit_own', 'user:edit_any',
      'chapter:view', 'chapter:manage',
      'analytics:view', 'analytics:view_own',
      'system:admin', 'admin:view', 'admin:moderate',
      'data:export', 'audit:view',
      'progress:view', 'notes:create', 'notes:view_own'
    ).map(id => ({ role: 'admin', permission_id: id })),

    // Platform Admin permissions (system:admin grants all)
    // `platform_admin` removed; `admin` holds full system:admin permissions
    ...getPermIds('system:admin').map(id => ({ role: 'admin', permission_id: id }))
  ];

  await knex('role_permissions').insert(rolePermissions);
  console.log('✅ Role permissions seeded for all roles');
};