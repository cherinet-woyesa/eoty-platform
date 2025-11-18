/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if table already exists
  const hasTable = await knex.schema.hasTable('quiz_questions');
  if (hasTable) {
    console.log('✓ quiz_questions table already exists, skipping migration');
    return;
  }

  // Create quiz_questions table
  await knex.schema.createTable('quiz_questions', function(table) {
    table.increments('id').primary();
    table.integer('quiz_id').unsigned().notNullable()
      .references('id').inTable('quizzes').onDelete('CASCADE');
    table.text('question_text').notNullable();
    table.string('question_type', 50).notNullable();
    table.integer('points').defaultTo(1);
    table.integer('order_index').defaultTo(0);
    table.text('explanation');
    table.timestamps(true, true);
    
    // Indexes
    table.index(['quiz_id'], 'idx_quiz_questions_quiz_id');
    table.index(['quiz_id', 'order_index'], 'idx_quiz_questions_order');
  });

  // Add CHECK constraints
  await knex.raw("ALTER TABLE quiz_questions ADD CONSTRAINT valid_question_type CHECK (question_type IN ('multiple_choice', 'short_answer'))");
  await knex.raw('ALTER TABLE quiz_questions ADD CONSTRAINT valid_points CHECK (points > 0)');

  console.log('✓ Created quiz_questions table');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('quiz_questions');
  console.log('✓ Dropped quiz_questions table');
};
