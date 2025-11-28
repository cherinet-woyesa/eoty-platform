/**
 * Migration: Create course_stats table
 * Created: 2025-11-28
 */

exports.up = function(knex) {
  return knex.schema
    .createTable('course_stats', function(table) {
      table.increments('id').primary();
      table.integer('course_id').notNullable().references('id').inTable('courses').onDelete('CASCADE');
      table.integer('view_count').defaultTo(0);
      table.integer('enrollment_count').defaultTo(0);
      table.integer('completion_count').defaultTo(0);
      table.integer('favorite_count').defaultTo(0);
      table.decimal('average_rating', 3, 2).defaultTo(0.00); // 0.00 to 5.00
      table.integer('rating_count').defaultTo(0);
      table.jsonb('engagement_metrics').defaultTo('{}');
      table.timestamp('last_accessed_at').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      // Ensure one stats record per course
      table.unique(['course_id']);

      // Indexes for performance
      table.index(['course_id']);
      table.index(['view_count']);
      table.index(['enrollment_count']);
      table.index(['average_rating']);
    });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('course_stats');
};
