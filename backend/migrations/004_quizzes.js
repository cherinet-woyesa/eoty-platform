/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Quizzes
  await knex.schema.createTable('quizzes', function(table) {
    table.increments('id').primary();
    table.integer('lesson_id').unsigned().references('id').inTable('lessons').onDelete('CASCADE');
    table.string('title').notNullable();
    table.text('description');
    table.integer('order_number').defaultTo(0);
    table.integer('time_limit');
    table.integer('max_attempts').defaultTo(1);
    table.boolean('is_published').defaultTo(false);
    table.timestamps(true, true);
    table.index(['lesson_id', 'order_number']);
  });

  // Quiz questions
  await knex.schema.createTable('quiz_questions', function(table) {
    table.increments('id').primary();
    table.integer('quiz_id').unsigned().references('id').inTable('quizzes').onDelete('CASCADE');
    table.integer('lesson_id').unsigned().references('id').inTable('lessons').onDelete('CASCADE');
    table.text('question_text').notNullable();
    table.enu('question_type', ['multiple_choice', 'short_answer', 'true_false']).notNullable();
    table.jsonb('options');
    table.string('correct_answer');
    table.text('explanation');
    table.integer('points').defaultTo(1);
    table.integer('order_number').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    table.index(['quiz_id', 'order_number']);
  });

  // Quiz attempts
  await knex.schema.createTable('quiz_attempts', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.integer('question_id').unsigned().references('id').inTable('quiz_questions').onDelete('CASCADE');
    table.text('user_answer');
    table.boolean('is_correct').defaultTo(false);
    table.integer('points_earned').defaultTo(0);
    table.timestamp('attempted_at').defaultTo(knex.fn.now());
    table.timestamps(true, true);
  });

  // Quiz sessions
  await knex.schema.createTable('quiz_sessions', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.integer('lesson_id').unsigned().references('id').inTable('lessons').onDelete('CASCADE');
    table.integer('quiz_id').unsigned().references('id').inTable('quizzes').onDelete('CASCADE');
    table.integer('total_questions').defaultTo(0);
    table.integer('correct_answers').defaultTo(0);
    table.integer('total_points').defaultTo(0);
    table.integer('max_points').defaultTo(0);
    table.decimal('score_percentage', 5, 2).defaultTo(0);
    table.boolean('is_completed').defaultTo(false);
    table.timestamp('started_at').defaultTo(knex.fn.now());
    table.timestamp('completed_at');
    table.timestamps(true, true);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('quiz_sessions');
  await knex.schema.dropTableIfExists('quiz_attempts');
  await knex.schema.dropTableIfExists('quiz_questions');
  await knex.schema.dropTableIfExists('quizzes');
};