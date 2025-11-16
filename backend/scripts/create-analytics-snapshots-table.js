/**
 * Script to create analytics_snapshots table if it doesn't exist
 */
const db = require('../config/database');

async function createAnalyticsSnapshotsTable() {
  try {
    // Check if table exists
    const hasTable = await db.schema.hasTable('analytics_snapshots');
    
    if (hasTable) {
      console.log('✓ analytics_snapshots table already exists');
      await db.destroy();
      return;
    }

    // Create the table
    await db.schema.createTable('analytics_snapshots', (table) => {
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
    
    console.log('✓ Created analytics_snapshots table successfully');
    
    // Check if we need to add the columns from the later migration
    const hasAccuracyScore = await db.schema.hasColumn('analytics_snapshots', 'accuracy_score');
    if (!hasAccuracyScore) {
      await db.schema.table('analytics_snapshots', (table) => {
        table.decimal('accuracy_score', 5, 4).nullable();
        table.timestamp('verified_at').nullable();
      });
      console.log('✓ Added accuracy_score and verified_at columns');
    }
    
  } catch (error) {
    console.error('❌ Error creating analytics_snapshots table:', error.message);
    throw error;
  } finally {
    await db.destroy();
  }
}

createAnalyticsSnapshotsTable()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

