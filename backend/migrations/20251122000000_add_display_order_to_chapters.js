// Add missing columns to chapters table
exports.up = function(knex) {
  return knex.schema.alterTable('chapters', function(table) {
    // Add display_order if it doesn't exist
    table.integer('display_order').defaultTo(0).alter();

    // Add course_count if it doesn't exist
    if (!table.hasColumn('course_count')) {
      table.integer('course_count').defaultTo(0);
    }

    // Add location if it doesn't exist
    if (!table.hasColumn('location')) {
      table.string('location').nullable();
    }

    // Ensure proper indexes
    table.index(['is_active', 'display_order']);
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('chapters', function(table) {
    // Remove added columns
    if (table.hasColumn('course_count')) {
      table.dropColumn('course_count');
    }
    if (table.hasColumn('location')) {
      table.dropColumn('location');
    }
    table.dropIndex(['is_active', 'display_order']);
  });
};
