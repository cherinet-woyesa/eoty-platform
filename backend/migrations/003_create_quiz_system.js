exports.up = function(knex) {
  return knex.schema
    // Quiz questions table
    .createTable('quiz_questions', function(table) {
      table.increments('id').primary();
      table.integer('lesson_id').references('id').inTable('lessons').onDelete('CASCADE');
      table.string('question_text').notNullable();
      table.enum('question_type', ['multiple_choice', 'short_answer', 'true_false']).notNullable();
      table.json('options'); // For multiple choice questions: {A: "option1", B: "option2", C: "option3", D: "option4"}
      table.string('correct_answer').notNullable(); // For MC: "A", "B", etc. For short answer: the correct text
      table.text('explanation'); // Explanation for the answer
      table.integer('points').defaultTo(1);
      table.integer('order').defaultTo(0); // Order within the lesson
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    })
    
    // Quiz attempts table
    .createTable('quiz_attempts', function(table) {
      table.increments('id').primary();
      table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.integer('question_id').references('id').inTable('quiz_questions').onDelete('CASCADE');
      table.text('user_answer');
      table.boolean('is_correct').defaultTo(false);
      table.integer('points_earned').defaultTo(0);
      table.timestamp('attempted_at').defaultTo(knex.fn.now());
      table.timestamps(true, true);
    })
    
    // Quiz sessions table (to track overall quiz attempts)
    .createTable('quiz_sessions', function(table) {
      table.increments('id').primary();
      table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.integer('lesson_id').references('id').inTable('lessons').onDelete('CASCADE');
      table.integer('total_questions').notNullable();
      table.integer('correct_answers').defaultTo(0);
      table.integer('total_points').defaultTo(0);
      table.integer('max_points').notNullable();
      table.decimal('score_percentage', 5, 2).defaultTo(0);
      table.boolean('is_completed').defaultTo(false);
      table.timestamp('started_at').defaultTo(knex.fn.now());
      table.timestamp('completed_at');
      table.timestamps(true, true);
    })
    
    // User progress tracking
    .createTable('user_lesson_progress', function(table) {
      table.increments('id').primary();
      table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.integer('lesson_id').references('id').inTable('lessons').onDelete('CASCADE');
      table.decimal('video_progress', 5, 2).defaultTo(0); // Percentage of video watched
      table.decimal('quiz_progress', 5, 2).defaultTo(0); // Percentage of quiz completed
      table.decimal('overall_progress', 5, 2).defaultTo(0); // Overall lesson progress
      table.boolean('is_video_completed').defaultTo(false);
      table.boolean('is_quiz_completed').defaultTo(false);
      table.boolean('is_lesson_completed').defaultTo(false);
      table.timestamp('last_accessed_at').defaultTo(knex.fn.now());
      table.timestamp('completed_at');
      table.timestamps(true, true);
      
      // Ensure one progress record per user per lesson
      table.unique(['user_id', 'lesson_id']);
    })
    
    // Lesson discussions table
    .createTable('lesson_discussions', function(table) {
      table.increments('id').primary();
      table.integer('lesson_id').references('id').inTable('lessons').onDelete('CASCADE');
      table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.integer('parent_id').references('id').inTable('lesson_discussions').onDelete('CASCADE').nullable(); // For threaded discussions
      table.text('content').notNullable();
      table.integer('video_timestamp').nullable(); // Optional: link to specific video moment
      table.boolean('is_approved').defaultTo(true); // For moderation
      table.boolean('is_pinned').defaultTo(false); // For important discussions
      table.integer('likes_count').defaultTo(0);
      table.integer('replies_count').defaultTo(0);
      table.timestamps(true, true);
    })
    
    // Video annotations table
    .createTable('video_annotations', function(table) {
      table.increments('id').primary();
      table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.integer('lesson_id').references('id').inTable('lessons').onDelete('CASCADE');
      table.integer('start_time').notNullable(); // Start timestamp in seconds
      table.integer('end_time').nullable(); // End timestamp in seconds (for ranges)
      table.enum('type', ['highlight', 'bookmark', 'note', 'question']).notNullable();
      table.text('content').nullable(); // Note content or question text
      table.string('color').defaultTo('#ffeb3b'); // For highlights
      table.boolean('is_public').defaultTo(false); // Share with other students
      table.timestamps(true, true);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTable('video_annotations')
    .dropTable('lesson_discussions')
    .dropTable('user_lesson_progress')
    .dropTable('quiz_sessions')
    .dropTable('quiz_attempts')
    .dropTable('quiz_questions');
};