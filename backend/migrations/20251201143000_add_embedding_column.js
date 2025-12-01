/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('knowledge_chunks', function(table) {
    // Storing as JSONB for now to avoid pgvector dependency issues.
    // In production with pgvector, this would be: table.specificType('embedding', 'vector(768)');
    table.jsonb('embedding'); 
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('knowledge_chunks', function(table) {
    table.dropColumn('embedding');
  });
};
