exports.up = function(knex) {
  return knex.schema
    .createTable('video_subtitles', function(table) {
      table.increments('id').primary();
      table.integer('lesson_id').references('id').inTable('lessons').onDelete('CASCADE');
      table.string('language_code').notNullable(); // e.g., 'en', 'am', 'ti'
      table.string('language_name').notNullable(); // e.g., 'English', 'Amharic', 'Tigrigna'
      table.string('subtitle_url').notNullable();
      table.integer('created_by').references('id').inTable('users');
      table.timestamps(true, true);
      
      table.index(['lesson_id', 'language_code']);
      table.unique(['lesson_id', 'language_code']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTable('video_subtitles');
};