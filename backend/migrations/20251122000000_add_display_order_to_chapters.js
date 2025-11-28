// Add missing columns to chapters table
exports.up = async function(knex) {
  const hasDisplayOrder = await knex.schema.hasColumn('chapters', 'display_order');
  const hasCourseCount = await knex.schema.hasColumn('chapters', 'course_count');
  const hasLocation = await knex.schema.hasColumn('chapters', 'location');

  return knex.schema.alterTable('chapters', function(table) {
    // Add display_order if it doesn't exist
    if (!hasDisplayOrder) {
      table.integer('display_order').defaultTo(0);
    } else {
      table.integer('display_order').defaultTo(0).alter();
    }

    // Add course_count if it doesn't exist
    if (!hasCourseCount) {
      table.integer('course_count').defaultTo(0);
    }

    // Add location if it doesn't exist
    if (!hasLocation) {
      table.string('location').nullable();
    }

    // Ensure proper indexes - skipping to avoid duplicates as 000 creates them
    // table.index(['is_active', 'display_order']);
  });
};

exports.down = function(knex) {
  // No-op or careful removal
  return Promise.resolve();
};
