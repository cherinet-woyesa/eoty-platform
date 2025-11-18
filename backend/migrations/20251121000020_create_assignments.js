/**
 * Migration: Create assignments and assignment_submissions tables
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasAssignments = await knex.schema.hasTable('assignments');
  if (!hasAssignments) {
    await knex.schema.createTable('assignments', (table) => {
      table.increments('id').primary();
      table.integer('course_id').unsigned().references('id').inTable('courses').onDelete('CASCADE');
      table.string('created_by').onDelete('SET NULL');
      table.string('title').notNullable();
      table.text('description').nullable();
      table.timestamp('due_date').nullable();
      table.integer('max_points').unsigned().defaultTo(100);
      table.string('status').notNullable().defaultTo('draft'); // draft, published, closed
      table.timestamps(true, true);

      table.index(['course_id', 'status']);
      table.index(['created_by', 'status']);
      table.index(['due_date']);
    });
  }

  const hasSubmissions = await knex.schema.hasTable('assignment_submissions');
  if (!hasSubmissions) {
    await knex.schema.createTable('assignment_submissions', (table) => {
      table.increments('id').primary();
      table.integer('assignment_id').unsigned().references('id').inTable('assignments').onDelete('CASCADE');
      table.integer('student_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
      table.text('content').nullable(); // e.g. text answer, link, JSON
      table.timestamp('submitted_at').nullable();
      table.integer('score').unsigned().nullable();
      table.text('feedback').nullable();
      table.timestamp('graded_at').nullable();
      table.string('status').notNullable().defaultTo('pending'); // pending, submitted, graded
      table.timestamps(true, true);

      table.unique(['assignment_id', 'student_id']);
      table.index(['assignment_id', 'status']);
      table.index(['student_id', 'status']);
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('assignment_submissions');
  await knex.schema.dropTableIfExists('assignments');
};


