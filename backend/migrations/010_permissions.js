/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // User permissions table
  await knex.schema.createTable('user_permissions', (table) => {
    table.increments('id').primary();
    table.string('permission_key').notNullable().unique();
    table.string('description');
    table.timestamps(true, true);
  });

  // Role permissions junction table
  await knex.schema.createTable('role_permissions', (table) => {
    table.increments('id').primary();
    table.string('role').notNullable();
    table.integer('permission_id').unsigned().references('id').inTable('user_permissions').onDelete('CASCADE');
    table.timestamps(true, true);
    
    table.unique(['role', 'permission_id']);
  });

  // Insert basic permissions
  await knex('user_permissions').insert([
    { permission_key: 'course:create', description: 'Create courses' },
    { permission_key: 'course:edit', description: 'Edit courses' },
    { permission_key: 'course:delete', description: 'Delete courses' },
    { permission_key: 'lesson:create', description: 'Create lessons' },
    { permission_key: 'lesson:edit', description: 'Edit lessons' },
    { permission_key: 'lesson:delete', description: 'Delete lessons' },
    { permission_key: 'user:manage', description: 'Manage users' },
    { permission_key: 'analytics:view', description: 'View analytics' },
    { permission_key: 'course:view', description: 'View courses' },
    { permission_key: 'system:admin', description: 'Full system administration access' },
  ]);

  // Assign permissions to roles
  await knex('role_permissions').insert([
    // Student permissions
    { role: 'student', permission_id: 9 }, // course:view

    // Teacher permissions
    { role: 'teacher', permission_id: 1 }, // course:create
    { role: 'teacher', permission_id: 2 }, // course:edit
    { role: 'teacher', permission_id: 3 }, // course:delete
    { role: 'teacher', permission_id: 4 }, // lesson:create
    { role: 'teacher', permission_id: 5 }, // lesson:edit
    { role: 'teacher', permission_id: 6 }, // lesson:delete
    { role: 'teacher', permission_id: 8 }, // analytics:view
    { role: 'teacher', permission_id: 9 }, // course:view
    
    // Admin permissions (all)
    { role: 'admin', permission_id: 1 },
    { role: 'admin', permission_id: 2 },
    { role: 'admin', permission_id: 3 },
    { role: 'admin', permission_id: 4 },
    { role: 'admin', permission_id: 5 },
    { role: 'admin', permission_id: 6 },
    { role: 'admin', permission_id: 7 }, // user:manage
    { role: 'admin', permission_id: 8 },
    { role: 'admin', permission_id: 9 }, // course:view
    { role: 'admin', permission_id: 10 }, // system:admin
  ]);
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('role_permissions');
  await knex.schema.dropTableIfExists('user_permissions');
};