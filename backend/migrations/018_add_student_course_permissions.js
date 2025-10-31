/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // First check if course:view permission exists
  const courseViewPermission = await knex('user_permissions')
    .where('permission_key', 'course:view')
    .first();

  if (!courseViewPermission) {
    // Create course:view permission if it doesn't exist
    await knex('user_permissions').insert({
      permission_key: 'course:view',
      description: 'View courses and course catalog'
    });
  }

  // Get the permission ID (whether it existed or was just created)
  const permission = await knex('user_permissions')
    .where('permission_key', 'course:view')
    .first('id');

  if (permission) {
    // Check if student already has this permission
    const existingPermission = await knex('role_permissions')
      .where({
        role: 'student',
        permission_id: permission.id
      })
      .first();

    // Add course:view permission to student role if not already exists
    if (!existingPermission) {
      await knex('role_permissions').insert({
        role: 'student',
        permission_id: permission.id
      });
    }

    // Also ensure teacher and admin have course:view
    const teacherPermission = await knex('role_permissions')
      .where({
        role: 'teacher',
        permission_id: permission.id
      })
      .first();

    if (!teacherPermission) {
      await knex('role_permissions').insert({
        role: 'teacher',
        permission_id: permission.id
      });
    }

    const adminPermission = await knex('role_permissions')
      .where({
        role: 'admin',
        permission_id: permission.id
      })
      .first();

    if (!adminPermission) {
      await knex('role_permissions').insert({
        role: 'admin',
        permission_id: permission.id
      });
    }
  }
};

exports.down = async function(knex) {
  // Remove course:view permission from student role
  const permission = await knex('user_permissions')
    .where('permission_key', 'course:view')
    .first('id');

  if (permission) {
    await knex('role_permissions')
      .where({
        role: 'student',
        permission_id: permission.id
      })
      .del();
  }
};