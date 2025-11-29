
exports.up = function(knex) {
  return knex.schema.hasTable('content_uploads').then(exists => {
    if (!exists) {
      return knex.schema.createTable('content_uploads', table => {
        table.increments('id').primary();
        table.string('title').notNullable();
        table.text('description');
        table.string('file_name').notNullable();
        table.string('file_type');
        table.string('file_path');
        table.string('public_url');
        table.string('file_size');
        table.string('category');
        table.jsonb('tags').defaultTo('[]');
        table.integer('chapter_id').references('id').inTable('chapters').onDelete('SET NULL');
        table.integer('uploaded_by').references('id').inTable('users').onDelete('CASCADE');
        table.string('status').defaultTo('pending'); // pending, approved, rejected
        table.text('rejection_reason');
        table.timestamps(true, true);
      });
    }
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('content_uploads');
};
