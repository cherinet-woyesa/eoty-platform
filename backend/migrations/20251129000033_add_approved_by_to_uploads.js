exports.up = function(knex) {
  return knex.schema.table('content_uploads', function(table) {
    table.integer('approved_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('approved_at');
  });
};

exports.down = function(knex) {
  return knex.schema.table('content_uploads', function(table) {
    table.dropColumn('approved_by');
    table.dropColumn('approved_at');
  });
};