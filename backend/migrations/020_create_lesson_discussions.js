/**
 * Migration: create lesson_discussions table
 */
exports.up = async function(knex) {
  const exists = await knex.schema.hasTable('lesson_discussions');
  if (!exists) {
    return knex.schema.createTable('lesson_discussions', function(table) {
      table.increments('id').primary();
      table.integer('lesson_id').notNullable().references('id').inTable('lessons').onDelete('CASCADE');
      // Use string for user_id to avoid FK type mismatches (UUID vs integer)
      table.string('user_id').nullable();
      table.integer('parent_id').nullable().references('id').inTable('lesson_discussions').onDelete('CASCADE');
      table.text('content');
      table.integer('video_timestamp').nullable();
      table.boolean('is_approved').defaultTo(false);
      table.boolean('is_pinned').defaultTo(false);
      table.integer('likes_count').defaultTo(0);
      table.integer('replies_count').defaultTo(0);
      table.timestamps(true, true);
    });
  }
  return Promise.resolve();
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('lesson_discussions');
};
