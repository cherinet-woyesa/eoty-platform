// One-off script to ensure assignments tables exist, without running full migrations
// Useful when older migrations conflict with an existing database schema.

/* eslint-disable @typescript-eslint/no-var-requires */
const knexConfig = require('../knexfile');
const Knex = require('knex');

async function ensureAssignmentsTables() {
  const knex = Knex(knexConfig.development);

  try {
    const hasAssignments = await knex.schema.hasTable('assignments');
    if (!hasAssignments) {
      console.log('Creating assignments table...');
      await knex.schema.createTable('assignments', (table) => {
        table.increments('id').primary();
        table
          .integer('course_id')
          .unsigned()
          .references('id')
          .inTable('courses')
          .onDelete('CASCADE');
        // Store created_by as text to avoid FK type conflicts with existing users.id
        table.string('created_by').nullable();
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
      console.log('✅ assignments table created');
    } else {
      console.log('assignments table already exists, skipping');
    }

    const hasSubmissions = await knex.schema.hasTable('assignment_submissions');
    if (!hasSubmissions) {
      console.log('Creating assignment_submissions table...');
      await knex.schema.createTable('assignment_submissions', (table) => {
        table.increments('id').primary();
        table
          .integer('assignment_id')
          .unsigned()
          .references('id')
          .inTable('assignments')
          .onDelete('CASCADE');
        // Store student_id as text to avoid FK type conflicts with existing users.id
        table.string('student_id').nullable();
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
      console.log('✅ assignment_submissions table created');
    } else {
      console.log('assignment_submissions table already exists, skipping');
    }
  } catch (err) {
    console.error('Error ensuring assignments tables:', err);
  } finally {
    await knex.destroy();
  }
}

ensureAssignmentsTables().then(() => {
  console.log('Done.');
  process.exit(0);
});


