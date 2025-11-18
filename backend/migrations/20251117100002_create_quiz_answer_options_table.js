/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if table already exists
  const hasTable = await knex.schema.hasTable('quiz_answer_options');
  if (hasTable) {
    console.log('✓ quiz_answer_options table already exists, skipping migration');
    return;
  }

  // Create quiz_answer_options table
  await knex.schema.createTable('quiz_answer_options', function(table) {
    table.increments('id').primary();
    table.integer('question_id').unsigned().notNullable()
      .references('id').inTable('quiz_questions').onDelete('CASCADE');
    table.text('option_text').notNullable();
    table.boolean('is_correct').defaultTo(false);
    table.integer('order_index').defaultTo(0);
    table.timestamps(true, true);
    
    // Index
    table.index(['question_id'], 'idx_answer_options_question_id');
  });

  console.log('✓ Created quiz_answer_options table');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('quiz_answer_options');
  console.log('✓ Dropped quiz_answer_options table');
};
