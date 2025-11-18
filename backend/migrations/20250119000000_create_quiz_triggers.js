/**
 * Migration: Create Quiz Triggers Table
 * Purpose: Enable timed quizzes that appear at specific timestamps during video playback
 * Requirement: FR2 - In-lesson quizzes with video integration
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if table already exists
  const hasTable = await knex.schema.hasTable('quiz_triggers');
  if (hasTable) {
    console.log('✓ quiz_triggers table already exists, skipping migration');
    return;
  }

  // Create quiz_triggers table
  await knex.schema.createTable('quiz_triggers', function(table) {
    table.increments('id').primary();
    
    // Foreign keys
    table.integer('lesson_id').unsigned().notNullable()
      .references('id').inTable('lessons').onDelete('CASCADE');
    table.integer('question_id').unsigned().notNullable()
      .references('id').inTable('quiz_questions').onDelete('CASCADE');
    
    // Trigger configuration
    table.float('trigger_timestamp').notNullable().comment('Seconds into video when quiz should appear');
    table.boolean('is_required').defaultTo(false).comment('Can student skip this quiz?');
    table.boolean('pause_video').defaultTo(true).comment('Should video pause when quiz appears?');
    table.integer('duration_seconds').defaultTo(null).comment('Max time allowed to complete quiz (null = unlimited)');
    
    // Display configuration
    table.string('display_mode', 50).defaultTo('overlay').comment('overlay, sidebar, fullscreen');
    table.integer('min_score_to_proceed').defaultTo(null).comment('Minimum score required to continue video (null = no requirement)');
    
    // Metadata
    table.string('created_by').onDelete('SET NULL');
    table.timestamps(true, true);
    
    // Indexes for performance
    table.index(['lesson_id'], 'idx_quiz_triggers_lesson');
    table.index(['lesson_id', 'trigger_timestamp'], 'idx_quiz_triggers_lesson_timestamp');
    table.index(['question_id'], 'idx_quiz_triggers_question');
    
    // Ensure unique trigger timestamp per question per lesson
    table.unique(['lesson_id', 'question_id'], 'unique_lesson_question_trigger');
  });
  
  console.log('✓ Created quiz_triggers table');
  
  // Add quiz completion tracking to user_lesson_progress
  const hasQuizzesCompletedColumn = await knex.schema.hasColumn('user_lesson_progress', 'quizzes_completed');
  
  if (!hasQuizzesCompletedColumn) {
    await knex.schema.table('user_lesson_progress', function(table) {
      table.integer('quizzes_completed').defaultTo(0).comment('Number of quizzes completed in this lesson');
      table.integer('quizzes_total').defaultTo(0).comment('Total number of quizzes in this lesson');
      table.float('quiz_average_score').defaultTo(0).comment('Average quiz score (0-100)');
    });
    console.log('✓ Added quiz tracking columns to user_lesson_progress');
  } else {
    console.log('✓ Quiz tracking columns already exist in user_lesson_progress');
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Remove columns from user_lesson_progress
  const hasQuizzesCompletedColumn = await knex.schema.hasColumn('user_lesson_progress', 'quizzes_completed');
  
  if (hasQuizzesCompletedColumn) {
    await knex.schema.table('user_lesson_progress', function(table) {
      table.dropColumn('quizzes_completed');
      table.dropColumn('quizzes_total');
      table.dropColumn('quiz_average_score');
    });
    console.log('✓ Removed quiz tracking columns from user_lesson_progress');
  }
  
  // Drop quiz_triggers table
  await knex.schema.dropTableIfExists('quiz_triggers');
  console.log('✓ Dropped quiz_triggers table');
};

