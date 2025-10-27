exports.up = function(knex) {
  return knex.schema.createTable('resources', function(table) {
    table.increments('id').primary();
    table.string('title').notNullable();
    table.text('description');
    table.string('file_url').notNullable();
    table.string('file_type'); // pdf, doc, image, etc.
    table.string('tags'); // JSON array of tags
    table.integer('chapter_id').references('id').inTable('chapters');
    table.integer('uploaded_by').references('id').inTable('users');
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('resources');
};