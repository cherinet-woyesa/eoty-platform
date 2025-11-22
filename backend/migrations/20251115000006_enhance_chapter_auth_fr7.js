// Create chapters table for FR7: Location/topic based chapter system
exports.up = function(knex) {
  return knex.schema.createTable('chapters', function(table) {
    table.increments('id').primary();
    table.string('name', 255).notNullable().unique();
    table.text('description').nullable();
    table.integer('display_order').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.integer('course_count').defaultTo(0);
    table.string('location').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index(['is_active', 'display_order']);
    table.index('name');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('chapters');
};
