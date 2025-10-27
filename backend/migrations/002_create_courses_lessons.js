exports.up = function(knex) {
  return knex.schema
    .createTable('courses', function(table) {
      table.increments('id').primary();
      table.string('title').notNullable();
      table.text('description');
      table.string('category');
      table.integer('created_by').references('id').inTable('users');
      table.boolean('is_published').defaultTo(false);
      table.timestamp('published_at');
      table.timestamps(true, true);
    })
    .createTable('lessons', function(table) {
      table.increments('id').primary();
      table.string('title').notNullable();
      table.text('description');
      table.integer('course_id').references('id').inTable('courses').onDelete('CASCADE');
      table.integer('order').defaultTo(0);
      table.string('video_url');
      table.integer('created_by').references('id').inTable('users');
      table.boolean('is_published').defaultTo(false);
      table.timestamp('published_at');
      table.timestamps(true, true);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('lessons')
    .dropTableIfExists('courses');
};