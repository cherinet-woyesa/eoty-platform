/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if table already exists
  const hasTable = await knex.schema.hasTable('course_durations');
  if (hasTable) {
    console.log('✓ course_durations table already exists, skipping migration');
    return;
  }

  // Create course_durations table
  await knex.schema.createTable('course_durations', function(table) {
    table.increments('id').primary();
    table.string('value', 20).notNullable().unique();
    table.string('label', 30).notNullable();
    table.integer('weeks_min');
    table.integer('weeks_max');
    table.integer('display_order').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.integer('created_by');
    table.timestamps(true, true);
    
    // Indexes
    table.index(['is_active', 'display_order'], 'idx_durations_active_order');
    table.index(['created_by'], 'idx_durations_created_by');
  });

  console.log('✓ Created course_durations table');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('course_durations');
  console.log('✓ Dropped course_durations table');
};
