exports.up = function(knex) {
  return knex.schema.table('lessons', function(table) {
    // Add duration column to track lesson duration in minutes
    table.integer('duration').defaultTo(0).comment('Duration of the lesson in minutes');
  });
};

exports.down = function(knex) {
  return knex.schema.table('lessons', function(table) {
    // Remove duration column
    table.dropColumn('duration');
  });
};