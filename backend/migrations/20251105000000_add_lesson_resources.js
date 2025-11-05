/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Add resources column to lessons table for storing downloadable resources
  await knex.schema.table('lessons', (table) => {
    table.jsonb('resources').defaultTo('[]');
    table.string('thumbnail_url');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.table('lessons', (table) => {
    table.dropColumn('resources');
    table.dropColumn('thumbnail_url');
  });
};
