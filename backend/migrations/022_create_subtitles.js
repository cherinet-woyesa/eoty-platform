/**
 * Migration: create subtitles table (optional helper used by UI)
 */
exports.up = async function(knex) {
  const exists = await knex.schema.hasTable('subtitles');
  if (!exists) {
    return knex.schema.createTable('subtitles', function(table) {
      table.increments('id').primary();
      table.integer('lesson_id').notNullable().references('id').inTable('lessons').onDelete('CASCADE');
      table.string('language').defaultTo('en');
      table.string('language_code').nullable(); // ISO 639-1 language code
      table.string('url');
      table.string('file_url').nullable(); // New column for file URL
      table.integer('file_size').nullable(); // File size in bytes
      table.string('created_by').nullable(); // Match users.id type (text/string)
      table.timestamps(true, true);
    });
  }
  return Promise.resolve();
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('subtitles');
};
