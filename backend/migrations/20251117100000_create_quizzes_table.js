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

  // Create quizzes table
  await knex.schema.createTable('quizzes', function(table) {
    table.increments('id').primary();
    table.integer('lesson_id').unsigned().notNullable()
      .references('id').inTable('lessons').onDelete('CASCADE');
    table.string('title', 200).notNullable();
    table.text('description');
    table.integer('passing_score').defaultTo(70);
    table.integer('time_limit_minutes');
    table.integer('max_attempts');
    table.boolean('show_correct_answers').defaultTo(true);
    table.boolean('shuffle_questions').defaultTo(false);
    table.boolean('is_required').defaultTo(false);
    table.boolean('is_published').defaultTo(false);
    table.integer('created_by').unsigned()
      .references('id').inTable('users').onDelete('SET NULL');
    table.timestamps(true, true);
    
    // Indexes
    table.index(['lesson_id'], 'idx_quizzes_lesson_id');
    table.index(['created_by'], 'idx_quizzes_created_by');
  });

  // Add CHECK constraint for passing_score (0-100)
  await knex.raw('ALTER TABLE quizzes ADD CONSTRAINT valid_passing_score CHECK (passing_score >= 0 AND passing_score <= 100)');

  console.log('✓ Created quizzes table');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('quizzes');
  console.log('✓ Dropped quizzes table');
};
