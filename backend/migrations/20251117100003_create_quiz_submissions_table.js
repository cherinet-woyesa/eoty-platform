/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if table already exists
  const hasTable = await knex.schema.hasTable('quiz_submissions');
  if (hasTable) {
    console.log('✓ quiz_submissions table already exists, skipping migration');
    return;
  }

  // Create quiz_submissions table
  await knex.schema.createTable('quiz_submissions', function(table) {
    table.increments('id').primary();
    table.integer('quiz_id').unsigned().notNullable()
      .references('id').inTable('quizzes').onDelete('CASCADE');
    table.integer('user_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.integer('attempt_number').notNullable().defaultTo(1);
    table.decimal('score', 5, 2);
    table.integer('max_score');
    table.boolean('passed').defaultTo(false);
    table.integer('time_taken_seconds');
    table.timestamp('started_at').notNullable();
    table.timestamp('submitted_at');
    table.timestamps(true, true);
    
    // Unique constraint on (quiz_id, user_id, attempt_number)
    table.unique(['quiz_id', 'user_id', 'attempt_number'], 'unique_quiz_user_attempt');
    
    // Indexes
    table.index(['quiz_id', 'user_id'], 'idx_submissions_quiz_user');
    table.index(['user_id'], 'idx_submissions_user');
    table.index(['submitted_at'], 'idx_submissions_submitted_at');
  });

  // Add CHECK constraints
  await knex.raw('ALTER TABLE quiz_submissions ADD CONSTRAINT valid_score CHECK (score >= 0 AND score <= max_score)');
  await knex.raw('ALTER TABLE quiz_submissions ADD CONSTRAINT valid_attempt CHECK (attempt_number > 0)');

  console.log('✓ Created quiz_submissions table');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('quiz_submissions');
  console.log('✓ Dropped quiz_submissions table');
};
