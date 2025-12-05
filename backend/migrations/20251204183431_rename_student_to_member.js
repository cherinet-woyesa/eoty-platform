/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  // It's safer to first add the new role to an enum if one is used, then update, then remove the old one.
  // But for a simple string column, a direct update is fine.
  return knex('users')
    .where('role', 'student')
    .update({ role: 'member' });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  // Revert the change
  return knex('users')
    .where('role', 'member')
    .update({ role: 'student' });
};
