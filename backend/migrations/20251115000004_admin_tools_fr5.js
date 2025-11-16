/**
 * Migration: Admin Tools FR5
 * Creates tables for enhanced admin functionality
 */

exports.up = async function(knex) {
  // User bans table (REQUIREMENT: Ban/unban users)
  await knex.schema.createTable('user_bans', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.integer('banned_by').unsigned().notNullable();
    table.text('reason');
    table.timestamp('banned_at').defaultTo(knex.fn.now());
    table.timestamp('expires_at').nullable();
    table.boolean('is_permanent').defaultTo(false);
    table.timestamp('unbanned_at').nullable();
    table.integer('unbanned_by').unsigned().nullable();
    
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('banned_by').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('unbanned_by').references('id').inTable('users').onDelete('SET NULL');
    
    table.index('user_id');
    table.index('banned_at');
  });

  // Admin anomalies table (REQUIREMENT: Warns admins on audit or moderation anomalies)
  await knex.schema.createTable('admin_anomalies', (table) => {
    table.increments('id').primary();
    table.string('anomaly_type', 100).notNullable();
    table.text('details'); // JSON string
    table.enum('severity', ['low', 'medium', 'high']).defaultTo('medium');
    table.boolean('resolved').defaultTo(false);
    table.timestamp('resolved_at').nullable();
    table.integer('resolved_by').unsigned().nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.foreign('resolved_by').references('id').inTable('users').onDelete('SET NULL');
    
    table.index('anomaly_type');
    table.index('severity');
    table.index('created_at');
  });

  // Add columns to content_uploads for upload time tracking (REQUIREMENT: <5 min to upload)
  await knex.schema.table('content_uploads', (table) => {
    table.bigInteger('upload_time_ms').nullable();
    table.decimal('upload_time_minutes', 10, 2).nullable();
    table.integer('retry_count').defaultTo(0);
    table.timestamp('last_retry_at').nullable();
    table.text('error_message').nullable();
  });

  // Add columns to flagged_content for review time tracking (REQUIREMENT: 2-hour review time)
  await knex.schema.table('flagged_content', (table) => {
    table.bigInteger('review_time_ms').nullable();
    table.decimal('review_time_hours', 10, 2).nullable();
  });

  // Add columns to analytics_snapshots for accuracy tracking (REQUIREMENT: 99% dashboard accuracy)
  await knex.schema.table('analytics_snapshots', (table) => {
    table.decimal('accuracy_score', 5, 4).nullable();
    table.timestamp('verified_at').nullable();
  });

  // Add ban columns to forum_posts (REQUIREMENT: Ban/unban posts)
  await knex.schema.table('forum_posts', (table) => {
    table.boolean('is_banned').defaultTo(false);
    table.text('ban_reason').nullable();
    table.timestamp('banned_at').nullable();
    table.integer('banned_by').unsigned().nullable();
    
    table.foreign('banned_by').references('id').inTable('users').onDelete('SET NULL');
  });

  // Add edit tracking columns to content tables
  await knex.schema.table('forum_posts', (table) => {
    table.integer('last_edited_by').unsigned().nullable();
    table.timestamp('last_edited_at').nullable();
    
    table.foreign('last_edited_by').references('id').inTable('users').onDelete('SET NULL');
  });

  await knex.schema.table('resources', (table) => {
    table.integer('last_edited_by').unsigned().nullable();
    table.timestamp('last_edited_at').nullable();
    
    table.foreign('last_edited_by').references('id').inTable('users').onDelete('SET NULL');
  });

  await knex.schema.table('courses', (table) => {
    table.integer('last_edited_by').unsigned().nullable();
    table.timestamp('last_edited_at').nullable();
    
    table.foreign('last_edited_by').references('id').inTable('users').onDelete('SET NULL');
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('user_bans');
  await knex.schema.dropTableIfExists('admin_anomalies');
  
  await knex.schema.table('content_uploads', (table) => {
    table.dropColumn('upload_time_ms');
    table.dropColumn('upload_time_minutes');
    table.dropColumn('retry_count');
    table.dropColumn('last_retry_at');
    table.dropColumn('error_message');
  });

  await knex.schema.table('flagged_content', (table) => {
    table.dropColumn('review_time_ms');
    table.dropColumn('review_time_hours');
  });

  await knex.schema.table('analytics_snapshots', (table) => {
    table.dropColumn('accuracy_score');
    table.dropColumn('verified_at');
  });

  await knex.schema.table('forum_posts', (table) => {
    table.dropColumn('is_banned');
    table.dropColumn('ban_reason');
    table.dropColumn('banned_at');
    table.dropColumn('banned_by');
    table.dropColumn('last_edited_by');
    table.dropColumn('last_edited_at');
  });

  await knex.schema.table('resources', (table) => {
    table.dropColumn('last_edited_by');
    table.dropColumn('last_edited_at');
  });

  await knex.schema.table('courses', (table) => {
    table.dropColumn('last_edited_by');
    table.dropColumn('last_edited_at');
  });
};


