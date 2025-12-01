exports.up = async function(knex) {
  // Content moderation queue table
  const hasContentModeration = await knex.schema.hasTable('content_moderation');
  if (!hasContentModeration) {
    await knex.schema.createTable('content_moderation', function(table) {
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
  }

  // Rate limiting table
  const hasRateLimits = await knex.schema.hasTable('rate_limits');
  if (!hasRateLimits) {
    await knex.schema.createTable('rate_limits', function(table) {
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
  }

  // Privacy settings table for leaderboard visibility
  const hasUserPrivacySettings = await knex.schema.hasTable('user_privacy_settings');
  if (!hasUserPrivacySettings) {
    await knex.schema.createTable('user_privacy_settings', function(table) {
      table.increments('id').primary();
      table.string('user_id').notNullable().unique(); // Assuming user_id is string based on usage, but usually it's integer referencing users.id. Keeping as string to match script.
      table.boolean('show_in_leaderboards').defaultTo(true);
      table.boolean('show_real_name').defaultTo(false); // For youth privacy
      table.boolean('allow_public_profile').defaultTo(true);
      table.boolean('hide_age_info').defaultTo(true); // COPPA compliance
      table.boolean('restrict_location_sharing').defaultTo(true);
      table.timestamps(true, true);

      table.index(['user_id']);
    });
  }

  // Chapter archiving table
  const hasChapterArchives = await knex.schema.hasTable('chapter_archives');
  if (!hasChapterArchives) {
    await knex.schema.createTable('chapter_archives', function(table) {
      table.increments('id').primary();
      table.integer('chapter_id').notNullable();
      table.string('chapter_name').notNullable();
      table.timestamp('archived_at').defaultTo(knex.fn.now());
      table.string('archive_reason').notNullable(); // 'inactive', 'manual', 'policy'
      table.integer('total_users').defaultTo(0);
      table.integer('total_posts').defaultTo(0);
      table.json('archive_metadata').nullable();
      table.timestamps(true, true);

      table.index(['chapter_id']);
      table.index(['archived_at']);
    });
  }

  // Real-time update queue for badges/leaderboards
  const hasRealtimeUpdateQueue = await knex.schema.hasTable('realtime_update_queue');
  if (!hasRealtimeUpdateQueue) {
    await knex.schema.createTable('realtime_update_queue', function(table) {
      table.increments('id').primary();
      table.string('update_type').notNullable(); // 'badge', 'leaderboard', 'achievement'
      table.string('user_id').nullable();
      table.integer('chapter_id').nullable();
      table.json('update_data').notNullable();
      table.string('status').defaultTo('pending'); // 'pending', 'processing', 'completed', 'failed'
      table.integer('retry_count').defaultTo(0);
      table.timestamp('next_retry_at').nullable();
      table.timestamps(true, true);

      table.index(['update_type', 'status']);
      table.index(['user_id']);
      table.index(['chapter_id']);
      table.index(['created_at']);
    });
  }

  // System health monitoring
  const hasSystemHealth = await knex.schema.hasTable('system_health');
  if (!hasSystemHealth) {
    await knex.schema.createTable('system_health', function(table) {
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
  }

  // Uptime Monitoring Tables
  const hasUptimeMonitoring = await knex.schema.hasTable('uptime_monitoring');
  if (!hasUptimeMonitoring) {
    await knex.schema.createTable('uptime_monitoring', function(table) {
      table.increments('id').primary();
      table.boolean('is_healthy').notNullable();
      table.text('error_message').nullable();
      table.float('check_duration_ms').nullable();
      table.float('uptime_percentage').nullable();
      table.timestamp('timestamp').defaultTo(knex.fn.now());
      
      table.index(['timestamp']);
    });
  }

  const hasUptimeAlerts = await knex.schema.hasTable('uptime_alerts');
  if (!hasUptimeAlerts) {
    await knex.schema.createTable('uptime_alerts', function(table) {
      table.increments('id').primary();
      table.string('severity').notNullable(); // 'CRITICAL', 'WARNING'
      table.text('message').notNullable();
      table.float('uptime_percentage').nullable();
      table.integer('consecutive_failures').defaultTo(0);
      table.boolean('resolved').defaultTo(false);
      table.timestamp('resolved_at').nullable();
      table.timestamp('timestamp').defaultTo(knex.fn.now());

      table.index(['resolved']);
      table.index(['timestamp']);
    });
  }

  const hasUptimeStatistics = await knex.schema.hasTable('uptime_statistics');
  if (!hasUptimeStatistics) {
    await knex.schema.createTable('uptime_statistics', function(table) {
      table.increments('id').primary();
      table.integer('total_checks').defaultTo(0);
      table.integer('successful_checks').defaultTo(0);
      table.integer('failed_checks').defaultTo(0);
      table.float('uptime_percentage').defaultTo(100.0);
      table.boolean('meets_threshold').defaultTo(true);
      table.timestamp('timestamp').defaultTo(knex.fn.now());

      table.index(['timestamp']);
    });
  }
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('uptime_statistics')
    .dropTableIfExists('uptime_alerts')
    .dropTableIfExists('uptime_monitoring')
    .dropTableIfExists('system_health')
    .dropTableIfExists('realtime_update_queue')
    .dropTableIfExists('chapter_archives')
    .dropTableIfExists('user_privacy_settings')
    .dropTableIfExists('rate_limits')
    .dropTableIfExists('content_moderation');
};
