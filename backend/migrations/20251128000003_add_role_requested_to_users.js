/**
 * Migration: Add role_requested column to users table
 * This column tracks what role a user has requested (e.g., when applying to become a teacher)
 */

exports.up = function(knex) {
  return knex.schema.table('users', function(table) {
    // Add role_requested column if it doesn't exist
    table.string('role_requested').nullable().defaultTo(null);
  });
};

exports.down = function(knex) {
  return knex.schema.table('users', function(table) {
    table.dropColumn('role_requested');
  });
};
