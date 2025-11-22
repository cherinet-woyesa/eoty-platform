// Add missing columns to chapters table
exports.up = function(knex) {
  return knex.schema.alterTable('chapters', function(table) {
    // Add course_count column if it doesn't exist
    return knex.schema.hasColumn('chapters', 'course_count').then(function(exists) {
      if (!exists) {
        return knex.schema.alterTable('chapters', function(table) {
          table.integer('course_count').defaultTo(0);
        });
      }
    });
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('chapters', function(table) {
    return knex.schema.hasColumn('chapters', 'course_count').then(function(exists) {
      if (exists) {
        return knex.schema.alterTable('chapters', function(table) {
          table.dropColumn('course_count');
        });
      }
    });
  });
};
