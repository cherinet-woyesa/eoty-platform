/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // User course enrollments
  await knex.schema.createTable('user_course_enrollments', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('course_id').unsigned().notNullable().references('id').inTable('courses').onDelete('CASCADE');
    table.string('enrollment_status').defaultTo('active'); // active, completed, dropped, suspended
    table.timestamp('enrolled_at').defaultTo(knex.fn.now());
    table.timestamp('completed_at');
    table.decimal('progress_percentage', 5, 2).defaultTo(0);
    table.integer('current_lesson_id').unsigned().references('id').inTable('lessons').onDelete('SET NULL');
    table.timestamp('last_accessed_at').defaultTo(knex.fn.now());
    table.jsonb('enrollment_metadata'); // Start date, expected completion, etc.
    table.timestamps(true, true);
    
    table.unique(['user_id', 'course_id']);
    table.index(['user_id', 'enrollment_status']);
    table.index(['course_id', 'enrollment_status']);
    table.index(['enrolled_at']);
  });

  // User lesson progress
  await knex.schema.createTable('user_lesson_progress', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.integer('lesson_id').unsigned().references('id').inTable('lessons').onDelete('CASCADE');
    table.float('progress').defaultTo(0); // 0-1 percentage
    table.float('last_watched_timestamp').defaultTo(0);
    table.boolean('is_completed').defaultTo(false);
    table.timestamp('completed_at');
    table.timestamp('last_accessed_at').defaultTo(knex.fn.now());
    table.integer('time_spent').defaultTo(0); // total seconds
    table.integer('view_count').defaultTo(0);
    table.jsonb('progress_metadata'); // Bookmarks, notes count, etc.
    table.timestamps(true, true);
    
    table.unique(['user_id', 'lesson_id']);
    table.index(['user_id', 'is_completed']);
    table.index(['lesson_id', 'is_completed']);
  });

  // User engagement tracking
  await knex.schema.createTable('user_engagement', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.string('engagement_type').notNullable(); // video_watch, quiz_attempt, discussion_post, etc.
    table.string('content_type'); // lesson, course, resource, etc.
    table.integer('content_id'); // ID of the engaged content
    table.jsonb('metadata'); // Duration, score, post content, etc.
    table.integer('points_earned').defaultTo(0);
    table.timestamps(true, true);
    
    table.index(['user_id', 'engagement_type']);
    table.index(['user_id', 'created_at']);
    table.index(['content_type', 'content_id']);
  });

  // Leaderboard system
  await knex.schema.createTable('leaderboard_entries', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.integer('points').defaultTo(0);
    table.string('period').notNullable(); // daily, weekly, monthly, all_time
    table.integer('rank');
    table.timestamp('period_start');
    table.timestamp('period_end');
    table.timestamps(true, true);
    
    table.unique(['user_id', 'period']);
    table.index(['period', 'points']);
    table.index(['user_id']);
  });

  // User preferences and settings
  await knex.schema.createTable('user_preferences', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('preferred_language', 10).defaultTo('en-US');
    table.string('learning_pace', 20).defaultTo('moderate');
    table.boolean('email_notifications').defaultTo(true);
    table.boolean('push_notifications').defaultTo(true);
    table.jsonb('content_preferences'); // Categories, difficulty levels, etc.
    table.jsonb('accessibility_settings'); // Captions, playback speed, etc.
    table.jsonb('ui_settings'); // Theme, layout, etc.
    table.timestamps(true, true);
    
    table.unique(['user_id']);
    table.index(['user_id']);
  });

  // User learning sessions
  await knex.schema.createTable('user_learning_sessions', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('session_start').notNullable();
    table.timestamp('session_end');
    table.integer('duration_minutes').defaultTo(0);
    table.string('activity_type', 100).notNullable();
    table.jsonb('activities'); // Array of activities during session
    table.jsonb('session_metrics'); // Focus time, breaks, etc.
    table.timestamps(true, true);
    
    table.index(['user_id', 'session_start']);
    table.index(['activity_type', 'session_start']);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('user_learning_sessions');
  await knex.schema.dropTableIfExists('user_preferences');
  await knex.schema.dropTableIfExists('leaderboard_entries');
  await knex.schema.dropTableIfExists('user_engagement');
  await knex.schema.dropTableIfExists('user_lesson_progress');
  await knex.schema.dropTableIfExists('user_course_enrollments');
};