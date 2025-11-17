// One-off script to ensure student_invitations table exists without depending on full migrations

/* eslint-disable @typescript-eslint/no-var-requires */
const knexConfig = require('../knexfile');
const Knex = require('knex');

async function ensureStudentInvitationsTable() {
  const knex = Knex(knexConfig.development);

  try {
    const hasTable = await knex.schema.hasTable('student_invitations');
    if (hasTable) {
      console.log('student_invitations table already exists, skipping');
      return;
    }

    console.log('Creating student_invitations table...');

    await knex.schema.createTable('student_invitations', (table) => {
      table.increments('id').primary();
      table.string('email').notNullable();

      // Use string IDs to avoid foreign key type conflicts with existing users table
      table.string('invited_by').nullable(); // teacher id
      table.string('user_id').nullable(); // linked user id, if account already exists

      table
        .integer('course_id')
        .unsigned()
        .references('id')
        .inTable('courses')
        .onDelete('SET NULL');

      table.string('status').notNullable().defaultTo('pending'); // pending, accepted, declined
      table.timestamp('accepted_at');
      table.timestamp('declined_at');
      table.timestamps(true, true);

      table.index(['email', 'status']);
      table.index(['user_id', 'status']);
      table.index(['course_id', 'status']);
    });

    console.log('✅ student_invitations table created');
  } catch (err) {
    console.error('Error ensuring student_invitations table:', err);
  } finally {
    await knex.destroy();
  }
}

ensureStudentInvitationsTable().then(() => {
  console.log('Done.');
  process.exit(0);
});


