/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // First create the missing moderation_escalations table
  await knex.schema.createTable('moderation_escalations', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users');
    table.text('content').notNullable();
    table.string('content_type').notNullable();
    table.text('reason').notNullable();
    table.string('priority', 20).defaultTo('medium');
    table.string('status', 50).defaultTo('pending');
    table.integer('reviewed_by').unsigned().references('id').inTable('users');
    table.text('resolution_notes');
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    table.timestamp('reviewed_at');
    
    table.index(['status', 'timestamp']);
    table.index(['user_id']);
    table.index(['priority']);
  });

  // Faith alignment and validation tables
  await knex.schema.createTable('faith_alignment_logs', (table) => {
    table.increments('id').primary();
    table.text('response_preview').notNullable();
    table.decimal('alignment_score', 3, 2).notNullable();
    table.jsonb('validation_issues');
    table.jsonb('context');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index(['alignment_score']);
    table.index(['created_at']);
  });

  await knex.schema.createTable('faith_alignment_validation', (table) => {
    table.increments('id').primary();
    table.text('question').notNullable();
    table.text('response').notNullable();
    table.decimal('alignment_score', 3, 2).notNullable();
    table.boolean('is_aligned').notNullable();
    table.jsonb('issues');
    table.jsonb('warnings');
    table.jsonb('suggestions');
    table.jsonb('context');
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    
    table.index(['alignment_score']);
    table.index(['timestamp']);
  });

  await knex.schema.createTable('doctrinal_review_queue', (table) => {
    table.increments('id').primary();
    table.text('question').notNullable();
    table.text('response').notNullable();
    table.decimal('alignment_score', 3, 2).notNullable();
    table.jsonb('issues');
    table.string('priority', 20).defaultTo('medium');
    table.string('status', 50).defaultTo('pending');
    table.integer('reviewed_by').unsigned().references('id').inTable('users');
    table.text('review_notes');
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    table.timestamp('reviewed_at');
    
    table.index(['priority', 'status']);
    table.index(['timestamp']);
  });

  // User context and learning tables
  await knex.schema.createTable('user_learning_sessions', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users');
    table.timestamp('session_date').notNullable();
    table.string('activity_type', 100).notNullable();
    table.integer('duration_minutes').defaultTo(0);
    table.jsonb('topics_covered');
    table.jsonb('details');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index(['user_id', 'session_date']);
  });

  await knex.schema.createTable('user_preferences', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users');
    table.string('preferred_language', 10).defaultTo('en-US');
    table.string('learning_pace', 20).defaultTo('moderate');
    table.jsonb('content_preferences');
    table.jsonb('accessibility_settings');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.unique(['user_id']);
    table.index(['user_id']);
  });

  await knex.schema.createTable('user_content_success', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users');
    table.string('content_type', 100).notNullable();
    table.decimal('success_rate', 5, 2).defaultTo(0);
    table.string('engagement_level', 20);
    table.integer('sample_size').defaultTo(0);
    table.timestamp('last_updated').defaultTo(knex.fn.now());
    
    table.index(['user_id']);
  });

  await knex.schema.createTable('context_usage_logs', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users');
    table.string('context_type', 255);
    table.jsonb('context_data');
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    
    table.index(['user_id', 'timestamp']);
  });

  await knex.schema.createTable('lesson_prerequisites', (table) => {
    table.increments('id').primary();
    table.integer('lesson_id').unsigned().notNullable().references('id').inTable('lessons');
    table.integer('prerequisite_lesson_id').unsigned().notNullable().references('id').inTable('lessons');
    table.string('importance', 20).defaultTo('recommended');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index(['lesson_id']);
  });

  // AI and model training tables
  await knex.schema.createTable('model_fine_tuning_logs', (table) => {
    table.increments('id').primary();
    table.string('model_id', 255);
    table.integer('training_examples');
    table.integer('validation_examples');
    table.string('base_model', 100);
    table.string('status', 50).defaultTo('preparing');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('completed_at');
    table.jsonb('performance_metrics');
  });

  // Enhanced moderation tables
  await knex.schema.createTable('auto_moderation_logs', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users');
    table.text('content').notNullable();
    table.string('moderation_decision', 50).notNullable();
    table.jsonb('flags');
    table.decimal('faith_alignment_score', 3, 2);
    table.decimal('confidence', 3, 2);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index(['user_id', 'created_at']);
  });

  await knex.schema.createTable('moderator_notifications', (table) => {
    table.increments('id').primary();
    table.string('type', 100).notNullable();
    table.string('title', 255).notNullable();
    table.text('message').notNullable();
    table.jsonb('data');
    table.string('priority', 20).defaultTo('medium');
    table.string('status', 50).defaultTo('unread');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('read_at');
    
    table.index(['priority', 'status']);
  });

  // Now create moderation_resolution_logs AFTER moderation_escalations exists
  await knex.schema.createTable('moderation_resolution_logs', (table) => {
    table.increments('id').primary();
    table.integer('escalation_id').unsigned().notNullable().references('id').inTable('moderation_escalations');
    table.integer('moderator_id').unsigned().notNullable().references('id').inTable('users');
    table.string('resolution_action', 50).notNullable();
    table.string('resolution_category', 100);
    table.text('resolution_notes');
    table.timestamp('resolved_at').defaultTo(knex.fn.now());
    
    table.index(['escalation_id']);
    table.index(['moderator_id', 'resolved_at']);
  });

  await knex.schema.createTable('moderation_settings', (table) => {
    table.increments('id').primary();
    table.string('setting_key', 100).notNullable().unique();
    table.jsonb('setting_value').notNullable();
    table.integer('updated_by').unsigned().references('id').inTable('users');
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Multilingual and translation tables
  await knex.schema.createTable('language_usage_logs', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users');
    table.string('detected_language', 10).notNullable();
    table.text('input_text');
    table.decimal('confidence', 3, 2);
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    
    table.index(['user_id', 'timestamp']);
    table.index(['detected_language', 'timestamp']);
  });

  await knex.schema.createTable('translation_logs', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users');
    table.string('source_language', 10).notNullable();
    table.string('target_language', 10).notNullable();
    table.text('original_text');
    table.text('translated_text');
    table.string('translation_quality', 20);
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    
    table.index(['source_language', 'target_language', 'timestamp']);
  });

  // Performance and analytics tables
  await knex.schema.createTable('performance_metrics', (table) => {
    table.increments('id').primary();
    table.string('session_id', 255).notNullable();
    table.string('operation', 100).notNullable();
    table.integer('response_time_ms').notNullable();
    table.boolean('within_threshold').notNullable();
    table.integer('threshold_ms').notNullable();
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    
    table.index(['timestamp']);
  });

  await knex.schema.createTable('accuracy_metrics', (table) => {
    table.increments('id').primary();
    table.string('session_id', 255).notNullable();
    table.text('question').notNullable();
    table.text('response').notNullable();
    table.decimal('accuracy_score', 3, 2).notNullable();
    table.boolean('is_accurate').notNullable();
    table.decimal('faith_alignment', 3, 2);
    table.jsonb('moderation_flags');
    table.string('user_feedback', 50);
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    
    table.index(['timestamp']);
  });

  await knex.schema.createTable('performance_alerts', (table) => {
    table.increments('id').primary();
    table.string('alert_type', 50).notNullable();
    table.string('severity', 20).notNullable();
    table.text('message').notNullable();
    table.string('metric', 50).notNullable();
    table.decimal('metric_value', 5, 2).notNullable();
    table.timestamp('timestamp').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('interaction_logs', (table) => {
    table.increments('id').primary();
    table.string('session_id', 255).notNullable();
    table.integer('user_id').unsigned().references('id').inTable('users');
    table.string('interaction_type', 50).notNullable();
    table.text('question');
    table.text('response');
    table.jsonb('context');
    table.jsonb('performance_metrics');
    table.jsonb('faith_alignment');
    table.jsonb('moderation_flags');
    table.string('language', 10);
    table.string('user_feedback', 50);
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    
    table.index(['user_id', 'timestamp']);
    table.index(['session_id']);
  });

  await knex.schema.createTable('performance_logs', (table) => {
    table.increments('id').primary();
    table.integer('interaction_id').unsigned().references('id').inTable('interaction_logs');
    table.integer('response_time_ms').notNullable();
    table.integer('ai_processing_time');
    table.integer('database_time');
    table.boolean('cache_hit');
    table.integer('total_time_ms').notNullable();
    table.timestamp('timestamp').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('session_analytics', (table) => {
    table.increments('id').primary();
    table.string('session_id', 255).notNullable();
    table.timestamp('start_time').notNullable();
    table.timestamp('end_time').notNullable();
    table.integer('interaction_count').notNullable();
    table.decimal('avg_response_time', 8, 2).notNullable();
    table.decimal('avg_faith_alignment', 3, 2).notNullable();
    table.specificType('languages_used', 'VARCHAR(10)[]');
    table.integer('moderation_event_count').notNullable();
    table.timestamp('timestamp').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('unsupported_language_logs', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users');
    table.string('session_id', 255).notNullable();
    table.string('detected_language', 10).notNullable();
    table.text('input_text').notNullable();
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    
    table.index(['user_id', 'timestamp']);
  });

  // System jobs table (for cleanup jobs)
  await knex.schema.createTable('system_jobs', (table) => {
    table.increments('id').primary();
    table.string('job_name', 255).notNullable().unique();
    table.string('job_type', 100).notNullable();
    table.string('schedule', 100).notNullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('last_run_at');
  });

  // Insert default moderation settings
  await knex('moderation_settings').insert([
    { setting_key: 'faithAlignmentThreshold', setting_value: JSON.stringify(0.6) },
    { setting_key: 'sensitiveTopicCount', setting_value: JSON.stringify(2) },
    { setting_key: 'autoModerateConfidence', setting_value: JSON.stringify(0.8) },
    { setting_key: 'highSeverityAutoEscalate', setting_value: JSON.stringify(true) }
  ]).onConflict('setting_key').ignore();

  // Insert cleanup jobs
  await knex('system_jobs').insert([
    { job_name: 'cleanup_old_metrics', job_type: 'cleanup', schedule: '0 2 * * *', is_active: true },
    { job_name: 'cleanup_old_analytics', job_type: 'cleanup', schedule: '0 3 * * *', is_active: true }
  ]).onConflict('job_name').ignore();
};

exports.down = async function(knex) {
  // Drop tables in reverse order
  const tables = [
    'system_jobs',
    'unsupported_language_logs',
    'session_analytics',
    'performance_logs',
    'interaction_logs',
    'performance_alerts',
    'accuracy_metrics',
    'performance_metrics',
    'translation_logs',
    'language_usage_logs',
    'moderation_settings',
    'moderation_resolution_logs',
    'moderator_notifications',
    'auto_moderation_logs',
    'model_fine_tuning_logs',
    'lesson_prerequisites',
    'context_usage_logs',
    'user_content_success',
    'user_preferences',
    'user_learning_sessions',
    'doctrinal_review_queue',
    'faith_alignment_validation',
    'faith_alignment_logs',
    'moderation_escalations' // Add this to drop list
  ];

  for (const table of tables) {
    await knex.schema.dropTableIfExists(table);
  }
};