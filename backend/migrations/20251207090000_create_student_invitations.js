/**
 * Create student_invitations table if it does not exist.
 * Keeps columns aligned with current controller query (integer user_id).
 * Includes useful indexes for status/email lookups.
 */

exports.up = async function (knex) {
  const exists = await knex.schema.hasTable('student_invitations');
  if (exists) return;

  await knex.schema.createTable('student_invitations', (table) => {
    table.increments('id').primary();
    table.string('email').notNullable();

    table.integer('invited_by').unsigned().references('id').inTable('users').onDelete('SET NULL');
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('SET NULL');

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
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('student_invitations');
};

