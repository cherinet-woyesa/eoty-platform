/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if table already exists
  const hasTable = await knex.schema.hasTable('quizzes');
  if (hasTable) {
    console.log('✓ quizzes table already exists, skipping migration');
    return;
  }

  // Quizzes
  await knex.schema.createTable('quizzes', function(table) {
    table.increments('id').primary();
    table.integer('lesson_id').unsigned().references('id').inTable('lessons').onDelete('CASCADE');
    table.string('title').notNullable();
    table.text('description');
    table.integer('order_number').defaultTo(0);
    table.integer('time_limit'); // in minutes
    table.integer('max_attempts').defaultTo(1);
    table.boolean('is_published').defaultTo(false);
    table.decimal('passing_score', 5, 2).defaultTo(70.0);
    table.jsonb('settings'); // Shuffle questions, show results, etc.
    table.timestamps(true, true);
    
    table.index(['lesson_id', 'order_number']);
    table.index(['lesson_id', 'is_published']);
  });

  // Quiz questions
  await knex.schema.createTable('quiz_questions', function(table) {
    table.increments('id').primary();
    table.integer('quiz_id').unsigned().references('id').inTable('quizzes').onDelete('CASCADE');
    table.text('question_text').notNullable();
    table.enu('question_type', ['multiple_choice', 'short_answer', 'true_false', 'essay']).notNullable();
    table.jsonb('options'); // For multiple choice: {choices: [], correct_answer: index}
    table.text('correct_answer'); // For short answer/true_false
    table.text('explanation');
    table.integer('points').defaultTo(1);
    table.integer('order_number').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.jsonb('metadata'); // Hints, difficulty level, etc.
    table.timestamps(true, true);
    
    table.index(['quiz_id', 'order_number']);
    table.index(['quiz_id', 'is_active']);
  });

  // Quiz sessions (overall attempt tracking)
  await knex.schema.createTable('quiz_sessions', function(table) {
    table.increments('id').primary();
    table.string('user_id').notNullable().onDelete('CASCADE');
    table.integer('quiz_id').unsigned().references('id').inTable('quizzes').onDelete('CASCADE');
    table.integer('attempt_number').defaultTo(1);
    table.integer('total_questions').defaultTo(0);
    table.integer('correct_answers').defaultTo(0);
    table.integer('total_points').defaultTo(0);
    table.integer('max_points').defaultTo(0);
    table.decimal('score_percentage', 5, 2).defaultTo(0);
    table.boolean('is_completed').defaultTo(false);
    table.timestamp('started_at').defaultTo(knex.fn.now());
    table.timestamp('completed_at');
    table.jsonb('session_data'); // Time spent, questions skipped, etc.
    table.timestamps(true, true);
    
    table.unique(['user_id', 'quiz_id', 'attempt_number']);
    table.index(['user_id', 'quiz_id']);
    table.index(['quiz_id', 'is_completed']);
  });

  // Quiz attempts (individual question attempts)
  await knex.schema.createTable('quiz_attempts', function(table) {
    table.increments('id').primary();
    table.integer('session_id').unsigned().references('id').inTable('quiz_sessions').onDelete('CASCADE');
    table.integer('question_id').unsigned().references('id').inTable('quiz_questions').onDelete('CASCADE');
    table.text('user_answer');
    table.boolean('is_correct').defaultTo(false);
    table.integer('points_earned').defaultTo(0);
    table.integer('time_spent').defaultTo(0); // seconds
    table.timestamp('attempted_at').defaultTo(knex.fn.now());
    table.jsonb('answer_metadata'); // Partial credit, teacher feedback, etc.
    
    table.index(['session_id', 'question_id']);
    table.index(['session_id']);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('quiz_attempts');
  await knex.schema.dropTableIfExists('quiz_sessions');
  await knex.schema.dropTableIfExists('quiz_questions');
  await knex.schema.dropTableIfExists('quizzes');
};