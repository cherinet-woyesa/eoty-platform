/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('chapter_applications', function(table) {
    table.increments('id').primary();
    table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('type').notNullable(); // 'new_chapter' or 'leadership'
    table.string('status').defaultTo('pending'); // pending, approved, rejected
    table.jsonb('data').notNullable(); // Stores application details
    table.text('admin_notes').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('chapter_applications');
};
