exports.up = async function(knex) {
  // Moderated content table for AI moderation
  await knex.schema.createTable('moderated_content', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.text('content').notNullable();
    table.string('content_type').notNullable(); // question, post, comment, etc.
    table.text('moderation_flags'); // Comma-separated list of flags
    table.integer('faith_alignment_score').defaultTo(0); // 0-10 scale
    table.string('status').defaultTo('pending'); // pending, approved, rejected, escalated
    table.integer('moderated_by').unsigned();
    table.text('moderation_notes');
    table.json('metadata'); // Additional context, language, etc.
    table.timestamps(true, true);
    
    table.foreign('user_id').references('id').inTable('users');
    table.foreign('moderated_by').references('id').inTable('users');
    table.index(['status', 'created_at']);
    table.index(['user_id', 'content_type']);
    table.index(['faith_alignment_score']);
  });

  // Moderation escalations table with priority levels
  await knex.schema.createTable('moderation_escalations', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.text('content').notNullable();
    table.string('content_type').notNullable();
    table.text('reason').notNullable();
    table.string('priority').defaultTo('medium'); // low, medium, high
    table.string('status').defaultTo('pending'); // pending, reviewed, resolved
    table.integer('reviewed_by').unsigned();
    table.text('resolution_notes');
    table.timestamps(true, true);
    
    table.foreign('user_id').references('id').inTable('users');
    table.foreign('reviewed_by').references('id').inTable('users');
    table.index(['status', 'created_at']);
    table.index(['user_id']);
    table.index(['priority']);
  });

  // Moderation statistics table
  await knex.schema.createTable('moderation_stats', (table) => {
    table.increments('id').primary();
    table.date('date').notNullable();
    table.integer('pending_count').defaultTo(0);
    table.integer('approved_count').defaultTo(0);
    table.integer('rejected_count').defaultTo(0);
    table.integer('escalated_count').defaultTo(0);
    table.integer('high_faith_alignment_count').defaultTo(0);
    table.integer('low_faith_alignment_count').defaultTo(0);
    table.float('avg_faith_alignment_score').defaultTo(0);
    table.timestamps(true, true);
    
    table.unique('date');
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTable('moderation_stats');
  await knex.schema.dropTable('moderation_escalations');
  await knex.schema.dropTable('moderated_content');
};