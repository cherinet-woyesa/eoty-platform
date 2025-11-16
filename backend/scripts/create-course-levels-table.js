/**
 * Script to create course_levels table if it doesn't exist.
 * Mirrors migration 20251105120001_create_course_levels.js
 * so system-config metrics and course metadata work even if migrations haven't run cleanly.
 */
const db = require('../config/database');

async function createCourseLevelsTable() {
  try {
    const hasTable = await db.schema.hasTable('course_levels');

    if (hasTable) {
      console.log('✓ course_levels table already exists');
      return;
    }

    await db.schema.createTable('course_levels', (table) => {
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

    console.log('✓ Created course_levels table successfully');
  } catch (error) {
    console.error('❌ Error creating course_levels table:', error.message);
    throw error;
  } finally {
    await db.destroy();
  }
}

createCourseLevelsTable()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });


