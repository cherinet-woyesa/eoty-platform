/**
 * Migration: Update subtitles table schema to match current service requirements
 */
exports.up = async function(knex) {
  const exists = await knex.schema.hasTable('subtitles');

  if (exists) {
    // Add missing columns if they don't exist
    const hasLanguageCode = await knex.schema.hasColumn('subtitles', 'language_code');
    if (!hasLanguageCode) {
      await knex.schema.alterTable('subtitles', function(table) {
        table.string('language_code').nullable();
      });
    }

    const hasFileUrl = await knex.schema.hasColumn('subtitles', 'file_url');
    if (!hasFileUrl) {
      await knex.schema.alterTable('subtitles', function(table) {
        table.string('file_url').nullable();
      });
    }

    const hasFileSize = await knex.schema.hasColumn('subtitles', 'file_size');
    if (!hasFileSize) {
      await knex.schema.alterTable('subtitles', function(table) {
        table.integer('file_size').nullable();
      });
    }

    const hasCreatedBy = await knex.schema.hasColumn('subtitles', 'created_by');
    if (!hasCreatedBy) {
      await knex.schema.alterTable('subtitles', function(table) {
        table.string('created_by').nullable(); // Match users.id type (text/string)
      });
    }
  }

  return Promise.resolve();
};

exports.down = async function(knex) {
  // This is a schema update migration, no need for down migration
  return Promise.resolve();
};
