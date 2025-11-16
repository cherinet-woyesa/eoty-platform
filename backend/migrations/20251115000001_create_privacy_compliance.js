/**
 * Migration: Create privacy compliance tables
 * REQUIREMENT: No sensitive data retention
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Privacy deletion logs
  await knex.schema.createTable('privacy_deletion_logs', (table) => {
    table.increments('id').primary();
    table.timestamp('deletion_date').defaultTo(knex.fn.now());
    table.integer('records_deleted').defaultTo(0);
    table.integer('retention_period_days');
    table.timestamp('cutoff_date');
    table.jsonb('details');
    table.timestamps(true, true);
    
    table.index(['deletion_date']);
  });

  // Add anonymized_at columns to sensitive tables if they don't exist
  const tables = [
    'ai_conversations',
    'user_lesson_progress',
    'user_quiz_attempts',
    'video_annotations',
    'lesson_discussions'
  ];

  for (const tableName of tables) {
    const hasTable = await knex.schema.hasTable(tableName);
    if (hasTable) {
      const hasColumn = await knex.schema.hasColumn(tableName, 'anonymized_at');
      if (!hasColumn) {
        await knex.schema.table(tableName, (table) => {
          table.timestamp('anonymized_at').nullable();
        });
      }
    }
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('privacy_deletion_logs');
  
  // Note: We don't drop anonymized_at columns to preserve data
};


