/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Create lesson_resources table
  await knex.schema.createTable('lesson_resources', function(table) {
    table.increments('id').primary();
    table.integer('lesson_id').unsigned().notNullable()
      .references('id').inTable('lessons').onDelete('CASCADE');
    table.string('filename', 255).notNullable();
    table.string('original_filename', 255).notNullable();
    table.string('file_type', 50);
    table.integer('file_size');
    table.text('file_url').notNullable();
    table.text('description');
    table.integer('download_count').defaultTo(0);
    table.integer('created_by');
    table.timestamps(true, true);
    
    // Indexes
    table.index(['lesson_id'], 'idx_lesson_resources_lesson');
    table.index(['created_by'], 'idx_lesson_resources_created_by');
    table.index(['file_type'], 'idx_lesson_resources_file_type');
  });

  console.log('✓ Created lesson_resources table');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('lesson_resources');
  console.log('✓ Dropped lesson_resources table');
};
