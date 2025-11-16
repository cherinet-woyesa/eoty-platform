/**
 * Script to create content_tags table if it doesn't exist.
 * Mirrors the intent of migration 20251105120003_create_content_tags.js
 * so that admin tagging features work even if migrations haven't run cleanly.
 */
const db = require('../config/database');

async function createContentTagsTable() {
  try {
    const hasTable = await db.schema.hasTable('content_tags');

    if (hasTable) {
      console.log('✓ content_tags table already exists');
      return;
    }

    await db.schema.createTable('content_tags', (table) => {
      table.increments('id').primary();
      table.string('name', 30).notNullable().unique();
      table.string('category', 50);
      table.string('color', 7).defaultTo('#3B82F6');
      table.integer('display_order').defaultTo(0);
      table.integer('usage_count').defaultTo(0);
      table.boolean('is_active').defaultTo(true);
      table.integer('created_by');
      table.timestamps(true, true);

      // Indexes
      table.index(['category'], 'idx_tags_category');
      table.index(['usage_count'], 'idx_tags_usage');
      table.index(['created_by'], 'idx_tags_created_by');
    });

    console.log('✓ Created content_tags table successfully');
  } catch (error) {
    console.error('❌ Error creating content_tags table:', error.message);
    throw error;
  } finally {
    await db.destroy();
  }
}

createContentTagsTable()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });


