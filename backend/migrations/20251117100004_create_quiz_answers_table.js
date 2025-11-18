/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if table already exists
  const hasTable = await knex.schema.hasTable('quiz_answers');
  if (hasTable) {
    console.log('✓ quiz_answers table already exists, skipping migration');
    return;
  }

  // Create quiz_answers table
  await knex.schema.createTable('quiz_answers', function(table) {
    table.increments('id').primary();
    table.integer('submission_id').unsigned().notNullable()
      .references('id').inTable('quiz_submissions').onDelete('CASCADE');
    table.integer('question_id').unsigned().notNullable()
      .references('id').inTable('quiz_questions').onDelete('CASCADE');
    table.integer('selected_option_id').unsigned()
      .references('id').inTable('quiz_answer_options').onDelete('SET NULL');
    table.text('text_answer');
    table.boolean('is_correct');
    table.decimal('points_earned', 5, 2).defaultTo(0);
    table.timestamps(true, true);
    
    // Indexes
    table.index(['submission_id'], 'idx_answers_submission');
    table.index(['question_id'], 'idx_answers_question');
  });

  // Add CHECK constraint for points_earned
  await knex.raw('ALTER TABLE quiz_answers ADD CONSTRAINT valid_points_earned CHECK (points_earned >= 0)');

  console.log('✓ Created quiz_answers table');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('quiz_answers');
  console.log('✓ Dropped quiz_answers table');
};
