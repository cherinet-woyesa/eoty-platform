exports.up = function(knex) {
  return knex.schema
    .createTable('quizzes', function(table) {
      table.increments('id').primary();
      table.integer('lesson_id').references('id').inTable('lessons').onDelete('CASCADE');
      table.string('title').notNullable();
      table.text('description');
      table.integer('order_number').defaultTo(0);
      table.integer('time_limit'); // in seconds, null for no limit
      table.integer('max_attempts').defaultTo(1);
      table.boolean('is_published').defaultTo(false);
      table.timestamps(true, true);
      
      table.index(['lesson_id', 'order_number']);
    })
    .createTable('quiz_questions', function(table) {
      table.increments('id').primary();
      table.integer('quiz_id').references('id').inTable('quizzes').onDelete('CASCADE');
      table.text('question_text').notNullable();
      table.enum('question_type', ['multiple_choice', 'true_false', 'short_answer']).notNullable();
      table.jsonb('options'); // For multiple choice: { "A": "Option 1", "B": "Option 2" }
      table.string('correct_answer');
      table.text('explanation'); // Explanation shown after answering
      table.integer('points').defaultTo(1);
      table.integer('order_number').defaultTo(0);
      table.timestamps(true, true);
      
      table.index(['quiz_id', 'order_number']);
    })
    .createTable('user_quiz_attempts', function(table) {
      table.increments('id').primary();
      table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.integer('quiz_id').references('id').inTable('quizzes').onDelete('CASCADE');
      table.integer('score').defaultTo(0);
      table.integer('max_score').defaultTo(0);
      table.jsonb('answers'); // Store user's answers
      table.boolean('is_completed').defaultTo(false);
      table.timestamp('completed_at');
      table.timestamps(true, true);
      
      table.index(['user_id', 'quiz_id']);
      table.unique(['user_id', 'quiz_id', 'id']); // Allow multiple attempts if configured
    })
    .createTable('video_annotations', function(table) {
      table.increments('id').primary();
      table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.integer('lesson_id').references('id').inTable('lessons').onDelete('CASCADE');
      table.float('timestamp'); // Video timestamp in seconds
      table.text('content').notNullable();
      table.enum('type', ['highlight', 'comment', 'bookmark']).notNullable();
      table.jsonb('metadata'); // Color for highlight, etc.
      table.boolean('is_public').defaultTo(false);
      table.timestamps(true, true);
      
      table.index(['user_id', 'lesson_id']);
      table.index(['lesson_id', 'timestamp']);
    })
    .createTable('lesson_discussions', function(table) {
      table.increments('id').primary();
      table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.integer('lesson_id').references('id').inTable('lessons').onDelete('CASCADE');
      table.integer('parent_id').references('id').inTable('lesson_discussions'); // For replies
      table.text('content').notNullable();
      table.float('video_timestamp'); // Optional: link to specific video time
      table.boolean('is_pinned').defaultTo(false);
      table.boolean('is_moderated').defaultTo(false);
      table.timestamps(true, true);
      
      table.index(['lesson_id', 'created_at']);
      table.index(['parent_id']);
    })
    .createTable('user_lesson_progress', function(table) {
      table.increments('id').primary();
      table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.integer('lesson_id').references('id').inTable('lessons').onDelete('CASCADE');
      table.float('progress').defaultTo(0); // 0-1 percentage
      table.float('last_watched_timestamp').defaultTo(0);
      table.boolean('is_completed').defaultTo(false);
      table.timestamp('completed_at');
      table.timestamp('last_accessed_at');
      table.timestamps(true, true);
      
      table.unique(['user_id', 'lesson_id']);
      table.index(['user_id', 'is_completed']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTable('user_lesson_progress')
    .dropTable('lesson_discussions')
    .dropTable('video_annotations')
    .dropTable('user_quiz_attempts')
    .dropTable('quiz_questions')
    .dropTable('quizzes');
};