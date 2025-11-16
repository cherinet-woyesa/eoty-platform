/**
 * Script to create course_categories table if it doesn't exist.
 * Mirrors migration 20251105120000_create_course_categories.js
 * so dashboard/system config features work even if migrations haven't run cleanly.
 */
const db = require('../config/database');

async function createCourseCategoriesTable() {
  try {
    const hasTable = await db.schema.hasTable('course_categories');

    if (hasTable) {
      console.log('✓ course_categories table already exists');
      return;
    }

    await db.schema.createTable('course_categories', (table) => {
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

    console.log('✓ Created course_categories table successfully');
  } catch (error) {
    console.error('❌ Error creating course_categories table:', error.message);
    throw error;
  } finally {
    await db.destroy();
  }
}

createCourseCategoriesTable()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });


