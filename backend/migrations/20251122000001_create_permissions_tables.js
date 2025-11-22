// Create permissions system tables (only create if they don't exist)
exports.up = function(knex) {
  return knex.schema
    .hasTable('roles').then(function(exists) {
      if (!exists) {
        return knex.schema.createTable('roles', function(table) {
          table.increments('id').primary();
          table.string('name', 50).notNullable().unique();
          table.string('display_name', 100).notNullable();
          table.text('description').nullable();
          table.timestamp('created_at').defaultTo(knex.fn.now());
          table.timestamp('updated_at').defaultTo(knex.fn.now());
        }).then(function() {
          // Insert default roles
          return knex('roles').insert([
            { name: 'admin', display_name: 'Administrator', description: 'Full system access and management' },
            { name: 'teacher', display_name: 'Teacher', description: 'Course creation and student management' },
            { name: 'user', display_name: 'User', description: 'Access to courses and learning materials' }
          ]);
        });
      }
      return null;
    })
    .then(function() {
      return knex.schema.hasTable('user_permissions').then(function(exists) {
        if (!exists) {
          return knex.schema.createTable('user_permissions', function(table) {
            table.increments('id').primary();
            table.string('permission_key', 100).notNullable().unique();
            table.string('name', 100).notNullable();
            table.text('description').nullable();
            table.string('category', 50).defaultTo('general');
            table.timestamp('created_at').defaultTo(knex.fn.now());
            table.timestamp('updated_at').defaultTo(knex.fn.now());

            table.index(['category', 'permission_key']);
          }).then(function() {
            // Insert default permissions
            return knex('user_permissions').insert([
              // System permissions
              { permission_key: 'system:admin', name: 'System Administration', description: 'Full system administration access', category: 'system' },
              { permission_key: 'system:config', name: 'System Configuration', description: 'Modify system settings and configuration', category: 'system' },

              // User management
              { permission_key: 'user:create', name: 'Create Users', description: 'Create new user accounts', category: 'user_management' },
              { permission_key: 'user:view', name: 'View Users', description: 'View user information and lists', category: 'user_management' },
              { permission_key: 'user:manage', name: 'Manage Users', description: 'Edit user profiles and settings', category: 'user_management' },
              { permission_key: 'user:delete', name: 'Delete Users', description: 'Delete user accounts', category: 'user_management' },

              // Content management
              { permission_key: 'content:create', name: 'Create Content', description: 'Create courses, lessons, and materials', category: 'content' },
              { permission_key: 'content:view', name: 'View Content', description: 'View all content and materials', category: 'content' },
              { permission_key: 'content:manage', name: 'Manage Content', description: 'Edit and moderate content', category: 'content' },
              { permission_key: 'content:delete', name: 'Delete Content', description: 'Delete content and materials', category: 'content' },
              { permission_key: 'content:upload', name: 'Upload Files', description: 'Upload media and files', category: 'content' },

              // Forum management
              { permission_key: 'forum:moderate', name: 'Moderate Forums', description: 'Moderate forum posts and discussions', category: 'forum' },
              { permission_key: 'forum:manage', name: 'Manage Forums', description: 'Create and manage forum categories', category: 'forum' },

              // Analytics and reporting
              { permission_key: 'analytics:view', name: 'View Analytics', description: 'Access analytics and reports', category: 'analytics' },
              { permission_key: 'analytics:export', name: 'Export Data', description: 'Export analytics and usage data', category: 'analytics' },

              // Audit and security
              { permission_key: 'audit:view', name: 'View Audit Logs', description: 'Access system audit logs', category: 'audit' },
              { permission_key: 'security:manage', name: 'Security Management', description: 'Manage security settings', category: 'security' },

              // Data management
              { permission_key: 'data:export', name: 'Data Export', description: 'Export system data', category: 'data' },
              { permission_key: 'data:import', name: 'Data Import', description: 'Import system data', category: 'data' }
            ]);
          });
        }
        return null;
      });
    })
    .then(function() {
      return knex.schema.hasTable('role_permissions').then(function(exists) {
        if (!exists) {
          return knex.schema.createTable('role_permissions', function(table) {
            table.increments('id').primary();
            table.integer('role_id').unsigned().notNullable().references('id').inTable('roles').onDelete('CASCADE');
            table.integer('permission_id').unsigned().notNullable().references('id').inTable('user_permissions').onDelete('CASCADE');
            table.timestamp('created_at').defaultTo(knex.fn.now());

            table.unique(['role_id', 'permission_id']);
            table.index(['role_id', 'permission_id']);
          });
        }
        return null;
      });
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('role_permissions')
    .dropTableIfExists('user_permissions')
    .dropTableIfExists('roles');
};
