/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if content_tags table exists
  const hasTable = await knex.schema.hasTable('content_tags');
  
  if (!hasTable) {
    // Create content_tags table if it doesn't exist
    await knex.schema.createTable('content_tags', function(table) {
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
    
    console.log('✓ Created content_tags table');
  } else {
    // Enhance existing content_tags table
    await knex.schema.alterTable('content_tags', function(table) {
      // Check and add columns if they don't exist
      table.string('category', 50);
      table.string('color', 7).defaultTo('#3B82F6');
      table.integer('display_order').defaultTo(0);
      table.integer('usage_count').defaultTo(0);
    });
    
    // Add indexes if they don't exist
    const hasIndexCategory = await knex.schema.raw(`
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'content_tags' AND indexname = 'idx_tags_category'
    `);
    
    if (hasIndexCategory.rows.length === 0) {
      await knex.schema.alterTable('content_tags', function(table) {
        table.index(['category'], 'idx_tags_category');
      });
    }
    
    const hasIndexUsage = await knex.schema.raw(`
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'content_tags' AND indexname = 'idx_tags_usage'
    `);
    
    if (hasIndexUsage.rows.length === 0) {
      await knex.schema.alterTable('content_tags', function(table) {
        table.index(['usage_count'], 'idx_tags_usage');
      });
    }
    
    console.log('✓ Enhanced content_tags table');
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  const hasTable = await knex.schema.hasTable('content_tags');
  
  if (hasTable) {
    // Check if table was created by this migration (has all our columns)
    const columns = await knex('information_schema.columns')
      .where({ table_name: 'content_tags' })
      .select('column_name');
    
    const columnNames = columns.map(c => c.column_name);
    const hasOurColumns = ['category', 'color', 'display_order', 'usage_count'].every(
      col => columnNames.includes(col)
    );
    
    if (hasOurColumns && columnNames.length <= 10) {
      // This looks like our table, drop it
      await knex.schema.dropTableIfExists('content_tags');
      console.log('✓ Dropped content_tags table');
    } else {
      // Just remove the columns we added
      await knex.schema.alterTable('content_tags', function(table) {
        table.dropColumn('category');
        table.dropColumn('color');
        table.dropColumn('display_order');
        table.dropColumn('usage_count');
      });
      
      // Drop indexes
      await knex.schema.alterTable('content_tags', function(table) {
        table.dropIndex(['category'], 'idx_tags_category');
        table.dropIndex(['usage_count'], 'idx_tags_usage');
      });
      
      console.log('✓ Removed enhancements from content_tags table');
    }
  }
};
