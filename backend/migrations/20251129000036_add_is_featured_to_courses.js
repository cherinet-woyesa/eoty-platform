exports.up = function(knex) {
  return knex.schema.table('courses', function(table) {
    table.boolean('is_featured').defaultTo(false);
  });
};

exports.down = function(knex) {
  return knex.schema.table('courses', function(table) {
    table.dropColumn('is_featured');
  });
};
