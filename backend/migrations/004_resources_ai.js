// Placeholder migration (no-op)
exports.up = function(knex) {
  return knex.schema
    .createTable('resources', function(table) {
      table.increments('id').primary();
      table.string('title').notNullable();
      table.text('description').nullable();
      table.string('author').nullable();
      table.string('category').nullable();
      table.string('language').defaultTo('en');
      table.jsonb('tags').defaultTo('[]');
      table.integer('chapter_id').unsigned().nullable().references('id').inTable('chapters').onDelete('SET NULL');
      table.integer('course_id').unsigned().nullable().references('id').inTable('courses').onDelete('SET NULL');
      table.integer('lesson_id').unsigned().nullable().references('id').inTable('lessons').onDelete('SET NULL');
      table.string('resource_scope').defaultTo('platform_wide'); // 'course_specific', 'chapter_wide', 'platform_wide'
      table.boolean('is_public').defaultTo(true);
      table.timestamp('published_at').defaultTo(knex.fn.now());
      table.timestamps(true, true);
    })
    .createTable('user_notes', function(table) {
      table.increments('id').primary();
      table.integer('resource_id').unsigned().notNullable().references('id').inTable('resources').onDelete('CASCADE');
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.text('content').notNullable();
      table.boolean('is_public').defaultTo(false);
      table.timestamps(true, true);
    })
    .createTable('ai_summaries', function(table) {
      table.increments('id').primary();
      table.integer('resource_id').unsigned().notNullable().references('id').inTable('resources').onDelete('CASCADE');
      table.string('summary_type').defaultTo('brief');
      table.text('content').notNullable();
      table.timestamps(true, true);
      table.unique(['resource_id', 'summary_type']);
    })
    .createTable('resource_permissions', function(table) {
      table.increments('id').primary();
      table.integer('resource_id').unsigned().notNullable().references('id').inTable('resources').onDelete('CASCADE');
      table.string('role').notNullable();
      table.string('permission_type').defaultTo('view');
      table.timestamps(true, true);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('resource_permissions')
    .dropTableIfExists('ai_summaries')
    .dropTableIfExists('user_notes')
    .dropTableIfExists('resources');
};
