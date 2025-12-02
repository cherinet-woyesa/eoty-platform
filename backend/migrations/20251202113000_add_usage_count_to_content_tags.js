/**
 * Add usage_count column to content_tags for ordering and analytics.
 * Ensures default of 0 and NOT NULL to avoid null sorting issues.
 */
exports.up = async function(knex) {
  const exists = await knex.schema.hasColumn('content_tags', 'usage_count');
  if (!exists) {
    await knex.schema.alterTable('content_tags', function(table) {
      table.integer('usage_count').notNullable().defaultTo(0);
    });
  }
};

exports.down = async function(knex) {
  const exists = await knex.schema.hasColumn('content_tags', 'usage_count');
  if (exists) {
    await knex.schema.alterTable('content_tags', function(table) {
      table.dropColumn('usage_count');
    });
  }
};