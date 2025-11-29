
exports.up = function(knex) {
  return knex.schema
    // Create content_tags table if it doesn't exist
    .hasTable('content_tags').then(exists => {
      if (!exists) {
        return knex.schema.createTable('content_tags', table => {
          table.increments('id').primary();
          table.string('name').notNullable().unique();
          table.string('slug').notNullable().unique();
          table.text('description');
          table.boolean('is_active').defaultTo(true);
          table.timestamps(true, true);
        });
      }
    })
    // Create user_chapter_roles table if it doesn't exist
    .then(() => knex.schema.hasTable('user_chapter_roles').then(exists => {
      if (!exists) {
        return knex.schema.createTable('user_chapter_roles', table => {
          table.increments('id').primary();
          table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
          table.integer('chapter_id').references('id').inTable('chapters').onDelete('CASCADE');
          table.string('role').notNullable(); // 'chapter_admin', 'regional_coordinator'
          table.timestamps(true, true);
          table.unique(['user_id', 'chapter_id', 'role']);
        });
      }
    }))
    // Add chapter_id to courses table if it doesn't exist
    .then(() => knex.schema.hasColumn('courses', 'chapter_id').then(exists => {
      if (!exists) {
        return knex.schema.table('courses', table => {
          table.integer('chapter_id').references('id').inTable('chapters').onDelete('SET NULL');
        });
      }
    }));
};

exports.down = function(knex) {
  return knex.schema
    .table('courses', table => {
      table.dropColumn('chapter_id');
    })
    .dropTableIfExists('user_chapter_roles')
    .dropTableIfExists('content_tags');
};
