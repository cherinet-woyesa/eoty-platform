exports.up = function(knex) {
  return knex.schema.createTable('achievements', function(table) {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.text('description');
    table.string('icon_url');
    table.integer('points').defaultTo(0);
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('achievements');
};