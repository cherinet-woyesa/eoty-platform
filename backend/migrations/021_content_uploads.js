/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.createTable('content_uploads', (table) => {
    table.increments('id').primary();
    table.string('title').notNullable();
    table.text('description');
    table.string('file_name').notNullable();
    table.string('file_type').notNullable(); // video, document, image
    table.string('file_path').notNullable();
    table.string('file_size');
    table.string('mime_type');
    table.string('uploaded_by').notNullable(); // user_id or 'system'
    table.string('chapter_id').notNullable();
    table.jsonb('tags'); // Array of tags
    table.string('category');
    table.string('status').defaultTo('pending'); // pending, approved, rejected, processing
    table.text('rejection_reason');
    table.integer('approved_by').unsigned().references('id').inTable('users');
    table.timestamp('approved_at');
    table.jsonb('metadata'); // Processing info, preview data, etc.
    table.timestamps(true, true);
    
    table.index(['chapter_id', 'status']);
    table.index(['file_type', 'created_at']);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('content_uploads');
};