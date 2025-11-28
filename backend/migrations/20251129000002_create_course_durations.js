exports.up = function(knex) {
  return knex.schema.createTable('course_durations', function(table) {
    table.increments('id').primary();
    table.string('value').notNullable().unique();
    table.string('label').notNullable();
    table.integer('weeks_min').notNullable();
    table.integer('weeks_max').nullable();
    table.integer('display_order').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('course_durations');
};
