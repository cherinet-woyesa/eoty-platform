/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('chapter_resources', function(table) {
      table.increments('id').primary();
      table.integer('chapter_id').unsigned().references('id').inTable('chapters').onDelete('CASCADE');
      table.string('title').notNullable();
      table.string('type').notNullable(); // 'link' or 'file'
      table.string('url').notNullable();
      table.text('description');
      table.integer('created_by').unsigned().references('id').inTable('users');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    .createTable('chapter_announcements', function(table) {
      table.increments('id').primary();
      table.integer('chapter_id').unsigned().references('id').inTable('chapters').onDelete('CASCADE');
      table.string('title').notNullable();
      table.text('content').notNullable();
      table.boolean('is_pinned').defaultTo(false);
      table.integer('created_by').unsigned().references('id').inTable('users');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    .createTable('event_attendance', function(table) {
      table.increments('id').primary();
      table.integer('event_id').unsigned().references('id').inTable('chapter_events').onDelete('CASCADE');
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
      table.string('status').defaultTo('present'); // 'present', 'absent', 'excused'
      table.integer('marked_by').unsigned().references('id').inTable('users');
      table.timestamp('marked_at').defaultTo(knex.fn.now());
      table.unique(['event_id', 'user_id']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('event_attendance')
    .dropTableIfExists('chapter_announcements')
    .dropTableIfExists('chapter_resources');
};
