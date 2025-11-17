/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // This migration previously created a large set of content_* tables.
  // In your database these tables already exist (and in some cases have
  // slightly different column types), so we intentionally do **nothing**
  // here to avoid conflicts like "relation already exists" or FK type errors.
  console.log('Skipping legacy 010_content_uploads migration - tables already exist');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('content_shares');
  await knex.schema.dropTableIfExists('content_favorites');
  await knex.schema.dropTableIfExists('content_ratings');
  await knex.schema.dropTableIfExists('content_usage_stats');
  await knex.schema.dropTableIfExists('content_review_queue');
  await knex.schema.dropTableIfExists('content_uploads');
};