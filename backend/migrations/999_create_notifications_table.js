/**
 * Create notifications table for user-facing notifications
 */
exports.up = function(knex) {
  return knex.schema.createTable('notifications', function(table) {
    table.increments('id').primary();
    table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('title').notNullable();
    table.text('message').nullable();
    table.string('notification_type').defaultTo('info'); // info | success | warning | error | message | achievement
    table.json('data').nullable();
    table.string('action_url').nullable();
    table.boolean('is_read').defaultTo(false);
    table.timestamp('read_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index(['user_id']);
    table.index(['is_read']);
    table.index(['created_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('notifications');
};


