/**
 * Complete RBAC System Migration
 * Adds all missing roles and permissions to complete the RBAC implementation
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Add all missing permissions
  const missingPermissions = [
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
    { permission_key: 'content:flag', description: 'Flag content for review' },
    { permission_key: 'content:review', description: 'Review flagged content' },
    { permission_key: 'content:manage', description: 'Manage all content' },
    { permission_key: 'content:view', description: 'View content management' },
    
    // User permissions
    { permission_key: 'user:create', description: 'Create users' },
    { permission_key: 'user:edit_own', description: 'Edit own profile' },
    { permission_key: 'user:edit_any', description: 'Edit any user profile' },
    
    // Progress & Notes permissions
    { permission_key: 'progress:view', description: 'View progress' },
    { permission_key: 'notes:create', description: 'Create notes' },
    { permission_key: 'notes:view_own', description: 'View own notes' },
    
    // Data & Audit permissions
    { permission_key: 'data:export', description: 'Export data' },
    { permission_key: 'audit:view', description: 'View audit logs' },
    
    // Admin permissions
    { permission_key: 'admin:view', description: 'View admin panel' },
    { permission_key: 'admin:moderate', description: 'Admin moderation access' },
    
    // Course ownership permissions
    { permission_key: 'course:edit_own', description: 'Edit own courses' },
    { permission_key: 'course:delete_own', description: 'Delete own courses' },
    { permission_key: 'course:edit_any', description: 'Edit any courses' },
    { permission_key: 'course:delete_any', description: 'Delete any courses' },
    
    // Lesson ownership permissions
    { permission_key: 'lesson:edit_own', description: 'Edit own lessons' },
    { permission_key: 'lesson:delete_own', description: 'Delete own lessons' },
    { permission_key: 'lesson:edit_any', description: 'Edit any lessons' },
    { permission_key: 'lesson:delete_any', description: 'Delete any lessons' },
    
    // Video ownership permissions
    { permission_key: 'video:delete_own', description: 'Delete own videos' },
    { permission_key: 'video:delete_any', description: 'Delete any videos' },
    
    // Chapter permissions
    { permission_key: 'chapter:view', description: 'View chapters' },
    { permission_key: 'chapter:manage', description: 'Manage chapters' },
    
    // Analytics permissions
    { permission_key: 'analytics:view_own', description: 'View own analytics' }
  ];

  // Insert missing permissions (ignore duplicates)
  for (const permission of missingPermissions) {
    await knex('user_permissions')
      .insert(permission)
      .onConflict('permission_key')
      .ignore();
  }

  console.log('✅ Added missing permissions');

  // Get all permissions for mapping
  const allPermissions = await knex('user_permissions').select('id', 'permission_key');
  const permissionMap = {};
  allPermissions.forEach(p => {
    permissionMap[p.permission_key] = p.id;
  });

  // Define role-permission mappings
  const rolePermissionMappings = {
    // Guest role - minimal view-only access
    guest: [
      'course:view',
      'lesson:view'
    ],
    
    // Youth role - same as student but with privacy protections
    youth: [
      'course:view',
      'lesson:view',
      'quiz:take',
      'discussion:view',
      'discussion:create',
      'user:edit_own',
      'progress:view',
      'notes:create',
      'notes:view_own',
      'video:stream'
    ],
    
    // Student role - learning and participation
    student: [
      'course:view',
      'lesson:view',
      'quiz:take',
      'discussion:view',
      'discussion:create',
      'user:edit_own',
      'progress:view',
      'notes:create',
      'notes:view_own',
      'video:stream',
      'user:view'
    ],
    
    // Moderator role - content moderation
    moderator: [
      'course:view',
      'lesson:view',
      'quiz:take',
      'discussion:view',
      'discussion:create',
      'discussion:moderate',
      'discussion:delete_any',
      'content:moderate',
      'content:flag',
      'content:review',
      'user:view',
      'user:edit_own',
      'analytics:view_own'
    ],
    
    // Teacher role - course creation and management
    teacher: [
      'course:view',
      'course:create',
      'course:edit_own',
      'course:delete_own',
      'course:publish',
      'lesson:view',
      'lesson:create',
      'lesson:edit_own',
      'lesson:delete_own',
      'video:upload',
      'video:stream',
      'video:manage',
      'video:delete_own',
      'quiz:take',
      'quiz:create',
      'quiz:edit_own',
      'discussion:view',
      'discussion:create',
      'user:edit_own',
      'user:view',
      'analytics:view_own',
      'progress:view',
      'notes:create',
      'notes:view_own'
    ],
    
    // Chapter Admin role - chapter-level management
    chapter_admin: [
      'course:view',
      'course:create',
      'course:edit_own',
      'course:edit_any',
      'course:delete_own',
      'course:delete_any',
      'course:publish',
      'lesson:view',
      'lesson:create',
      'lesson:edit_own',
      'lesson:edit_any',
      'lesson:delete_own',
      'lesson:delete_any',
      'video:upload',
      'video:stream',
      'video:manage',
      'video:delete_own',
      'video:delete_any',
      'quiz:take',
      'quiz:create',
      'quiz:edit_own',
      'quiz:edit_any',
      'discussion:view',
      'discussion:create',
      'discussion:moderate',
      'discussion:delete_any',
      'content:moderate',
      'content:flag',
      'content:review',
      'content:view',
      'user:view',
      'user:edit_own',
      'user:edit_any',
      'user:manage',
      'chapter:view',
      'chapter:manage',
      'analytics:view',
      'analytics:view_own',
      'progress:view',
      'notes:create',
      'notes:view_own'
    ],
    
    // Admin role - full system access
    admin: [
      'course:view',
      'course:create',
      'course:edit',
      'course:edit_own',
      'course:edit_any',
      'course:delete',
      'course:delete_own',
      'course:delete_any',
      'course:publish',
      'lesson:view',
      'lesson:create',
      'lesson:edit',
      'lesson:edit_own',
      'lesson:edit_any',
      'lesson:delete',
      'lesson:delete_own',
      'lesson:delete_any',
      'video:upload',
      'video:stream',
      'video:manage',
      'video:delete_own',
      'video:delete_any',
      'quiz:take',
      'quiz:create',
      'quiz:edit_own',
      'quiz:edit_any',
      'discussion:view',
      'discussion:create',
      'discussion:moderate',
      'discussion:delete_any',
      'content:moderate',
      'content:flag',
      'content:review',
      'content:manage',
      'content:view',
      'user:manage',
      'user:view',
      'user:create',
      'user:edit_own',
      'user:edit_any',
      'chapter:view',
      'chapter:manage',
      'analytics:view',
      'analytics:view_own',
      'system:admin',
      'admin:view',
      'admin:moderate',
      'data:export',
      'audit:view',
      'progress:view',
      'notes:create',
      'notes:view_own'
    ],
  };

  // Insert role-permission mappings
  for (const [role, permissions] of Object.entries(rolePermissionMappings)) {
    for (const permissionKey of permissions) {
      const permissionId = permissionMap[permissionKey];
      if (permissionId) {
        await knex('role_permissions')
          .insert({
            role: role,
            permission_id: permissionId
          })
          .onConflict(['role', 'permission_id'])
          .ignore();
      }
    }
  }

  console.log('✅ Added role-permission mappings for all roles');
};

exports.down = async function(knex) {
  // Remove role-permission mappings for new roles
  await knex('role_permissions')
    .whereIn('role', ['guest', 'youth', 'moderator', 'chapter_admin', 'admin'])
    .del();

  // Remove new permissions (be careful - only remove if not used by existing roles)
  const newPermissionKeys = [
    'quiz:take', 'quiz:create', 'quiz:edit_own', 'quiz:edit_any',
    'discussion:view', 'discussion:create', 'discussion:moderate', 'discussion:delete_any',
    'content:flag', 'content:review', 'content:manage', 'content:view',
    'user:create', 'user:edit_own', 'user:edit_any',
    'progress:view', 'notes:create', 'notes:view_own',
    'data:export', 'audit:view',
    'admin:view', 'admin:moderate',
    'course:edit_own', 'course:delete_own', 'course:edit_any', 'course:delete_any',
    'lesson:edit_own', 'lesson:delete_own', 'lesson:edit_any', 'lesson:delete_any',
    'video:delete_own', 'video:delete_any',
    'chapter:view', 'chapter:manage',
    'analytics:view_own'
  ];

  // Check if permissions are used by existing roles before deleting
  const usedPermissions = await knex('role_permissions as rp')
    .join('user_permissions as up', 'rp.permission_id', 'up.id')
    .whereIn('up.permission_key', newPermissionKeys)
    .whereIn('rp.role', ['student', 'teacher', 'admin'])
    .select('up.permission_key')
    .distinct();

  const usedPermissionKeys = usedPermissions.map(p => p.permission_key);
  const safeToDelete = newPermissionKeys.filter(key => !usedPermissionKeys.includes(key));

  if (safeToDelete.length > 0) {
    await knex('user_permissions')
      .whereIn('permission_key', safeToDelete)
      .del();
  }

  console.log('✅ Rolled back RBAC additions');
};

