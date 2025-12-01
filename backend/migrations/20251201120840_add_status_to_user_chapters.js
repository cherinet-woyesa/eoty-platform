/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('user_chapters', function(table) {
    table.string('status').defaultTo('approved'); // Default to approved for existing records to avoid breaking them
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('user_chapters', function(table) {
    table.dropColumn('status');
  });
};
