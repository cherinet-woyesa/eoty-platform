/**
 * Migration: create video_annotations table
 */
exports.up = async function(knex) {
  const exists = await knex.schema.hasTable('video_annotations');
  if (!exists) {
    return knex.schema.createTable('video_annotations', function(table) {
      table.increments('id').primary();
      table.integer('lesson_id').notNullable().references('id').inTable('lessons').onDelete('CASCADE');
      // Use string for user_id to be compatible with environments using UUID/text ids
      table.string('user_id').nullable();
      table.integer('timestamp').defaultTo(0);
      table.text('content');
      table.boolean('is_public').defaultTo(false);
      table.timestamps(true, true);
    });
  }
  return Promise.resolve();
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('video_annotations');
};
