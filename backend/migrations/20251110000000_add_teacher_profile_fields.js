/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Add teacher profile fields to users table
  await knex.schema.table('users', function(table) {
    table.string('phone');
    table.string('location');
    table.text('education');
    table.integer('teaching_experience');
    table.json('specialties');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Remove teacher profile fields from users table
  await knex.schema.table('users', function(table) {
    table.dropColumn('phone');
    table.dropColumn('location');
    table.dropColumn('education');
    table.dropColumn('teaching_experience');
    table.dropColumn('specialties');
  });
};