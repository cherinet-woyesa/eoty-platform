/**
 * Script to create course_durations table if it doesn't exist.
 * Mirrors migration 20251105120002_create_course_durations.js
 * so dashboard/system config features work even if migrations haven't run cleanly.
 */
const db = require('../config/database');

async function createCourseDurationsTable() {
  try {
    const hasTable = await db.schema.hasTable('course_durations');

    if (hasTable) {
      console.log('✓ course_durations table already exists');
      return;
    }

    await db.schema.createTable('course_durations', (table) => {
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

    console.log('✓ Created course_durations table successfully');
  } catch (error) {
    console.error('❌ Error creating course_durations table:', error.message);
    throw error;
  } finally {
    await db.destroy();
  }
}

createCourseDurationsTable()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });


