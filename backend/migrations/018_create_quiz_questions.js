/**
 * Migration: create quiz_questions table
 */
exports.up = async function(knex) {
  const exists = await knex.schema.hasTable('quiz_questions');
  if (!exists) {
    return knex.schema.createTable('quiz_questions', function(table) {
      table.increments('id').primary();
      table.integer('quiz_id').notNullable().references('id').inTable('quizzes').onDelete('CASCADE');
      table.text('question_text').notNullable();
      table.string('question_type').notNullable().defaultTo('multiple_choice');
      table.jsonb('options');
      table.string('correct_answer');
      table.text('explanation');
      table.integer('points').defaultTo(1);
      table.integer('order_number').defaultTo(0);
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    });
  }
  return Promise.resolve();
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('quiz_questions');
};
