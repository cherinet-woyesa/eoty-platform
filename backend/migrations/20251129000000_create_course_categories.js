exports.up = function(knex) {
  return knex.schema.createTable('course_categories', function(table) {
    table.increments('id').primary();
    table.string('name').notNullable().unique();
    table.string('slug').notNullable().unique();
    table.string('icon').nullable();
    table.text('description').nullable();
    table.integer('display_order').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('course_categories');
};
