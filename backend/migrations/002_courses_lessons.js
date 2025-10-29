/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Courses
  await knex.schema.createTable('courses', function(table) {
    table.increments('id').primary();
    table.string('title').notNullable();
    table.text('description');
    table.string('category');
    table.integer('created_by').unsigned().references('id').inTable('users').onDelete('SET NULL');
    table.boolean('is_published').defaultTo(false);
    table.timestamp('published_at');
    table.timestamps(true, true);
  });

  // Lessons
  await knex.schema.createTable('lessons', function(table) {
    table.increments('id').primary();
    table.string('title').notNullable();
    table.text('description');
    table.integer('course_id').unsigned().references('id').inTable('courses').onDelete('CASCADE');
    table.integer('order').defaultTo(0);
    table.string('video_url');
    table.integer('created_by').unsigned().references('id').inTable('users').onDelete('SET NULL');
    table.boolean('is_published').defaultTo(false);
    table.timestamp('published_at');
    table.integer('duration').defaultTo(0);
    table.timestamps(true, true);
    table.index(['course_id', 'order']);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('lessons');
  await knex.schema.dropTableIfExists('courses');
};