exports.up = function(knex) {
  return knex.schema.createTable('user_learning_sessions', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.string('activity_type').notNullable();
    table.jsonb('details').defaultTo('{}');
    table.integer('duration_minutes').defaultTo(0);
    table.timestamp('session_date').defaultTo(knex.fn.now());
    table.jsonb('topics_covered').defaultTo('[]');
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('user_learning_sessions');
};
