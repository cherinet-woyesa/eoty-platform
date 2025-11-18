/**
 * Migration: Create polls and poll_responses tables
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if table already exists
  const hasTable = await knex.schema.hasTable('polls');
  if (hasTable) {
    console.log('✓ polls table already exists, skipping migration');
    return;
  }

  // Polls table - for interactive polls in lessons
  await knex.schema.createTable('polls', function(table) {
    table.increments('id').primary();
    table.integer('lesson_id').unsigned().references('id').inTable('lessons').onDelete('CASCADE');
    table.string('created_by').references('id').inTable('users').onDelete('CASCADE');
    table.string('question').notNullable();
    table.text('description'); // Optional description/context
    table.jsonb('options').notNullable(); // Array of poll options: [{id: 1, text: "Option 1"}, ...]
    table.boolean('is_active').defaultTo(true);
    table.boolean('is_published').defaultTo(false);
    table.boolean('allow_multiple_choice').defaultTo(false); // Allow users to select multiple options
    table.boolean('show_results_before_voting').defaultTo(false); // Show results before user votes
    table.boolean('show_results_after_voting').defaultTo(true); // Show results after user votes
    table.timestamp('start_date'); // Optional: when poll becomes active
    table.timestamp('end_date'); // Optional: when poll expires
    table.integer('total_responses').defaultTo(0); // Cache for quick access
    table.jsonb('metadata'); // Additional settings, tags, etc.
    table.timestamps(true, true);
    
    table.index(['lesson_id', 'is_active']);
    table.index(['lesson_id', 'is_published']);
    table.index(['created_by']);
    table.index(['start_date', 'end_date']);
  });

  // Poll responses table - tracks user votes
  await knex.schema.createTable('poll_responses', function(table) {
    table.increments('id').primary();
    table.integer('poll_id').unsigned().references('id').inTable('polls').onDelete('CASCADE');
    table.string('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.integer('option_id').notNullable(); // ID of the selected option (from poll.options array)
    table.text('custom_answer'); // For "other" option or write-in responses
    table.jsonb('response_metadata'); // Additional data (timestamp, device, etc.)
    table.timestamps(true, true);
    
    // Unique constraint: one vote per user per poll (unless allow_multiple_choice is true)
    // Note: This will be enforced at application level for multiple choice polls
    table.index(['poll_id', 'user_id']);
    table.index(['poll_id', 'option_id']);
    table.index(['user_id']);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('poll_responses');
  await knex.schema.dropTableIfExists('polls');
};

