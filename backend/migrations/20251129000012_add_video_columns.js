exports.up = async function(knex) {
  const hasStorageUrl = await knex.schema.hasColumn('videos', 'storage_url');
  const hasHlsUrl = await knex.schema.hasColumn('videos', 'hls_url');
  const hasProcessingError = await knex.schema.hasColumn('videos', 'processing_error');

  return knex.schema.table('videos', function(table) {
    if (!hasStorageUrl) table.string('storage_url').nullable();
    if (!hasHlsUrl) table.string('hls_url').nullable();
    if (!hasProcessingError) table.string('processing_error').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema
    .table('videos', function(table) {
      table.dropColumn('processing_error');
      table.dropColumn('hls_url');
      table.dropColumn('storage_url');
    });
};
