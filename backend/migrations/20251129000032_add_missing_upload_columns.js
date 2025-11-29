exports.up = function(knex) {
  return knex.schema.table('content_uploads', function(table) {
    table.jsonb('metadata').defaultTo('{}');
    table.string('mime_type');
    table.string('storage_type').defaultTo('local');
  });
};

exports.down = function(knex) {
  return knex.schema.table('content_uploads', function(table) {
    table.dropColumn('metadata');
    table.dropColumn('mime_type');
    table.dropColumn('storage_type');
  });
};