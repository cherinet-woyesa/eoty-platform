exports.up = function(knex) {
  return knex.schema
    .createTable('system_monitoring', function(table) {
      table.increments('id').primary();
      table.string('metric').notNullable();
      table.decimal('value', 10, 2).notNullable();
      table.text('details');
      table.text('error');
      table.timestamp('timestamp').defaultTo(knex.fn.now());
      
      table.index(['metric']);
      table.index(['timestamp']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTable('system_monitoring');
};