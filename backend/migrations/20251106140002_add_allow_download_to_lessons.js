/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Add allow_download column to lessons table
  await knex.schema.table('lessons', function(table) {
    table.boolean('allow_download').defaultTo(false);
  });

  console.log('✓ Added allow_download column to lessons table');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Remove allow_download column from lessons table
  await knex.schema.table('lessons', function(table) {
    table.dropColumn('allow_download');
  });

  console.log('✓ Removed allow_download column from lessons table');
};
