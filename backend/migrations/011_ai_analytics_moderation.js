/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if table already exists
  const hasTable = await knex.schema.hasTable('ai_conversations');
  if (hasTable) {
    console.log('✓ AI tables already exist, skipping migration');
    return;
  }

  // AI Conversations
  await knex.schema.createTable('ai_conversations', (table) => {
    table.increments('id').primary();
    table.string('user_id').notNullable(); // Changed to string to match users table
    table.integer('resource_id').unsigned().references('id').inTable('resources').onDelete('CASCADE');
    table.string('title');
    table.string('context_type'); // lesson, resource, general
    table.jsonb('conversation_context');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    table.index(['user_id', 'is_active']);
    table.index(['resource_id']);
  });

  // AI Messages
  await knex.schema.createTable('ai_messages', (table) => {
    table.increments('id').primary();
    table.integer('conversation_id').unsigned().references('id').inTable('ai_conversations').onDelete('CASCADE');
    table.text('message').notNullable();
    table.boolean('is_user_message').defaultTo(true);
    table.jsonb('metadata');
    table.decimal('faith_alignment_score', 3, 2);
    table.jsonb('moderation_flags');
    table.timestamps(true, true);
    
    table.index(['conversation_id', 'created_at']);
    table.index(['is_user_message']);
  });

  // Faith Alignment System
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

  // Moderation System
  await knex.schema.createTable('moderation_escalations', (table) => {
    table.increments('id').primary();
    table.string('user_id').notNullable(); // Changed to string to match users table
    table.text('content').notNullable();
    table.string('content_type').notNullable();
    table.text('reason').notNullable();
    table.string('priority', 20).defaultTo('medium');
    table.string('status', 50).defaultTo('pending');
    table.string('reviewed_by'); // Changed to string to match users table
    table.text('resolution_notes');
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    table.timestamp('reviewed_at');
    
    table.index(['status', 'timestamp']);
    table.index(['user_id']);
    table.index(['priority']);
  });

  await knex.schema.createTable('moderation_resolution_logs', (table) => {
    table.increments('id').primary();
    table.integer('escalation_id').unsigned().notNullable().references('id').inTable('moderation_escalations');
    table.string('moderator_id').notNullable(); // Changed to string to match users table
    table.string('resolution_action', 50).notNullable();
    table.string('resolution_category', 100);
    table.text('resolution_notes');
    table.timestamp('resolved_at').defaultTo(knex.fn.now());
    
    table.index(['escalation_id']);
    table.index(['moderator_id', 'resolved_at']);
  });

  await knex.schema.createTable('auto_moderation_logs', (table) => {
    table.increments('id').primary();
    table.string('user_id').notNullable(); // Changed to string to match users table
    table.text('content').notNullable();
    table.string('moderation_decision', 50).notNullable();
    table.jsonb('flags');
    table.decimal('faith_alignment_score', 3, 2);
    table.decimal('confidence', 3, 2);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index(['user_id', 'created_at']);
    table.index(['moderation_decision', 'created_at']);
  });

  // Doctrinal Review System
  await knex.schema.createTable('doctrinal_review_queue', (table) => {
    table.increments('id').primary();
    table.text('question').notNullable();
    table.text('response').notNullable();
    table.decimal('alignment_score', 3, 2).notNullable();
    table.jsonb('issues');
    table.string('priority', 20).defaultTo('medium');
    table.string('status', 50).defaultTo('pending');
    table.string('reviewed_by'); // Changed to string to match users table
    table.text('review_notes');
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    table.timestamp('reviewed_at');
    
    table.index(['priority', 'status']);
    table.index(['timestamp']);
  });

  // Moderator Tools
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
    table.index(['type', 'created_at']);
  });

  await knex.schema.createTable('moderation_settings', (table) => {
    table.increments('id').primary();
    table.string('setting_key', 100).notNullable().unique();
    table.jsonb('setting_value').notNullable();
    table.string('updated_by'); // Changed to string to match users table
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Model Training
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
    
    table.index(['status', 'created_at']);
  });

  // Insert default moderation settings
  await knex('moderation_settings').insert([
    { setting_key: 'faithAlignmentThreshold', setting_value: JSON.stringify(0.6) },
    { setting_key: 'sensitiveTopicCount', setting_value: JSON.stringify(2) },
    { setting_key: 'autoModerateConfidence', setting_value: JSON.stringify(0.8) },
    { setting_key: 'highSeverityAutoEscalate', setting_value: JSON.stringify(true) },
    { setting_key: 'moderationEnabled', setting_value: JSON.stringify(true) },
    { setting_key: 'faithValidationEnabled', setting_value: JSON.stringify(true) }
  ]).onConflict('setting_key').ignore();
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('model_fine_tuning_logs');
  await knex.schema.dropTableIfExists('moderation_settings');
  await knex.schema.dropTableIfExists('moderator_notifications');
  await knex.schema.dropTableIfExists('doctrinal_review_queue');
  await knex.schema.dropTableIfExists('auto_moderation_logs');
  await knex.schema.dropTableIfExists('moderation_resolution_logs');
  await knex.schema.dropTableIfExists('moderation_escalations');
  await knex.schema.dropTableIfExists('faith_alignment_validation');
  await knex.schema.dropTableIfExists('faith_alignment_logs');
  await knex.schema.dropTableIfExists('ai_messages');
  await knex.schema.dropTableIfExists('ai_conversations');
};