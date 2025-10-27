exports.up = function(knex) {
  return knex.schema
    .createTable('ai_conversations', function(table) {
      table.increments('id').primary();
      table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('session_id').notNullable();
      table.text('context_data'); // JSON string of conversation context
      table.timestamps(true, true);
      
      table.index(['user_id', 'session_id']);
    })
    .createTable('ai_messages', function(table) {
      table.increments('id').primary();
      table.integer('conversation_id').references('id').inTable('ai_conversations').onDelete('CASCADE');
      table.enum('role', ['user', 'assistant', 'system']).notNullable();
      table.text('content').notNullable();
      table.jsonb('metadata'); // Flags, moderation data, etc.
      table.timestamps(true, true);
      
      table.index(['conversation_id', 'created_at']);
    })
    .createTable('moderated_queries', function(table) {
      table.increments('id').primary();
      table.integer('user_id').references('id').inTable('users');
      table.text('original_query').notNullable();
      table.text('moderation_reason');
      table.string('status').defaultTo('pending'); // pending, reviewed, approved, rejected
      table.integer('reviewed_by').references('id').inTable('users');
      table.timestamp('reviewed_at');
      table.timestamps(true, true);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTable('moderated_queries')
    .dropTable('ai_messages')
    .dropTable('ai_conversations');
};