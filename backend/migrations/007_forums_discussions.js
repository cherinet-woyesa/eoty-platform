exports.up = function(knex) {
  return knex.schema
    .createTable('forums', function(table) {
      table.increments('id').primary();
      table.string('title').notNullable();
      table.text('description').nullable();
      table.string('chapter_id').notNullable();
      table.boolean('is_public').defaultTo(false);
      table.boolean('is_active').defaultTo(true);
      table.integer('created_by').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('forum_topics', function(table) {
      table.increments('id').primary();
      table.integer('forum_id').notNullable().references('id').inTable('forums').onDelete('CASCADE');
      table.string('title').notNullable();
      table.text('content').notNullable();
      table.integer('author_id').notNullable();
      table.boolean('is_pinned').defaultTo(false);
      table.boolean('is_locked').defaultTo(false);
      table.boolean('is_private').defaultTo(false);
      table.integer('allowed_chapter_id').nullable().references('id').inTable('chapters').onDelete('SET NULL');
      table.integer('view_count').defaultTo(0);
      table.integer('post_count').defaultTo(0);
      // Removed last_post_id reference here to avoid circular dependency
      table.integer('last_post_id').nullable();
      table.timestamp('last_activity_at').defaultTo(knex.fn.now());
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('forum_posts', function(table) {
      table.increments('id').primary();
      table.integer('topic_id').notNullable().references('id').inTable('forum_topics').onDelete('CASCADE');
      table.integer('author_id').notNullable();
      table.text('content').notNullable();
      table.integer('parent_id').nullable().references('id').inTable('forum_posts').onDelete('CASCADE');
      table.integer('reply_count').defaultTo(0);
      table.integer('like_count').defaultTo(0);
      table.boolean('is_moderated').defaultTo(false);
      table.string('moderation_reason').nullable();
      table.json('metadata').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    // Add foreign key constraint after both tables are created
    .alterTable('forum_topics', function(table) {
      table.foreign('last_post_id').references('id').inTable('forum_posts').onDelete('SET NULL');
    })
    .createTable('forum_post_likes', function(table) {
      table.increments('id').primary();
      table.integer('post_id').notNullable().references('id').inTable('forum_posts').onDelete('CASCADE');
      table.integer('user_id').notNullable();
      table.unique(['post_id', 'user_id']);
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    .createTable('badges', function(table) {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.text('description').nullable();
      table.string('icon_url').nullable();
      table.string('badge_type').notNullable();
      table.string('category').nullable();
      table.integer('points').defaultTo(0);
      table.json('requirements').nullable();
      table.boolean('is_active').defaultTo(true);
      table.string('rarity').nullable();
      table.string('icon_color').nullable();
      table.boolean('is_featured').defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('user_badges', function(table) {
      table.increments('id').primary();
      table.integer('user_id').notNullable();
      table.integer('badge_id').notNullable().references('id').inTable('badges').onDelete('CASCADE');
      table.timestamp('earned_at').defaultTo(knex.fn.now());
      table.json('metadata').nullable();
      table.unique(['user_id', 'badge_id']);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('leaderboard_entries', function(table) {
      table.increments('id').primary();
      table.integer('user_id').notNullable();
      table.string('chapter_id').notNullable();
      table.string('leaderboard_type').defaultTo('chapter');
      table.integer('points').defaultTo(0);
      table.integer('rank').nullable();
      table.boolean('is_anonymous').defaultTo(false);
      table.date('period_date').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('user_engagement', function(table) {
      table.increments('id').primary();
      table.integer('user_id').notNullable();
      table.string('engagement_type').notNullable();
      table.string('content_type').nullable();
      table.integer('content_id').nullable();
      table.integer('points_earned').defaultTo(0);
      table.json('metadata').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    .createTable('user_warnings', function(table) {
      table.increments('id').primary();
      table.integer('user_id').notNullable();
      table.integer('moderator_id').notNullable();
      table.text('reason').notNullable();
      table.string('entity_type').nullable();
      table.integer('entity_id').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTable('user_warnings')
    .dropTable('user_engagement')
    .dropTable('leaderboard_entries')
    .dropTable('user_badges')
    .dropTable('badges')
    .dropTable('forum_post_likes')
    .dropTable('forum_posts')
    .dropTable('forum_topics')
    .dropTable('forums');
};
