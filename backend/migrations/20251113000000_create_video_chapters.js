/**
 * Migration: Create video_chapters table
 * for storing chapter markers in video lessons
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.createTable('video_chapters', function(table) {
    table.increments('id').primary();
    table.integer('lesson_id').unsigned().notNullable().references('id').inTable('lessons').onDelete('CASCADE');
    table.string('title').notNullable(); // Chapter title
    table.decimal('start_time', 10, 2).notNullable(); // Start timestamp in seconds
    table.decimal('end_time', 10, 2); // Optional end timestamp
    table.text('description'); // Optional chapter description
    table.string('thumbnail_url'); // Optional chapter thumbnail
    table.integer('order').defaultTo(0); // Chapter order in the video
    table.boolean('is_active').defaultTo(true); // Whether chapter is active
    table.timestamps(true, true);
    
    table.index(['lesson_id', 'order']);
    table.index(['lesson_id', 'start_time']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('video_chapters');
};


