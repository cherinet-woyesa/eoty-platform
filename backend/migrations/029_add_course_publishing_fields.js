/**
 * Migration: Add publishing workflow fields to courses table
 * Adds scheduled_publish_at and is_public columns for course visibility control
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.alterTable('courses', function(table) {
    // Scheduled publishing timestamp
    table.timestamp('scheduled_publish_at').nullable();
    
    // Visibility control (public/private)
    table.boolean('is_public').defaultTo(true);
    
    // Add index for scheduled publishing queries
    table.index(['scheduled_publish_at', 'is_published']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.alterTable('courses', function(table) {
    table.dropIndex(['scheduled_publish_at', 'is_published']);
    table.dropColumn('scheduled_publish_at');
    table.dropColumn('is_public');
  });
};
