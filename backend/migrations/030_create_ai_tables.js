exports.up = function(knex) {
  return knex.schema
    // AI Conversations table
    .createTable('ai_conversations', function(table) {
      table.increments('id').primary();
      table.string('user_id').notNullable();
      table.string('session_id').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('last_activity').defaultTo(knex.fn.now());
      table.integer('message_count').defaultTo(0);
      table.boolean('needs_moderation').defaultTo(false);
      table.json('context_data').nullable();
      table.string('language').defaultTo('en');

      table.index(['user_id', 'session_id']);
      table.index(['last_activity']);
      table.index(['needs_moderation']);
    })

    // AI Messages table
    .createTable('ai_messages', function(table) {
      table.increments('id').primary();
      table.integer('conversation_id').unsigned().notNullable()
        .references('id').inTable('ai_conversations').onDelete('CASCADE');
      table.string('role').notNullable(); // 'user' or 'assistant'
      table.text('content').notNullable();
      table.json('metadata').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());

      table.index(['conversation_id']);
      table.index(['role']);
      table.index(['created_at']);
    })

    // AI Telemetry table
    .createTable('ai_telemetry', function(table) {
      table.increments('id').primary();
      table.string('user_id').notNullable();
      table.string('session_id').notNullable();
      table.json('context').nullable();
      table.integer('total_time_ms').defaultTo(0);
      table.boolean('success').defaultTo(false);
      table.text('error_message').nullable();
      table.float('faith_alignment_score').nullable();
      table.boolean('faith_aligned').nullable();
      table.string('interaction_type').nullable();
      table.timestamp('timestamp').defaultTo(knex.fn.now());

      table.index(['user_id']);
      table.index(['session_id']);
      table.index(['timestamp']);
      table.index(['interaction_type']);
    })

    // Moderated Queries table
    .createTable('moderated_queries', function(table) {
      table.increments('id').primary();
      table.text('original_query').notNullable();
      table.text('moderated_query').nullable();
      table.string('moderation_action').notNullable();
      table.json('moderation_reasons').nullable();
      table.string('user_id').notNullable();
      table.string('priority').defaultTo('medium'); // 'low', 'medium', 'high'
      table.string('status').defaultTo('pending'); // 'pending', 'reviewed', 'approved', 'rejected'
      table.integer('moderator_id').nullable();
      table.timestamp('moderated_at').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());

      table.index(['user_id']);
      table.index(['status']);
      table.index(['priority']);
      table.index(['created_at']);
    })

    // AI Conversation Summaries table
    .createTable('ai_conversation_summaries', function(table) {
      table.increments('id').primary();
      table.string('user_id').notNullable();
      table.string('session_id').notNullable();
      table.string('language').nullable();
      table.string('route').nullable();
      table.integer('question_length').defaultTo(0);
      table.integer('answer_length').defaultTo(0);
      table.boolean('flagged').defaultTo(false);
      table.float('faith_alignment_score').nullable();
      table.json('moderation_flags').nullable();
      table.string('interaction_type').nullable();
      table.timestamp('timestamp').defaultTo(knex.fn.now());

      table.index(['user_id']);
      table.index(['session_id']);
      table.index(['timestamp']);
      table.index(['interaction_type']);
    })

    // Admin Notifications table (for escalated content)
    .createTable('admin_notifications', function(table) {
      table.increments('id').primary();
      table.string('type').notNullable();
      table.string('title').notNullable();
      table.text('message').nullable();
      table.json('data').nullable();
      table.string('priority').defaultTo('medium'); // 'low', 'medium', 'high'
      table.string('status').defaultTo('unread'); // 'unread', 'read', 'dismissed'
      table.timestamp('created_at').defaultTo(knex.fn.now());

      table.index(['type']);
      table.index(['priority']);
      table.index(['status']);
      table.index(['created_at']);
    })

    // System Logs table (for AI errors and escalations)
    .createTable('system_logs', function(table) {
      table.increments('id').primary();
      table.string('log_type').notNullable();
      table.string('severity').defaultTo('info'); // 'debug', 'info', 'warning', 'error', 'critical'
      table.text('message').notNullable();
      table.timestamp('timestamp').defaultTo(knex.fn.now());

      table.index(['log_type']);
      table.index(['severity']);
      table.index(['timestamp']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('system_logs')
    .dropTableIfExists('admin_notifications')
    .dropTableIfExists('ai_conversation_summaries')
    .dropTableIfExists('moderated_queries')
    .dropTableIfExists('ai_telemetry')
    .dropTableIfExists('ai_messages')
    .dropTableIfExists('ai_conversations');
};
