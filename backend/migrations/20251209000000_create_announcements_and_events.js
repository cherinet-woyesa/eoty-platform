/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('announcements', function(table) {
      table.increments('id').primary();
      table.string('title').notNullable();
      table.text('content').notNullable();
      table.string('type').defaultTo('global'); // global, teacher, student, course
      table.integer('target_id').nullable(); // course_id, etc.
      table.string('priority').defaultTo('normal'); // low, normal, high, urgent
      table.timestamp('expires_at').nullable();
      table.integer('created_by').references('id').inTable('users');
      table.boolean('is_active').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('events', function(table) {
      table.increments('id').primary();
      table.string('title').notNullable();
      table.text('description').nullable();
      table.timestamp('start_time').notNullable();
      table.timestamp('end_time').notNullable();
      table.string('location').nullable();
      table.boolean('is_online').defaultTo(false);
      table.string('meeting_link').nullable();
      table.string('type').defaultTo('global'); // global, teacher, course
      table.integer('target_id').nullable();
      table.integer('created_by').references('id').inTable('users');
      table.boolean('is_cancelled').defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTable('events')
    .dropTable('announcements');
};
