exports.up = function(knex) {
  return knex.schema.alterTable('user_course_enrollments', function(table) {
    table.float('progress').defaultTo(0);
    table.timestamp('last_accessed_at').defaultTo(knex.fn.now());
    table.timestamp('completed_at').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('user_course_enrollments', function(table) {
    table.dropColumn('completed_at');
    table.dropColumn('last_accessed_at');
    table.dropColumn('progress');
  });
};
