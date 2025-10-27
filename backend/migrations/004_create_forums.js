exports.up = function(knex) {
  return knex.schema.createTable('forums', function(table) {
    table.increments('id').primary();
    table.string('title').notNullable();
    table.text('description');
    table.integer('chapter_id').references('id').inTable('chapters');
    table.integer('created_by').references('id').inTable('users');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('forums');
};