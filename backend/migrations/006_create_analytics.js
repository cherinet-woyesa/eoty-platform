exports.up = function(knex) {
  return knex.schema.createTable('analytics_events', function(table) {
    table.increments('id').primary();
    table.integer('user_id').references('id').inTable('users');
    table.string('event_type').notNullable();
    table.json('event_data');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('analytics_events');
};