exports.up = async function(knex) {
  // Forums table
  await knex.schema.createTable('forums', (table) => {
    table.increments('id').primary();
    table.string('title').notNullable();
    table.text('description');
    table.string('chapter_id').notNullable();
    table.boolean('is_public').defaultTo(true);
    table.boolean('is_active').defaultTo(true);
    table.integer('created_by').unsigned().notNullable();
    table.json('moderation_rules'); // Custom moderation rules per forum
    table.timestamps(true, true);
    
    table.foreign('created_by').references('id').inTable('users');
    table.index(['chapter_id', 'is_active']);
  });

  // Forum topics table
  await knex.schema.createTable('forum_topics', (table) => {
    table.increments('id').primary();
    table.integer('forum_id').unsigned().notNullable();
    table.string('title').notNullable();
    table.text('content').notNullable();
    table.integer('author_id').unsigned().notNullable();
    table.boolean('is_pinned').defaultTo(false);
    table.boolean('is_locked').defaultTo(false);
    table.integer('view_count').defaultTo(0);
    table.integer('post_count').defaultTo(0);
    table.integer('last_post_id').unsigned();
    table.timestamp('last_activity_at').defaultTo(knex.fn.now());
    table.timestamps(true, true);
    
    table.foreign('forum_id').references('id').inTable('forums').onDelete('CASCADE');
    table.foreign('author_id').references('id').inTable('users');
    table.index(['forum_id', 'last_activity_at']);
  });

  // Forum posts table
  await knex.schema.createTable('forum_posts', (table) => {
    table.increments('id').primary();
    table.integer('topic_id').unsigned().notNullable();
    table.integer('author_id').unsigned().notNullable();
    table.text('content').notNullable();
    table.integer('parent_id').unsigned(); // For threaded replies
    table.integer('reply_count').defaultTo(0);
    table.integer('like_count').defaultTo(0);
    table.boolean('is_moderated').defaultTo(false);
    table.string('moderation_reason');
    table.json('metadata'); // Edit history, flags, etc.
    table.timestamps(true, true);
    
    table.foreign('topic_id').references('id').inTable('forum_topics').onDelete('CASCADE');
    table.foreign('author_id').references('id').inTable('users');
    table.foreign('parent_id').references('id').inTable('forum_posts');
    table.index(['topic_id', 'created_at']);
  });

  // Badges table
  await knex.schema.createTable('badges', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.text('description');
    table.string('icon_url').notNullable();
    table.string('badge_type').notNullable(); // completion, participation, leadership, special
    table.string('category'); // learning, community, contribution, etc.
    table.integer('points').defaultTo(0);
    table.json('requirements'); // Criteria for earning the badge
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    table.unique('name');
    table.index(['badge_type', 'category']);
  });

  // User badges table
  await knex.schema.createTable('user_badges', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.integer('badge_id').unsigned().notNullable();
    table.timestamp('earned_at').defaultTo(knex.fn.now());
    table.json('metadata'); // Context of how badge was earned
    table.timestamps(true, true);
    
    table.foreign('user_id').references('id').inTable('users');
    table.foreign('badge_id').references('id').inTable('badges');
    table.unique(['user_id', 'badge_id']);
    table.index(['user_id', 'earned_at']);
  });

  // Leaderboard entries table
  await knex.schema.createTable('leaderboard_entries', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.string('chapter_id').notNullable();
    table.string('leaderboard_type').notNullable(); // chapter, global, weekly, monthly
    table.integer('points').defaultTo(0);
    table.integer('rank').defaultTo(0);
    table.boolean('is_anonymous').defaultTo(false);
    table.date('period_date'); // For time-based leaderboards
    table.timestamps(true, true);
    
    table.foreign('user_id').references('id').inTable('users');
    table.unique(['user_id', 'chapter_id', 'leaderboard_type', 'period_date']);
    table.index(['chapter_id', 'leaderboard_type', 'points']);
  });

  // User engagement tracking
  await knex.schema.createTable('user_engagement', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.string('engagement_type').notNullable(); // forum_post, lesson_complete, resource_view, etc.
    table.string('entity_type'); // forum_topic, course, resource, etc.
    table.integer('entity_id'); // ID of the related entity
    table.integer('points_earned').defaultTo(0);
    table.json('metadata');
    table.timestamps(true, true);
    
    table.foreign('user_id').references('id').inTable('users');
    table.index(['user_id', 'engagement_type', 'created_at']);
  });

  // Moderation logs
  await knex.schema.createTable('moderation_logs', (table) => {
    table.increments('id').primary();
    table.integer('moderator_id').unsigned().notNullable();
    table.string('action_type').notNullable(); // delete_post, lock_topic, warn_user, etc.
    table.string('target_type').notNullable(); // forum_post, forum_topic, user
    table.integer('target_id').notNullable();
    table.text('reason');
    table.json('details');
    table.timestamps(true, true);
    
    table.foreign('moderator_id').references('id').inTable('users');
    table.index(['target_type', 'target_id']);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTable('moderation_logs');
  await knex.schema.dropTable('user_engagement');
  await knex.schema.dropTable('leaderboard_entries');
  await knex.schema.dropTable('user_badges');
  await knex.schema.dropTable('badges');
  await knex.schema.dropTable('forum_posts');
  await knex.schema.dropTable('forum_topics');
  await knex.schema.dropTable('forums');
};