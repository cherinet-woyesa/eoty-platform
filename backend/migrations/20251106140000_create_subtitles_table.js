/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Create subtitles table
  await knex.schema.createTable('subtitles', function(table) {
    table.increments('id').primary();
    table.integer('lesson_id').unsigned().notNullable()
      .references('id').inTable('lessons').onDelete('CASCADE');
    table.string('language', 100).notNullable();
    table.string('language_code', 10).notNullable();
    table.text('file_url').notNullable();
    table.integer('file_size');
    table.integer('created_by');
    table.timestamps(true, true);
    
    // Unique constraint on lesson_id and language_code
    table.unique(['lesson_id', 'language_code'], 'unique_lesson_language');
    
    // Indexes
    table.index(['lesson_id'], 'idx_subtitles_lesson');
    table.index(['language_code'], 'idx_subtitles_language_code');
  });

  console.log('✓ Created subtitles table');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('subtitles');
  console.log('✓ Dropped subtitles table');
};
