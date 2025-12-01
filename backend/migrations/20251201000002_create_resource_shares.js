/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('resource_shares', function(table) {
    table.increments('id').primary();
    table.integer('resource_id').references('id').inTable('resources').onDelete('CASCADE');
    table.integer('chapter_id').references('id').inTable('chapters').onDelete('CASCADE');
    table.integer('shared_by').references('id').inTable('users').onDelete('SET NULL');
    table.string('share_type').notNullable().defaultTo('chapter'); // 'chapter', 'user', 'group'
    table.text('message');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('resource_shares');
};
