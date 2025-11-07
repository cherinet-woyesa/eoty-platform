/**
 * Migration: Create access_logs table for security audit trail
 * Tracks all access attempts (granted and denied) for role-based access control
 */

exports.up = function(knex) {
  return knex.schema.createTable('access_logs', (table) => {
    table.increments('id').primary();
    table.text('user_id').nullable(); // Match users table ID type (text)
    table.string('user_role', 50).notNullable();
    table.string('resource', 500).notNullable(); // Route or endpoint accessed
    table.string('required_role', 50).nullable(); // Role required for access
    table.string('action', 100).notNullable().defaultTo('access'); // view, edit, delete, etc.
    table.boolean('access_granted').notNullable().defaultTo(false);
    table.string('ip_address', 45).nullable(); // IPv4 or IPv6
    table.text('user_agent').nullable();
    table.jsonb('metadata').nullable(); // Additional context
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // Indexes for efficient querying
    table.index('user_id');
    table.index('user_role');
    table.index('access_granted');
    table.index('created_at');
    table.index(['user_id', 'created_at']);
    table.index(['user_role', 'access_granted']);

    // Foreign key constraint (optional - allows logging even if user is deleted)
    table.foreign('user_id').references('users.id').onDelete('SET NULL');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('access_logs');
};
