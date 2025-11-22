// Ensure permissions tables have correct data and structure
exports.up = function(knex) {
  return knex.schema.hasTable('user_permissions').then(function(exists) {
    if (exists) {
      // Check if name column exists
      return knex.schema.hasColumn('user_permissions', 'name').then(function(hasName) {
        if (!hasName) {
          // Add name column if missing
          return knex.schema.alterTable('user_permissions', function(table) {
            table.string('name', 100).notNullable().defaultTo('Unknown Permission');
          });
        }
      }).then(function() {
        // Ensure we have basic permissions data
        return knex('user_permissions').count('id as count').then(function(result) {
          if (parseInt(result[0].count) === 0) {
            return knex('user_permissions').insert([
              { permission_key: 'system:admin', name: 'System Administration', description: 'Full system administration access', category: 'system' },
              { permission_key: 'system:config', name: 'System Configuration', description: 'Modify system settings and configuration', category: 'system' },
              { permission_key: 'user:create', name: 'Create Users', description: 'Create new user accounts', category: 'user_management' },
              { permission_key: 'user:view', name: 'View Users', description: 'View user information and lists', category: 'user_management' },
              { permission_key: 'user:manage', name: 'Manage Users', description: 'Edit user profiles and settings', category: 'user_management' },
              { permission_key: 'content:create', name: 'Create Content', description: 'Create courses, lessons, and materials', category: 'content' },
              { permission_key: 'content:view', name: 'View Content', description: 'View all content and materials', category: 'content' },
              { permission_key: 'content:manage', name: 'Manage Content', description: 'Edit and moderate content', category: 'content' },
              { permission_key: 'analytics:view', name: 'View Analytics', description: 'Access analytics and reports', category: 'analytics' },
              { permission_key: 'audit:view', name: 'View Audit Logs', description: 'Access system audit logs', category: 'audit' }
            ]);
          }
        });
      });
    }
  });
};

exports.down = function(knex) {
  // No rollback needed for this data-only migration
  return Promise.resolve();
};
