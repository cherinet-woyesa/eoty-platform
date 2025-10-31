/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if forums table exists
  const hasForumsTable = await knex.schema.hasTable('forums');
  
  if (hasForumsTable) {
    // Add missing columns to forums table
    await knex.schema.table('forums', (table) => {
      table.integer('chapter_id').unsigned().references('id').inTable('chapters').onDelete('CASCADE');
      table.boolean('is_active').defaultTo(true);
      table.boolean('is_public').defaultTo(true);
      table.jsonb('moderation_rules').nullable();
    });

    // Add indexes
    await knex.schema.alterTable('forums', (table) => {
      table.index(['chapter_id', 'is_active']);
    });
  }

  // Check if forum_posts table exists and add missing columns
  const hasForumPostsTable = await knex.schema.hasTable('forum_posts');
  
  if (hasForumPostsTable) {
    await knex.schema.table('forum_posts', (table) => {
      table.integer('like_count').defaultTo(0);
      table.boolean('is_moderated').defaultTo(false);
      table.string('moderation_reason').nullable();
      table.jsonb('metadata').nullable();
    });
  }
};

exports.down = async function(knex) {
  const hasForumsTable = await knex.schema.hasTable('forums');
  const hasForumPostsTable = await knex.schema.hasTable('forum_posts');
  
  if (hasForumsTable) {
    await knex.schema.table('forums', (table) => {
      table.dropColumn('chapter_id');
      table.dropColumn('is_active');
      table.dropColumn('is_public');
      table.dropColumn('moderation_rules');
    });
  }
  
  if (hasForumPostsTable) {
    await knex.schema.table('forum_posts', (table) => {
      table.dropColumn('like_count');
      table.dropColumn('is_moderated');
      table.dropColumn('moderation_reason');
      table.dropColumn('metadata');
    });
  }
};