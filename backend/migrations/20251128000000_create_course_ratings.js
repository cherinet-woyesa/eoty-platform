/**
 * Migration: Create course_ratings table
 * Created: 2025-11-28
 */

exports.up = function(knex) {
  return knex.schema
    .createTable('course_ratings', function(table) {
      table.increments('id').primary();
      table.integer('course_id').unsigned().notNullable().references('id').inTable('courses').onDelete('CASCADE');
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.decimal('rating', 2, 1).notNullable(); // 1.0 to 5.0
      table.text('review').nullable();
      table.boolean('is_verified').defaultTo(false);
      table.jsonb('helpful_votes').defaultTo('{"helpful": 0, "not_helpful": 0}');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      // Ensure one rating per user per course
      table.unique(['course_id', 'user_id']);

      // Indexes for performance
      table.index(['course_id']);
      table.index(['user_id']);
      table.index(['rating']);
      table.index(['created_at']);
    });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('course_ratings');
};
