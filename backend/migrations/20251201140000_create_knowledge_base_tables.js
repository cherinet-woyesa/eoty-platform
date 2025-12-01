/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('knowledge_documents', function(table) {
      table.increments('id').primary();
      table.string('title').notNullable();
      table.text('description');
      table.string('category').notNullable().defaultTo('general'); // scripture, liturgy, theology, history, legal
      table.string('file_url');
      table.string('file_type');
      table.string('status').defaultTo('pending'); // pending, processing, active, error
      table.jsonb('metadata').defaultTo('{}');
      table.integer('created_by').unsigned().references('id').inTable('users');
      table.timestamps(true, true);
    })
    .createTable('knowledge_chunks', function(table) {
      table.increments('id').primary();
      table.integer('document_id').unsigned().references('id').inTable('knowledge_documents').onDelete('CASCADE');
      table.text('content').notNullable();
      table.integer('chunk_index').notNullable();
      table.integer('token_count');
      // Note: We are not adding a vector column here yet to avoid dependency on pgvector extension being present.
      // We can add it later or use a separate vector store.
      table.timestamps(true, true);
      
      table.index(['document_id']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('knowledge_chunks')
    .dropTableIfExists('knowledge_documents');
};
