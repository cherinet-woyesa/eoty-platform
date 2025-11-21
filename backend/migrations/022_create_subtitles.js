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
      table.string('url');
      table.timestamps(true, true);
    });
  }
  return Promise.resolve();
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('subtitles');
};
