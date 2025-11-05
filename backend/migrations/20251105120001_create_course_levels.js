/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Create course_levels table
  await knex.schema.createTable('course_levels', function(table) {
    table.increments('id').primary();
    table.string('name', 30).notNullable().unique();
    table.string('slug', 30).notNullable().unique();
    table.string('description', 100);
    table.integer('display_order').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.integer('created_by');
    table.timestamps(true, true);
    
    // Indexes
    table.index(['is_active', 'display_order'], 'idx_levels_active_order');
    table.index(['slug'], 'idx_levels_slug');
    table.index(['created_by'], 'idx_levels_created_by');
  });

  console.log('✓ Created course_levels table');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('course_levels');
  console.log('✓ Dropped course_levels table');
};
