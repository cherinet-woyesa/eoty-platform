/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('badges', function(table) {
    table.boolean('is_manual').defaultTo(false).comment('If true, this badge can be manually awarded by teachers/admins');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('badges', function(table) {
    table.dropColumn('is_manual');
  });
};
