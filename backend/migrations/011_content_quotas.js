/**
 * Migration: Create content_quotas table
 * FR5: Content quota management for chapters
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if table already exists
  const hasTable = await knex.schema.hasTable('content_quotas');
  if (hasTable) {
    console.log('✓ content_quotas table already exists, skipping migration');
    return;
  }

  await knex.schema.createTable('content_quotas', (table) => {
    table.increments('id').primary();
    // Note: chapter_id can be integer (from chapters.id) or string (chapter name/slug)
    // We'll store it as integer but handle both cases in the application code
    table.integer('chapter_id').unsigned().notNullable().references('id').inTable('chapters').onDelete('CASCADE');
    table.string('content_type').notNullable(); // video, document, image, audio
    table.integer('monthly_limit').defaultTo(0); // 0 = unlimited
    table.integer('current_usage').defaultTo(0);
    table.date('period_start').notNullable(); // Start of quota period (usually first day of month)
    table.date('period_end').notNullable(); // End of quota period (usually last day of month)
    table.timestamps(true, true);
    
    // Unique constraint: one quota per chapter, content type, and period
    table.unique(['chapter_id', 'content_type', 'period_start', 'period_end']);
    table.index(['chapter_id', 'content_type']);
    table.index(['period_start', 'period_end']);
  });
  console.log('✓ Created content_quotas table');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('content_quotas');
};

