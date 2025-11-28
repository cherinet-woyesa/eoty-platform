exports.up = async function(knex) {
  // 1. Create quiz_triggers table
  const hasQuizTriggers = await knex.schema.hasTable('quiz_triggers');
  if (!hasQuizTriggers) {
    await knex.schema.createTable('quiz_triggers', function(table) {
      table.increments('id').primary();
      table.integer('lesson_id').notNullable().references('id').inTable('lessons').onDelete('CASCADE');
      table.integer('question_id').notNullable().references('id').inTable('quiz_questions').onDelete('CASCADE');
      table.float('trigger_timestamp').notNullable(); // Time in seconds
      table.timestamps(true, true);
    });
  }

  // 2. Add lesson_id to quiz_questions
  const hasLessonId = await knex.schema.hasColumn('quiz_questions', 'lesson_id');
  if (!hasLessonId) {
    await knex.schema.alterTable('quiz_questions', function(table) {
      table.integer('lesson_id').nullable().references('id').inTable('lessons').onDelete('CASCADE');
    });
  }

  // 3. Add completed_at to user_lesson_progress
  const hasCompletedAt = await knex.schema.hasColumn('user_lesson_progress', 'completed_at');
  if (!hasCompletedAt) {
    await knex.schema.alterTable('user_lesson_progress', function(table) {
      table.timestamp('completed_at').nullable();
    });
  }

  // 4. Fix lesson_discussions.user_id type
  // We need to use raw SQL for altering type with casting in Postgres
  // Only do this if the column is not already integer
  const columnInfo = await knex('lesson_discussions').columnInfo('user_id');
  // columnInfo.type might be 'integer' or 'character varying'
  if (columnInfo && columnInfo.type !== 'integer') {
      await knex.raw('ALTER TABLE lesson_discussions ALTER COLUMN user_id TYPE integer USING user_id::integer');
  }
};

exports.down = async function(knex) {
  // Revert changes
  await knex.schema.dropTableIfExists('quiz_triggers');
  
  const hasLessonId = await knex.schema.hasColumn('quiz_questions', 'lesson_id');
  if (hasLessonId) {
    await knex.schema.alterTable('quiz_questions', function(table) {
      table.dropColumn('lesson_id');
    });
  }

  const hasCompletedAt = await knex.schema.hasColumn('user_lesson_progress', 'completed_at');
  if (hasCompletedAt) {
    await knex.schema.alterTable('user_lesson_progress', function(table) {
      table.dropColumn('completed_at');
    });
  }

  // Reverting user_id to string is safer than integer to string, but we'll leave it as integer if possible.
  // If we must revert:
  // await knex.raw('ALTER TABLE lesson_discussions ALTER COLUMN user_id TYPE varchar(255)');
};
