/**
 * Migration: Create interaction_logs table for AI assistant analytics
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if table already exists
  const hasTable = await knex.schema.hasTable('interaction_logs');
  
  if (!hasTable) {
    await knex.schema.createTable('interaction_logs', (table) => {
      table.increments('id').primary();
      table.string('session_id', 255).notNullable();
      table.string('user_id', 255).nullable(); // Using string to match users.id type
      table.string('interaction_type', 50).notNullable(); // question, response, etc.
      table.text('question').nullable();
      table.text('response').nullable();
      table.text('context').nullable(); // JSON string
      table.jsonb('performance_metrics').nullable();
      table.jsonb('faith_alignment').nullable();
      table.jsonb('moderation_flags').nullable();
      table.string('language', 10).defaultTo('en');
      table.string('user_feedback', 50).nullable(); // positive, negative, neutral
      table.timestamp('timestamp').defaultTo(knex.fn.now());
      
      // Indexes for efficient querying
      table.index('session_id');
      table.index('user_id');
      table.index('interaction_type');
      table.index('timestamp');
      table.index(['user_id', 'timestamp']);
      table.index(['session_id', 'timestamp']);
    });
    
    console.log('✓ Created interaction_logs table');
  } else {
    console.log('✓ interaction_logs table already exists');
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('interaction_logs');
  console.log('✓ Dropped interaction_logs table');
};

