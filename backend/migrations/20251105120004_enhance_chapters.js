/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Enhance chapters table with additional columns
  await knex.schema.alterTable('chapters', function(table) {
    // Check if columns exist before adding
    // Note: Knex will handle duplicate column errors gracefully in newer versions
    table.integer('display_order').defaultTo(0);
    table.integer('course_count').defaultTo(0);
  });
  
  // Add index for active_order
  const hasIndex = await knex.schema.raw(`
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'chapters' AND indexname = 'idx_chapters_active_order'
  `);
  
  if (hasIndex.rows.length === 0) {
    await knex.schema.alterTable('chapters', function(table) {
      table.index(['is_active', 'display_order'], 'idx_chapters_active_order');
    });
  }
  
  console.log('✓ Enhanced chapters table');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Remove the enhancements
  await knex.schema.alterTable('chapters', function(table) {
    table.dropIndex(['is_active', 'display_order'], 'idx_chapters_active_order');
  });
  
  await knex.schema.alterTable('chapters', function(table) {
    table.dropColumn('display_order');
    table.dropColumn('course_count');
  });
  
  console.log('✓ Removed enhancements from chapters table');
};
