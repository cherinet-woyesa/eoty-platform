exports.up = function(knex) {
  return knex.schema.createTable('ai_embeddings', function(table) {
    table.increments('id').primary();
    table.text('content').notNullable();
    table.string('content_type'); // course, resource, lesson, etc.
    table.integer('content_id'); // ID of the related content
    table.specificType('embedding', 'vector(1536)'); // For OpenAI embeddings
    table.jsonb('metadata');
    table.timestamps(true, true);
    
    table.index(['content_type', 'content_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('ai_embeddings');
};