exports.up = async function(knex) {
  const hasInteractionLogs = await knex.schema.hasTable('interaction_logs');
  if (!hasInteractionLogs) {
    await knex.schema.createTable('interaction_logs', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
      table.string('session_id').notNullable();
      table.text('question').notNullable();
      table.text('response').notNullable();
      table.string('interaction_type').defaultTo('chat');
      table.string('language').defaultTo('en');
      table.jsonb('context').defaultTo('{}');
      table.jsonb('moderation_flags').defaultTo('{}');
      table.jsonb('faith_alignment').defaultTo('{}');
      table.jsonb('performance_metrics').defaultTo('{}');
      table.jsonb('user_feedback').defaultTo('{}');
      table.timestamp('timestamp').defaultTo(knex.fn.now());
    });
  }

  const hasPerformanceMetrics = await knex.schema.hasTable('performance_metrics');
  if (!hasPerformanceMetrics) {
    await knex.schema.createTable('performance_metrics', function(table) {
      table.increments('id').primary();
      table.string('session_id').notNullable();
      table.string('operation').notNullable();
      table.integer('response_time_ms').notNullable();
      table.integer('threshold_ms').defaultTo(3000);
      table.boolean('within_threshold').defaultTo(true);
      table.timestamp('timestamp').defaultTo(knex.fn.now());
    });
  }

  const hasUnsupportedLanguageLogs = await knex.schema.hasTable('unsupported_language_logs');
  if (!hasUnsupportedLanguageLogs) {
    await knex.schema.createTable('unsupported_language_logs', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
      table.string('session_id').nullable();
      table.string('detected_language').nullable();
      table.text('input_text').nullable();
      table.timestamp('timestamp').defaultTo(knex.fn.now());
    });
  }

  const hasUserPrivacySettings = await knex.schema.hasTable('user_privacy_settings');
  if (!hasUserPrivacySettings) {
    await knex.schema.createTable('user_privacy_settings', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.boolean('data_collection_enabled').defaultTo(true);
      table.boolean('analytics_enabled').defaultTo(true);
      table.integer('retention_period_days').defaultTo(365);
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.unique('user_id');
    });
  }
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('user_privacy_settings')
    .dropTableIfExists('unsupported_language_logs')
    .dropTableIfExists('performance_metrics')
    .dropTableIfExists('interaction_logs');
};
