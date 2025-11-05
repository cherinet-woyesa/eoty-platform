/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if columns already exist before adding them
  const hasLevel = await knex.schema.hasColumn('courses', 'level');
  const hasCoverImage = await knex.schema.hasColumn('courses', 'cover_image');

  await knex.schema.table('courses', function(table) {
    if (!hasLevel) {
      table.string('level'); // beginner, intermediate, advanced
    }
    if (!hasCoverImage) {
      table.string('cover_image'); // URL or path to cover image
    }
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.table('courses', function(table) {
    table.dropColumn('level');
    table.dropColumn('cover_image');
  });
};
