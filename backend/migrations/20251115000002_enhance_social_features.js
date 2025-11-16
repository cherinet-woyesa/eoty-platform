/**
 * Migration: Enhance Social Features (FR4)
 * REQUIREMENT: Private/public threads, auto-archiving, search indexing
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Add is_private column to forum_topics (REQUIREMENT: Private/public threads)
  const hasIsPrivate = await knex.schema.hasColumn('forum_topics', 'is_private');
  if (!hasIsPrivate) {
    await knex.schema.table('forum_topics', (table) => {
      table.boolean('is_private').defaultTo(false);
      table.integer('allowed_chapter_id').unsigned().references('id').inTable('chapters').onDelete('SET NULL');
    });
  }

  // Add is_anonymous column to leaderboard_entries if it doesn't exist (REQUIREMENT: Anonymity opts)
  const hasLeaderboardTable = await knex.schema.hasTable('leaderboard_entries');
  if (hasLeaderboardTable) {
    const hasIsAnonymous = await knex.schema.hasColumn('leaderboard_entries', 'is_anonymous');
    if (!hasIsAnonymous) {
      await knex.schema.table('leaderboard_entries', (table) => {
        table.boolean('is_anonymous').defaultTo(false);
      });
    }
  } else {
    // Create leaderboard_entries table if it doesn't exist
    await knex.schema.createTable('leaderboard_entries', (table) => {
      table.increments('id').primary();
      // Create user_id without foreign key constraint to avoid type mismatch
      table.integer('user_id').unsigned();
      table.integer('chapter_id').unsigned().references('id').inTable('chapters').onDelete('CASCADE');
      table.string('leaderboard_type').defaultTo('chapter'); // chapter, global
      table.integer('points').defaultTo(0);
      table.integer('rank').defaultTo(0);
      table.boolean('is_anonymous').defaultTo(false);
      table.timestamp('period_date');
      table.timestamps(true, true);
      
      table.index(['chapter_id', 'leaderboard_type', 'rank']);
      table.index(['user_id', 'leaderboard_type']);
    });

    // Note: Foreign key constraint not added due to potential type mismatch
    // Application-level integrity will be maintained
  }

  // Add auto_archive_at column to forums (REQUIREMENT: Auto-archiving for inactive chapters)
  const hasAutoArchive = await knex.schema.hasColumn('forums', 'auto_archive_at');
  if (!hasAutoArchive) {
    await knex.schema.table('forums', (table) => {
      table.timestamp('auto_archive_at').nullable();
      table.integer('inactivity_days').defaultTo(90); // Archive after 90 days of inactivity
    });
  }

  // Add auto_archive_at column to chapters (REQUIREMENT: Auto-archiving for inactive chapters)
  const hasChapterAutoArchive = await knex.schema.hasColumn('chapters', 'auto_archive_at');
  if (!hasChapterAutoArchive) {
    await knex.schema.table('chapters', (table) => {
      table.timestamp('auto_archive_at').nullable();
      table.integer('inactivity_days').defaultTo(180); // Archive after 180 days of inactivity
    });
  }

  // Create forum search index table (REQUIREMENT: Forum posts indexed for search)
  const hasForumSearchIndex = await knex.schema.hasTable('forum_search_index');
  if (!hasForumSearchIndex) {
    await knex.schema.createTable('forum_search_index', (table) => {
      table.increments('id').primary();
      table.integer('post_id').unsigned().references('id').inTable('forum_posts').onDelete('CASCADE');
      table.integer('topic_id').unsigned().references('id').inTable('forum_topics').onDelete('CASCADE');
      table.text('searchable_content'); // Full-text search content
      table.text('keywords'); // Extracted keywords
      table.timestamp('indexed_at').defaultTo(knex.fn.now());
      table.timestamps(true, true);
      
      table.index(['topic_id']);
      table.index(['post_id']);
      // Full-text search index (PostgreSQL specific)
      if (knex.client.config.client === 'pg') {
        table.specificType('search_vector', 'tsvector');
      }
    });
  }

  // Create badge update queue for real-time updates (REQUIREMENT: Updates within 1 minute)
  const hasBadgeUpdateQueue = await knex.schema.hasTable('badge_update_queue');
  if (!hasBadgeUpdateQueue) {
    await knex.schema.createTable('badge_update_queue', (table) => {
      table.increments('id').primary();
      // Create user_id without foreign key constraint to avoid type mismatch
      // Foreign key will be added separately if types match
      table.integer('user_id').unsigned();
      table.integer('badge_id').unsigned().references('id').inTable('badges').onDelete('CASCADE');
      table.string('update_type').notNullable(); // 'award', 'revoke', 'update_points'
      table.jsonb('metadata');
      table.boolean('processed').defaultTo(false);
      table.timestamp('processed_at');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      table.index(['processed', 'created_at']);
      table.index(['user_id']);
    });

    // Note: Foreign key constraint not added due to potential type mismatch
    // Application-level integrity will be maintained
  }

  // Create leaderboard update queue for real-time updates (REQUIREMENT: Updates within 1 minute)
  const hasLeaderboardUpdateQueue = await knex.schema.hasTable('leaderboard_update_queue');
  if (!hasLeaderboardUpdateQueue) {
    await knex.schema.createTable('leaderboard_update_queue', (table) => {
      table.increments('id').primary();
      // Create user_id without foreign key constraint to avoid type mismatch
      table.integer('user_id').unsigned();
      table.integer('chapter_id').unsigned().references('id').inTable('chapters').onDelete('CASCADE');
      table.string('update_type').notNullable(); // 'points_change', 'rank_update'
      table.integer('points_delta').defaultTo(0);
      table.jsonb('metadata');
      table.boolean('processed').defaultTo(false);
      table.timestamp('processed_at');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      table.index(['processed', 'created_at']);
      table.index(['user_id', 'chapter_id']);
    });

    // Note: Foreign key constraint not added due to potential type mismatch
    // Application-level integrity will be maintained
  }

  // Add is_anonymous preference to users table if it doesn't exist
  const hasUserAnonymity = await knex.schema.hasColumn('users', 'is_anonymous');
  if (!hasUserAnonymity) {
    await knex.schema.table('users', (table) => {
      table.boolean('is_anonymous').defaultTo(false);
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('leaderboard_update_queue');
  await knex.schema.dropTableIfExists('badge_update_queue');
  await knex.schema.dropTableIfExists('forum_search_index');
  
  // Note: We don't drop columns to preserve data
};

