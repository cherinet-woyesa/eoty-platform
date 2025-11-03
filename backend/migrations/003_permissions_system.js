/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Roles table
  await knex.schema.createTable('roles', function(table) {
    table.increments('id').primary();
    table.string('name').notNullable().unique();
    table.text('description');
    table.timestamps(true, true);
  });

  // User roles junction
  await knex.schema.createTable('user_roles', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.integer('role_id').unsigned().references('id').inTable('roles').onDelete('CASCADE');
    table.unique(['user_id', 'role_id']);
  });

  // Permissions system
  await knex.schema.createTable('user_permissions', (table) => {
    table.increments('id').primary();
    table.string('permission_key').notNullable().unique();
    table.string('description');
    table.timestamps(true, true);
  });

  // Role permissions junction
  await knex.schema.createTable('role_permissions', (table) => {
    table.increments('id').primary();
    table.string('role').notNullable();
    table.integer('permission_id').unsigned().references('id').inTable('user_permissions').onDelete('CASCADE');
    table.timestamps(true, true);
    table.unique(['role', 'permission_id']);
  });

  // Insert base permissions
  const permissions = [
    // Course permissions
    { permission_key: 'course:create', description: 'Create courses' },
    { permission_key: 'course:edit', description: 'Edit courses' },
    { permission_key: 'course:delete', description: 'Delete courses' },
    { permission_key: 'course:view', description: 'View courses' },
    { permission_key: 'course:publish', description: 'Publish courses' },
    
    // Lesson permissions
    { permission_key: 'lesson:create', description: 'Create lessons' },
    { permission_key: 'lesson:edit', description: 'Edit lessons' },
    { permission_key: 'lesson:delete', description: 'Delete lessons' },
    { permission_key: 'lesson:view', description: 'View lessons' },
    
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
  ];

  await knex('user_permissions').insert(permissions);

  // Assign permissions to roles
  const rolePermissions = [
    // Student permissions
    { role: 'student', permission_id: 4 }, // course:view
    { role: 'student', permission_id: 9 }, // lesson:view
    { role: 'student', permission_id: 11 }, // video:stream
    { role: 'student', permission_id: 14 }, // user:view

    // Teacher permissions
    { role: 'teacher', permission_id: 1 }, // course:create
    { role: 'teacher', permission_id: 2 }, // course:edit
    { role: 'teacher', permission_id: 4 }, // course:view
    { role: 'teacher', permission_id: 5 }, // course:publish
    { role: 'teacher', permission_id: 6 }, // lesson:create
    { role: 'teacher', permission_id: 7 }, // lesson:edit
    { role: 'teacher', permission_id: 8 }, // lesson:delete
    { role: 'teacher', permission_id: 9 }, // lesson:view
    { role: 'teacher', permission_id: 10 }, // video:upload
    { role: 'teacher', permission_id: 11 }, // video:stream
    { role: 'teacher', permission_id: 12 }, // video:manage
    { role: 'teacher', permission_id: 14 }, // user:view
    { role: 'teacher', permission_id: 15 }, // analytics:view

    // Admin permissions (all)
    { role: 'admin', permission_id: 1 },
    { role: 'admin', permission_id: 2 },
    { role: 'admin', permission_id: 3 },
    { role: 'admin', permission_id: 4 },
    { role: 'admin', permission_id: 5 },
    { role: 'admin', permission_id: 6 },
    { role: 'admin', permission_id: 7 },
    { role: 'admin', permission_id: 8 },
    { role: 'admin', permission_id: 9 },
    { role: 'admin', permission_id: 10 },
    { role: 'admin', permission_id: 11 },
    { role: 'admin', permission_id: 12 },
    { role: 'admin', permission_id: 13 }, // user:manage
    { role: 'admin', permission_id: 14 },
    { role: 'admin', permission_id: 15 },
    { role: 'admin', permission_id: 16 }, // system:admin
    { role: 'admin', permission_id: 17 }  // content:moderate
  ];

  await knex('role_permissions').insert(rolePermissions);
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('role_permissions');
  await knex.schema.dropTableIfExists('user_permissions');
  await knex.schema.dropTableIfExists('user_roles');
  await knex.schema.dropTableIfExists('roles');
};