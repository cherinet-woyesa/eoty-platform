exports.up = function(knex) {
  return knex.schema
    .alterTable('users', function(table) {
      table.enum('role', ['student', 'teacher', 'chapter_admin', 'platform_admin']).defaultTo('student').notNullable();
      table.string('chapter_id').nullable(); // For chapter-specific admins
      table.boolean('is_active').defaultTo(true);
      table.timestamp('last_login_at');
    })
    .createTable('user_permissions', function(table) {
      table.increments('id').primary();
      table.string('permission_key').notNullable();
      table.string('description').notNullable();
      table.timestamps(true, true);
      
      table.unique(['permission_key']);
    })
    .createTable('role_permissions', function(table) {
      table.increments('id').primary();
      table.enum('role', ['student', 'teacher', 'chapter_admin', 'platform_admin']).notNullable();
      table.integer('permission_id').references('id').inTable('user_permissions').onDelete('CASCADE');
      table.timestamps(true, true);
      
      table.unique(['role', 'permission_id']);
    })
    .createTable('user_chapter_assignments', function(table) {
      table.increments('id').primary();
      table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('chapter_id').notNullable();
      table.enum('role_in_chapter', ['member', 'moderator', 'admin']).defaultTo('member');
      table.timestamps(true, true);
      
      table.unique(['user_id', 'chapter_id']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTable('user_chapter_assignments')
    .dropTable('role_permissions')
    .dropTable('user_permissions')
    .alterTable('users', function(table) {
      table.dropColumn('role');
      table.dropColumn('chapter_id');
      table.dropColumn('is_active');
      table.dropColumn('last_login_at');
    });
};