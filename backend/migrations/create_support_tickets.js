exports.up = function(knex) {
  return knex.schema.createTable('support_tickets', function(table) {
    table.increments('id');
    table.integer('user_id').references('id').inTable('users').onDelete('SET NULL');
    table.string('subject').notNullable();
    table.text('message').notNullable();
    table.string('type').defaultTo('general');
    table.string('status').defaultTo('open');
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('support_tickets');
};
