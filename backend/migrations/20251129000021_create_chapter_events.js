/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('chapter_events', function(table) {
    table.increments('id').primary();
    table.integer('chapter_id').references('id').inTable('chapters').onDelete('CASCADE');
    table.string('title').notNullable();
    table.text('description').nullable();
    table.timestamp('event_date').notNullable();
    table.string('location').nullable(); // Physical location
    table.boolean('is_online').defaultTo(false);
    table.string('meeting_link').nullable();
    table.integer('created_by').references('id').inTable('users');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('chapter_events');
};
