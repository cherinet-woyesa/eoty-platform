exports.up = function(knex) {
  return knex.schema.createTable('help_resources', function(table) {
    table.increments('id').primary();
    table.string('resource_type').notNullable(); // 'tooltip', 'modal', 'faq'
    table.string('component').nullable();
    table.string('page').nullable();
    table.string('audience').defaultTo('all');
    table.string('category').defaultTo('general');
    table.string('title').notNullable();
    table.text('content').notNullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('help_resources');
};
