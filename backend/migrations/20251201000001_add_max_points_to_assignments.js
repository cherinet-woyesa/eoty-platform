exports.up = function(knex) {
  return knex.schema.table('assignments', function(table) {
    table.integer('max_points').defaultTo(100);
  });
};

exports.down = function(knex) {
  return knex.schema.table('assignments', function(table) {
    table.dropColumn('max_points');
  });
};
