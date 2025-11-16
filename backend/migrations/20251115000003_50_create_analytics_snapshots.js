/**
 * Migration: Create analytics_snapshots table
 * This table stores daily analytics snapshots for the admin dashboard
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if table already exists
  const hasTable = await knex.schema.hasTable('analytics_snapshots');
  
  if (!hasTable) {
    await knex.schema.createTable('analytics_snapshots', (table) => {
      table.increments('id').primary();
      table.string('snapshot_type', 50).notNullable(); // 'daily', 'weekly', 'monthly', etc.
      table.timestamp('snapshot_date').notNullable();
      table.text('metrics'); // JSON string of metrics data
      table.text('chapter_comparison'); // JSON string of chapter comparison data
      table.text('trends'); // JSON string of trends data
      table.timestamps(true, true); // created_at, updated_at
      
      // Indexes for efficient querying
      table.index('snapshot_type');
      table.index('snapshot_date');
      table.index(['snapshot_type', 'snapshot_date']);
    });
    
    console.log('✓ Created analytics_snapshots table');
  } else {
    console.log('✓ analytics_snapshots table already exists');
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('analytics_snapshots');
  console.log('✓ Dropped analytics_snapshots table');
};

