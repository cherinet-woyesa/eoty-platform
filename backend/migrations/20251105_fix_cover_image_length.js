/**
 * Migration to fix cover_image column length
 * Changes from varchar(255) to text to support base64 encoded images
 */

exports.up = async function(knex) {
  // Check if column exists
  const hasCoverImage = await knex.schema.hasColumn('courses', 'cover_image');
  
  if (hasCoverImage) {
    // Alter the column type to text
    await knex.schema.alterTable('courses', function(table) {
      table.text('cover_image').alter();
    });
    console.log('✓ Changed cover_image column to text type');
  }
};

exports.down = async function(knex) {
  // Revert back to varchar(255)
  await knex.schema.alterTable('courses', function(table) {
    table.string('cover_image', 255).alter();
  });
};
