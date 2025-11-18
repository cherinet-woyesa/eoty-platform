/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if table already exists
  const hasTable = await knex.schema.hasTable('course_categories');
  if (hasTable) {
    console.log('✓ course_categories table already exists, skipping migration');
    return;
  }

  // Create course_categories table
  await knex.schema.createTable('course_categories', function(table) {
    table.increments('id').primary();
    table.string('name', 50).notNullable().unique();
    table.string('slug', 50).notNullable().unique();
    table.string('icon', 50);
    table.text('description');
    table.integer('display_order').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.integer('created_by');
    table.timestamps(true, true);
    
    // Indexes
    table.index(['is_active', 'display_order'], 'idx_categories_active_order');
    table.index(['slug'], 'idx_categories_slug');
    table.index(['created_by'], 'idx_categories_created_by');
  });

  console.log('✓ Created course_categories table');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('course_categories');
  console.log('✓ Dropped course_categories table');
};
