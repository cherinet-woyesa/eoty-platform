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
      table.string('path').notNullable();
      table.string('method').notNullable();
      table.integer('status_code').nullable();
      table.text('notes');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }
  return Promise.resolve();
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('access_logs');
};
