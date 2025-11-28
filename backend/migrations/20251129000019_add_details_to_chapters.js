/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('chapters', function(table) {
    table.string('country').nullable();
    table.string('city').nullable();
    table.string('region').nullable();
    table.string('timezone').nullable();
    table.string('language').defaultTo('en');
    table.jsonb('topics').defaultTo('[]');
    table.float('latitude').nullable();
    table.float('longitude').nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('chapters', function(table) {
    table.dropColumn('country');
    table.dropColumn('city');
    table.dropColumn('region');
    table.dropColumn('timezone');
    table.dropColumn('language');
    table.dropColumn('topics');
    table.dropColumn('latitude');
    table.dropColumn('longitude');
  });
};
