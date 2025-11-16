/**
 * Migration: Enhance Chapter Support & Authentication (FR7)
 * REQUIREMENT: Multi-city/chapter membership, SSO, activity logs, localization
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Enhance chapters table with location/topic support
  const hasCountry = await knex.schema.hasColumn('chapters', 'country');
  if (!hasCountry) {
    await knex.schema.table('chapters', (table) => {
      table.string('country').nullable();
      table.string('city').nullable();
      table.string('timezone').defaultTo('UTC');
      table.string('language').defaultTo('en');
      table.json('topics').nullable(); // Array of topics/categories
      table.string('region').nullable(); // e.g., "North America", "Europe"
      table.decimal('latitude', 10, 8).nullable();
      table.decimal('longitude', 11, 8).nullable();
    });
  }

  // Create user_chapters table for multi-chapter membership (REQUIREMENT: Supports multiple chapters)
  const hasUserChapters = await knex.schema.hasTable('user_chapters');
  if (!hasUserChapters) {
    await knex.schema.createTable('user_chapters', (table) => {
      table.increments('id').primary();
      // Note: user_id foreign key not added due to potential type mismatch
      table.integer('user_id').unsigned();
      table.integer('chapter_id').unsigned().references('id').inTable('chapters').onDelete('CASCADE');
      table.string('role').defaultTo('member'); // member, moderator, admin
      table.boolean('is_primary').defaultTo(false); // Primary chapter for user
      table.timestamp('joined_at').defaultTo(knex.fn.now());
      table.timestamps(true, true);
      
      table.unique(['user_id', 'chapter_id']);
      table.index(['user_id', 'is_primary']);
      table.index(['chapter_id', 'role']);
    });
  }

  // Enhance users table for authentication security
  const hasFailedLogins = await knex.schema.hasColumn('users', 'failed_login_attempts');
  if (!hasFailedLogins) {
    await knex.schema.table('users', (table) => {
      table.integer('failed_login_attempts').defaultTo(0);
      table.timestamp('account_locked_until').nullable();
      table.string('locale').defaultTo('en');
      table.string('timezone').nullable();
      table.json('preferred_chapters').nullable(); // Array of preferred chapter IDs
    });
  }

  // Create activity_logs table (REQUIREMENT: Login history, abnormal activity alerts)
  const hasActivityLogs = await knex.schema.hasTable('activity_logs');
  if (!hasActivityLogs) {
    await knex.schema.createTable('activity_logs', (table) => {
      table.increments('id').primary();
      // Note: user_id foreign key not added due to potential type mismatch
      table.integer('user_id').unsigned().nullable(); // Nullable for failed login attempts
      table.string('activity_type').notNullable(); // login, logout, failed_login, password_change, etc.
      table.string('ip_address').nullable();
      table.string('user_agent').nullable();
      table.string('device_type').nullable(); // desktop, mobile, tablet
      table.string('browser').nullable();
      table.string('os').nullable();
      table.string('location').nullable(); // Country/city from IP geolocation
      table.boolean('success').defaultTo(true);
      table.text('failure_reason').nullable();
      table.json('metadata').nullable(); // Additional context
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      table.index(['user_id', 'activity_type', 'created_at']);
      table.index(['ip_address', 'created_at']);
      table.index(['activity_type', 'success', 'created_at']);
    });
  }

  // Create abnormal_activity_alerts table (REQUIREMENT: Abnormal activity alerts)
  const hasAbnormalAlerts = await knex.schema.hasTable('abnormal_activity_alerts');
  if (!hasAbnormalAlerts) {
    await knex.schema.createTable('abnormal_activity_alerts', (table) => {
      table.increments('id').primary();
      // Note: user_id foreign key not added due to potential type mismatch
      table.integer('user_id').unsigned();
      table.string('alert_type').notNullable(); // multiple_ips, failed_attempts, suspicious_location, etc.
      table.text('description').notNullable();
      table.string('severity').defaultTo('medium'); // low, medium, high, critical
      table.boolean('is_resolved').defaultTo(false);
      table.timestamp('resolved_at').nullable();
      table.integer('resolved_by').unsigned().nullable(); // Admin who resolved
      table.json('activity_data').nullable(); // Related activity log IDs
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      table.index(['user_id', 'is_resolved', 'created_at']);
      table.index(['alert_type', 'severity', 'is_resolved']);
    });
  }

  // Create sso_providers table (REQUIREMENT: OAuth2, Google, Facebook, etc.)
  const hasSsoProviders = await knex.schema.hasTable('sso_providers');
  if (!hasSsoProviders) {
    await knex.schema.createTable('sso_providers', (table) => {
      table.increments('id').primary();
      table.string('provider_name').notNullable().unique(); // google, facebook, microsoft, etc.
      table.string('client_id').notNullable();
      table.string('client_secret').notNullable();
      table.string('authorization_url').notNullable();
      table.string('token_url').notNullable();
      table.string('user_info_url').notNullable();
      table.json('scopes').nullable(); // Array of OAuth scopes
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    });
  }

  // Create user_sso_accounts table (REQUIREMENT: SSO account linking)
  const hasUserSsoAccounts = await knex.schema.hasTable('user_sso_accounts');
  if (!hasUserSsoAccounts) {
    await knex.schema.createTable('user_sso_accounts', (table) => {
      table.increments('id').primary();
      // Note: user_id foreign key not added due to potential type mismatch
      table.integer('user_id').unsigned();
      table.integer('provider_id').unsigned().references('id').inTable('sso_providers').onDelete('CASCADE');
      table.string('provider_user_id').notNullable(); // User ID from SSO provider
      table.string('email').notNullable();
      table.string('profile_picture').nullable();
      table.json('profile_data').nullable(); // Full profile from provider
      table.timestamp('last_used_at').nullable();
      table.timestamps(true, true);
      
      table.unique(['provider_id', 'provider_user_id']);
      table.index(['user_id', 'provider_id']);
    });
  }

  // Create localization_settings table (REQUIREMENT: Localization)
  const hasLocalizationSettings = await knex.schema.hasTable('localization_settings');
  if (!hasLocalizationSettings) {
    await knex.schema.createTable('localization_settings', (table) => {
      table.increments('id').primary();
      // Note: user_id foreign key not added due to potential type mismatch
      table.integer('user_id').unsigned().nullable(); // Nullable for system-wide defaults
      table.string('locale').defaultTo('en'); // Language code (en, es, fr, etc.)
      table.string('timezone').defaultTo('UTC');
      table.string('date_format').defaultTo('YYYY-MM-DD');
      table.string('time_format').defaultTo('24h'); // 12h or 24h
      table.string('currency').defaultTo('USD');
      table.json('content_filters').nullable(); // City/country-based content preferences
      table.timestamps(true, true);
      
      table.unique(['user_id']); // One setting per user
      table.index(['locale']);
    });
  }

  // Add guest role support to existing role system
  // Note: Roles are typically stored as strings in users.role column
  // No schema change needed, but we'll ensure guest role is supported in application logic
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('localization_settings');
  await knex.schema.dropTableIfExists('user_sso_accounts');
  await knex.schema.dropTableIfExists('sso_providers');
  await knex.schema.dropTableIfExists('abnormal_activity_alerts');
  await knex.schema.dropTableIfExists('activity_logs');
  await knex.schema.dropTableIfExists('user_chapters');
  
  // Remove enhanced columns from users table
  if (await knex.schema.hasColumn('users', 'failed_login_attempts')) {
    await knex.schema.table('users', (table) => {
      table.dropColumn('failed_login_attempts');
      table.dropColumn('account_locked_until');
      table.dropColumn('locale');
      table.dropColumn('timezone');
      table.dropColumn('preferred_chapters');
    });
  }
  
  // Remove enhanced columns from chapters table
  if (await knex.schema.hasColumn('chapters', 'country')) {
    await knex.schema.table('chapters', (table) => {
      table.dropColumn('country');
      table.dropColumn('city');
      table.dropColumn('timezone');
      table.dropColumn('language');
      table.dropColumn('topics');
      table.dropColumn('region');
      table.dropColumn('latitude');
      table.dropColumn('longitude');
    });
  }
};

