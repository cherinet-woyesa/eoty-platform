/**
 * Add achievements permissions
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if achievements permissions already exist
  const existingPermissions = await knex('user_permissions')
    .whereIn('permission_key', ['achievements:view', 'achievements:award'])
    .select('permission_key');

  const existingKeys = existingPermissions.map(p => p.permission_key);
  const permissionsToAdd = [];

  if (!existingKeys.includes('achievements:view')) {
    permissionsToAdd.push({
      permission_key: 'achievements:view',
      name: 'View Achievements',
      description: 'View badges and achievements',
      category: 'achievements'
    });
  }

  if (!existingKeys.includes('achievements:award')) {
    permissionsToAdd.push({
      permission_key: 'achievements:award',
      name: 'Award Achievements',
      description: 'Manually award badges to users',
      category: 'achievements'
    });
  }

  if (permissionsToAdd.length > 0) {
    await knex('user_permissions').insert(permissionsToAdd);
    console.log(`Added ${permissionsToAdd.length} achievements permissions`);
  } else {
    console.log('Achievements permissions already exist');
  }

  // Get the permission IDs
  const viewPermission = await knex('user_permissions').where('permission_key', 'achievements:view').first();
  const awardPermission = await knex('user_permissions').where('permission_key', 'achievements:award').first();

  // Assign achievements:view to all active user roles (except banned/guest)
  const roleNames = ['user', 'student', 'youth', 'moderator', 'teacher', 'chapter_admin', 'regional_coordinator', 'admin'];

  if (viewPermission) {
    for (const roleName of roleNames) {
      const existingRolePermission = await knex('role_permissions')
        .where({
          role: roleName,
          permission_id: viewPermission.id
        })
        .first();

      if (!existingRolePermission) {
        await knex('role_permissions').insert({
          role: roleName,
          permission_id: viewPermission.id
        });
        console.log(`Granted achievements:view to role: ${roleName}`);
      }
    }
  }

  // Assign achievements:award to teacher and admin roles
  const teacherAdminRoles = ['teacher', 'chapter_admin', 'admin'];

  if (awardPermission) {
    for (const roleName of teacherAdminRoles) {
      const existingRolePermission = await knex('role_permissions')
        .where({
          role: roleName,
          permission_id: awardPermission.id
        })
        .first();

      if (!existingRolePermission) {
        await knex('role_permissions').insert({
          role: roleName,
          permission_id: awardPermission.id
        });
        console.log(`Granted achievements:award to role: ${roleName}`);
      }
    }
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Get permission IDs before deleting
  const viewPermission = await knex('user_permissions').where('permission_key', 'achievements:view').first();
  const awardPermission = await knex('user_permissions').where('permission_key', 'achievements:award').first();

  // Remove role permissions first
  if (viewPermission) {
    await knex('role_permissions').where('permission_id', viewPermission.id).del();
  }
  if (awardPermission) {
    await knex('role_permissions').where('permission_id', awardPermission.id).del();
  }

  // Remove permissions
  return knex('user_permissions')
    .whereIn('permission_key', ['achievements:view', 'achievements:award'])
    .del();
};
