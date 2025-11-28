// Placeholder migration (no-op)
exports.up = function(knex) {
  return knex.schema
    .createTable('quizzes', function(table) {
      table.increments('id').primary();
      table.integer('lesson_id').unsigned().notNullable().references('id').inTable('lessons').onDelete('CASCADE');
      table.string('title').notNullable();
      table.text('description').nullable();
      table.integer('order_number').defaultTo(0);
      table.integer('time_limit').nullable(); // in seconds
      table.integer('max_attempts').defaultTo(3);
      table.boolean('is_published').defaultTo(false);
      table.timestamps(true, true);
    })
    .createTable('quiz_attempts', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.integer('quiz_id').unsigned().notNullable().references('id').inTable('quizzes').onDelete('CASCADE');
      table.integer('attempt_number').defaultTo(1);
      table.integer('score').defaultTo(0);
      table.boolean('is_completed').defaultTo(false);
      table.timestamp('started_at').defaultTo(knex.fn.now());
      table.timestamp('completed_at').nullable();
      table.timestamps(true, true);
    })
    .createTable('quiz_sessions', function(table) {
       table.increments('id').primary();
       table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
       table.integer('quiz_id').unsigned().notNullable().references('id').inTable('quizzes').onDelete('CASCADE');
       table.integer('attempt_number').defaultTo(1);
       table.integer('total_questions').defaultTo(0);
       table.integer('correct_answers').defaultTo(0);
       table.integer('total_points').defaultTo(0);
       table.integer('max_points').defaultTo(0);
       table.decimal('score_percentage', 5, 2).defaultTo(0);
       table.boolean('is_completed').defaultTo(false);
       table.timestamp('started_at').defaultTo(knex.fn.now());
       table.timestamp('completed_at').nullable();
       table.timestamps(true, true);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('quiz_sessions')
    .dropTableIfExists('quiz_attempts')
    .dropTableIfExists('quizzes');
};
