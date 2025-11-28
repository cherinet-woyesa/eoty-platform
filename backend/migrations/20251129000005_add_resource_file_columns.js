exports.up = function(knex) {
  return knex.schema.alterTable('resources', function(table) {
    table.string('file_name').nullable();
    table.bigInteger('file_size').defaultTo(0);
    table.string('file_type').nullable();
    table.string('file_url').nullable();
    table.string('topic').nullable();
    table.timestamp('published_date').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('resources', function(table) {
    table.dropColumn('published_date');
    table.dropColumn('topic');
    table.dropColumn('file_url');
    table.dropColumn('file_type');
    table.dropColumn('file_size');
    table.dropColumn('file_name');
  });
};
