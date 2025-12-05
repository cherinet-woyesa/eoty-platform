exports.up = async function(knex) {
  const hasComments = await knex.schema.hasTable('community_post_comments');
  if (!hasComments) {
    await knex.schema.createTable('community_post_comments', function(table) {
      table.increments('id').primary();
      table.integer('post_id').references('id').inTable('community_posts').onDelete('CASCADE');
      table.integer('author_id').references('id').inTable('users').onDelete('SET NULL');
      table.string('author_name');
      table.string('author_avatar');
      table.text('content').notNullable();
      table.integer('parent_comment_id').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }

  const hasShares = await knex.schema.hasTable('community_post_shares');
  if (!hasShares) {
    await knex.schema.createTable('community_post_shares', function(table) {
      table.increments('id').primary();
      table.integer('post_id').references('id').inTable('community_posts').onDelete('CASCADE');
      table.integer('shared_by').references('id').inTable('users').onDelete('CASCADE');
      table.integer('shared_with').nullable().references('id').inTable('users').onDelete('SET NULL');
      table.integer('chapter_id').nullable().references('id').inTable('chapters').onDelete('SET NULL');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  const hasLikes = await knex.schema.hasTable('community_post_likes');
  if (!hasLikes) {
    await knex.schema.createTable('community_post_likes', function(table) {
      table.increments('id').primary();
      table.integer('post_id').references('id').inTable('community_posts').onDelete('CASCADE');
      table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.unique(['post_id', 'user_id']);
    });
  }
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('community_post_likes')
    .dropTableIfExists('community_post_shares')
    .dropTableIfExists('community_post_comments');
};
