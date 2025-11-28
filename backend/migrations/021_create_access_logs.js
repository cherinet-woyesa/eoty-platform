/**
 * Migration: create access_logs table used by RBAC logging in dev
 */
exports.up = async function(knex) {
  const exists = await knex.schema.hasTable('access_logs');
  if (!exists) {
    return knex.schema.createTable('access_logs', function(table) {
      table.increments('id').primary();
      // Use string for user_id for compatibility with UUID/text PKs
      table.string('user_id').nullable();
      table.string('user_role').nullable();
      table.string('resource').nullable();
      table.string('required_role').nullable();
      table.string('action').defaultTo('access');
      table.boolean('access_granted').defaultTo(true);
      table.string('path').nullable(); // Made nullable to fix constraint issues
      table.string('method').nullable();
      table.integer('status_code').nullable();
      table.text('notes');
      table.string('ip_address').nullable();
      table.text('user_agent').nullable();
      table.jsonb('metadata').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }
  return Promise.resolve();
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('access_logs');
};
