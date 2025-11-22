const knex = require('knex');
require('dotenv').config();

const dbConfig = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: String(process.env.DB_PASSWORD),
  },
};

const db = knex(dbConfig);

async function createModerationTables() {
  try {
    console.log('Creating moderation and boundary condition tables...');

    // Content moderation queue table
    const moderationExists = await db.schema.hasTable('content_moderation');
    if (!moderationExists) {
      await db.schema.createTable('content_moderation', function(table) {
        table.increments('id').primary();
        table.string('content_type').notNullable(); // 'post', 'comment', 'topic'
        table.integer('content_id').notNullable();
        table.string('content_text').notNullable();
        table.string('moderation_status').defaultTo('pending'); // 'pending', 'approved', 'rejected', 'auto_flagged'
        table.string('moderation_reason').nullable();
        table.integer('moderator_id').nullable();
        table.timestamp('moderated_at').nullable();
        table.integer('spam_score').defaultTo(0); // 0-100, higher = more likely spam
        table.json('moderation_metadata').nullable(); // Additional moderation data
        table.timestamps(true, true);

        table.index(['content_type', 'moderation_status']);
        table.index(['spam_score']);
        table.index(['created_at']);
      });
      console.log('✅ Created content_moderation table');
    }

    // Rate limiting table
    const rateLimitExists = await db.schema.hasTable('rate_limits');
    if (!rateLimitExists) {
      await db.schema.createTable('rate_limits', function(table) {
        table.increments('id').primary();
        table.string('user_id').notNullable();
        table.string('action_type').notNullable(); // 'post', 'comment', 'like', etc.
        table.integer('count').defaultTo(0);
        table.timestamp('window_start').notNullable();
        table.timestamp('last_action').notNullable();

        table.unique(['user_id', 'action_type', 'window_start']);
        table.index(['user_id', 'action_type']);
        table.index(['window_start']);
      });
      console.log('✅ Created rate_limits table');
    }

    // Privacy settings table for leaderboard visibility
    const privacyExists = await db.schema.hasTable('user_privacy_settings');
    if (!privacyExists) {
      await db.schema.createTable('user_privacy_settings', function(table) {
        table.increments('id').primary();
        table.string('user_id').notNullable().unique();
        table.boolean('show_in_leaderboards').defaultTo(true);
        table.boolean('show_real_name').defaultTo(false); // For youth privacy
        table.boolean('allow_public_profile').defaultTo(true);
        table.boolean('hide_age_info').defaultTo(true); // COPPA compliance
        table.boolean('restrict_location_sharing').defaultTo(true);
        table.timestamps(true, true);

        table.index(['user_id']);
      });
      console.log('✅ Created user_privacy_settings table');
    }

    // Chapter archiving table
    const archiveExists = await db.schema.hasTable('chapter_archives');
    if (!archiveExists) {
      await db.schema.createTable('chapter_archives', function(table) {
        table.increments('id').primary();
        table.integer('chapter_id').notNullable();
        table.string('chapter_name').notNullable();
        table.timestamp('archived_at').defaultTo(db.fn.now());
        table.string('archive_reason').notNullable(); // 'inactive', 'manual', 'policy'
        table.integer('total_users').defaultTo(0);
        table.integer('total_posts').defaultTo(0);
        table.json('archive_metadata').nullable();
        table.timestamps(true, true);

        table.index(['chapter_id']);
        table.index(['archived_at']);
      });
      console.log('✅ Created chapter_archives table');
    }

    // Real-time update queue for badges/leaderboards
    const updateQueueExists = await db.schema.hasTable('realtime_update_queue');
    if (!updateQueueExists) {
      await db.schema.createTable('realtime_update_queue', function(table) {
        table.increments('id').primary();
        table.string('update_type').notNullable(); // 'badge', 'leaderboard', 'achievement'
        table.string('user_id').nullable();
        table.integer('chapter_id').nullable();
        table.json('update_data').notNullable();
        table.string('status').defaultTo('pending'); // 'pending', 'processing', 'completed', 'failed'
        table.integer('retry_count').defaultTo(0);
        table.timestamp('next_retry_at').nullable();
        table.json('update_data').notNullable();
        table.timestamps(true, true);

        table.index(['update_type', 'status']);
        table.index(['user_id']);
        table.index(['chapter_id']);
        table.index(['created_at']);
      });
      console.log('✅ Created realtime_update_queue table');
    }

    // System health monitoring
    const healthExists = await db.schema.hasTable('system_health');
    if (!healthExists) {
      await db.schema.createTable('system_health', function(table) {
        table.increments('id').primary();
        table.string('component').notNullable(); // 'forum', 'database', 'cache', etc.
        table.string('status').notNullable(); // 'healthy', 'degraded', 'down'
        table.float('response_time').nullable(); // in milliseconds
        table.text('error_message').nullable();
        table.json('health_data').nullable(); // Additional health metrics
        table.timestamps(true, true);

        table.index(['component', 'status']);
        table.index(['created_at']);
      });
      console.log('✅ Created system_health table');
    }

    console.log('✅ Moderation and boundary condition tables setup complete!');
  } catch (error) {
    console.error('❌ Error creating moderation tables:', error);
  } finally {
    await db.destroy();
  }
}

createModerationTables();
