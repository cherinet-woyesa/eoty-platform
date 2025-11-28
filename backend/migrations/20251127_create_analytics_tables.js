exports.up = async function(knex) {
  // Create performance_logs table
  const hasPerformanceLogs = await knex.schema.hasTable('performance_logs');
  if (!hasPerformanceLogs) {
    await knex.schema.createTable('performance_logs', function(table) {
      table.increments('id').primary();
      table.integer('interaction_id').unsigned().references('id').inTable('interaction_logs').onDelete('CASCADE');
      table.integer('response_time_ms').nullable();
      table.integer('ai_processing_time').nullable();
      table.integer('database_time').nullable();
      table.boolean('cache_hit').defaultTo(false);
      table.integer('total_time_ms').nullable();
      table.timestamp('timestamp').defaultTo(knex.fn.now());
    });
  }

  // Create faith_alignment_logs table
  const hasFaithAlignmentLogs = await knex.schema.hasTable('faith_alignment_logs');
  if (!hasFaithAlignmentLogs) {
    await knex.schema.createTable('faith_alignment_logs', function(table) {
      table.increments('id').primary();
      table.integer('interaction_id').unsigned().references('id').inTable('interaction_logs').onDelete('CASCADE');
      table.float('alignment_score').nullable();
      table.boolean('is_aligned').nullable();
      table.jsonb('issues').nullable();
      table.jsonb('warnings').nullable();
      table.jsonb('suggestions').nullable();
      table.timestamp('timestamp').defaultTo(knex.fn.now());
    });
  }

  // Create moderation_logs table
  const hasModerationLogs = await knex.schema.hasTable('moderation_logs');
  if (!hasModerationLogs) {
    await knex.schema.createTable('moderation_logs', function(table) {
      table.increments('id').primary();
      table.integer('interaction_id').unsigned().references('id').inTable('interaction_logs').onDelete('CASCADE');
      table.boolean('needs_moderation').defaultTo(false);
      table.jsonb('flags').nullable();
      table.string('severity').nullable();
      table.float('confidence').nullable();
      table.boolean('auto_moderated').defaultTo(false);
      table.timestamp('timestamp').defaultTo(knex.fn.now());
    });
  }

  // Create session_analytics table
  const hasSessionAnalytics = await knex.schema.hasTable('session_analytics');
  if (!hasSessionAnalytics) {
    await knex.schema.createTable('session_analytics', function(table) {
      table.increments('id').primary();
      table.string('session_id').notNullable();
      table.timestamp('start_time').nullable();
      table.timestamp('end_time').nullable();
      table.integer('interaction_count').defaultTo(0);
      table.float('avg_response_time').nullable();
      table.float('avg_faith_alignment').nullable();
      table.jsonb('languages_used').nullable();
      table.integer('moderation_event_count').defaultTo(0);
      table.timestamp('timestamp').defaultTo(knex.fn.now());
    });
  }
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('session_analytics')
    .dropTableIfExists('moderation_logs')
    .dropTableIfExists('faith_alignment_logs')
    .dropTableIfExists('performance_logs');
};
