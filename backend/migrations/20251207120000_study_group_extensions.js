/**
 * Study group extensions: messages, assignments, submissions.
 */

exports.up = async function(knex) {
  // Messages
  const hasMessages = await knex.schema.hasTable('study_group_messages');
  if (!hasMessages) {
    await knex.schema.createTable('study_group_messages', (table) => {
      table.increments('id').primary();
      table.integer('group_id').notNullable().references('id').inTable('study_groups').onDelete('CASCADE');
      table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.text('content').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
    await knex.schema.alterTable('study_group_messages', (table) => {
      table.index(['group_id', 'created_at']);
    });
  }

  // Assignments
  const hasAssignments = await knex.schema.hasTable('study_group_assignments');
  if (!hasAssignments) {
    await knex.schema.createTable('study_group_assignments', (table) => {
      table.increments('id').primary();
      table.integer('group_id').notNullable().references('id').inTable('study_groups').onDelete('CASCADE');
      table.integer('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('title').notNullable();
      table.text('description');
      table.timestamp('due_date');
      table.integer('total_points').defaultTo(100);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
    await knex.schema.alterTable('study_group_assignments', (table) => {
      table.index(['group_id', 'due_date']);
    });
  }

  // Submissions
  const hasSubmissions = await knex.schema.hasTable('study_group_submissions');
  if (!hasSubmissions) {
    await knex.schema.createTable('study_group_submissions', (table) => {
      table.increments('id').primary();
      table.integer('assignment_id').notNullable().references('id').inTable('study_group_assignments').onDelete('CASCADE');
      table.integer('student_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.text('content');
      table.string('file_url');
      table.timestamp('submitted_at').defaultTo(knex.fn.now());
      table.integer('grade');
      table.text('feedback');
      table.timestamp('graded_at');
      table.integer('graded_by').references('id').inTable('users').onDelete('SET NULL');
    });
    await knex.schema.alterTable('study_group_submissions', (table) => {
      table.unique(['assignment_id', 'student_id']);
      table.index(['assignment_id']);
    });
  }
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('study_group_submissions');
  await knex.schema.dropTableIfExists('study_group_assignments');
  await knex.schema.dropTableIfExists('study_group_messages');
};

