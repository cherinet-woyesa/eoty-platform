/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('chapters', function(table) {
    table.string('contact_email').nullable();
    table.string('meeting_time').nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('chapters', function(table) {
    table.dropColumn('meeting_time');
    table.dropColumn('contact_email');
  });
};
