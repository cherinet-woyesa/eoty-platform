/**
 * Migration: Create student_invitations table
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasTable = await knex.schema.hasTable('student_invitations');
  if (hasTable) return;

  await knex.schema.createTable('student_invitations', (table) => {
    table.increments('id').primary();
    table.string('email').notNullable();
    table.integer('invited_by').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.string('user_id').notNullable().onDelete('SET NULL');
    table.integer('course_id').unsigned().references('id').inTable('courses').onDelete('SET NULL');
    table.string('status').notNullable().defaultTo('pending'); // pending, accepted, declined
    table.timestamp('accepted_at');
    table.timestamp('declined_at');
    table.timestamps(true, true);

    table.index(['email', 'status']);
    table.index(['user_id', 'status']);
    table.index(['course_id', 'status']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('student_invitations');
};


