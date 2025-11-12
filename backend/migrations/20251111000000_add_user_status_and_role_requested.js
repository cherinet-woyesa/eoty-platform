/**
 * Migration: Add status and role_requested fields to users table
 * for teacher application workflow
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.table('users', function(table) {
    // User status: 'active', 'pending_teacher', 'suspended', 'inactive'
    table.string('status').defaultTo('active').notNullable();
    
    // Role requested during registration (for teacher applications)
    table.string('role_requested').defaultTo('student');
    
    // Index for querying pending teachers
    table.index(['status', 'role_requested']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.table('users', function(table) {
    table.dropIndex(['status', 'role_requested']);
    table.dropColumn('status');
    table.dropColumn('role_requested');
  });
};


