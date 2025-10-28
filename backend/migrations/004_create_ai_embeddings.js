exports.up = function(knex) {
  return knex.schema.createTable('ai_embeddings', function(table) {
    table.increments('id').primary();
    table.text('content').notNullable();
    table.string('content_type'); // course, resource, lesson, etc.
    table.integer('content_id'); // ID of the related content
    
    // Conditional handling for vector type
    if (process.env.NODE_ENV === 'production' || process.env.DB_HOST === 'db') {
      // In production or Docker environment, use vector type
      table.specificType('embedding', 'vector(1536)'); // For OpenAI embeddings
    } else {
      // In local development, use JSON as fallback
      table.json('embedding');
    }
    
    table.jsonb('metadata');
    table.timestamps(true, true);
    
    table.index(['content_type', 'content_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('ai_embeddings');
};