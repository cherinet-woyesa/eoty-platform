/**
 * Migration: Add Mux Video Integration Support
 * 
 * Purpose: Add columns to support Mux video hosting alongside existing S3 storage
 * This enables dual storage support during migration period
 */

exports.up = async function(knex) {
  console.log('🎬 Adding Mux integration columns to lessons table...');
  
  // Add Mux-specific columns to lessons table
  await knex.schema.alterTable('lessons', (table) => {
    // Mux Asset ID - unique identifier for the video asset in Mux
    table.string('mux_asset_id').nullable();
    
    // Mux Playback ID - used to construct playback URLs
    table.string('mux_playback_id').nullable();
    
    // Mux Upload ID - tracks the direct upload process
    table.string('mux_upload_id').nullable();
    
    // Video provider - 'mux' or 's3' to determine which system to use
    table.string('video_provider').nullable().defaultTo('s3');
    
    // Mux processing status - 'preparing', 'ready', 'errored'
    table.string('mux_status').nullable();
    
    // Mux error message if processing fails
    table.text('mux_error_message').nullable();
    
    // Timestamp when Mux asset was created
    table.timestamp('mux_created_at').nullable();
    
    // Timestamp when Mux asset became ready
    table.timestamp('mux_ready_at').nullable();
    
    // Additional Mux metadata (aspect ratio, tracks, etc.)
    table.jsonb('mux_metadata').nullable();
  });
  
  console.log('✅ Added Mux columns to lessons table');
  
  // Add indexes for efficient queries
  await knex.schema.alterTable('lessons', (table) => {
    table.index('mux_asset_id', 'idx_lessons_mux_asset_id');
    table.index('mux_playback_id', 'idx_lessons_mux_playback_id');
    table.index('video_provider', 'idx_lessons_video_provider');
    table.index(['video_provider', 'mux_status'], 'idx_lessons_provider_status');
  });
  
  console.log('✅ Added indexes for Mux columns');
  
  // Create video_analytics table for Mux analytics data
  await knex.schema.createTable('video_analytics', (table) => {
    table.increments('id').primary();
    
    // Reference to lesson
    table.integer('lesson_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('lessons')
      .onDelete('CASCADE');
    
    // Mux view ID
    table.string('mux_view_id').nullable();
    
    // User who watched (if authenticated)
    table.integer('user_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
    
    // Viewing metrics
    table.integer('watch_time_seconds').defaultTo(0);
    table.integer('video_duration_seconds').nullable();
    table.decimal('completion_percentage', 5, 2).defaultTo(0);
    
    // Playback quality
    table.string('max_resolution_viewed').nullable();
    table.integer('rebuffer_count').defaultTo(0);
    table.integer('rebuffer_duration_ms').defaultTo(0);
    
    // Device and location info
    table.string('device_type').nullable(); // desktop, mobile, tablet
    table.string('browser').nullable();
    table.string('os').nullable();
    table.string('country').nullable();
    table.string('region').nullable();
    
    // Session info
    table.timestamp('session_started_at').nullable();
    table.timestamp('session_ended_at').nullable();
    table.boolean('session_completed').defaultTo(false);
    
    // Additional Mux metrics
    table.jsonb('mux_data').nullable();
    
    // Timestamps
    table.timestamps(true, true);
    
    // Indexes for efficient queries
    table.index('lesson_id', 'idx_video_analytics_lesson');
    table.index('user_id', 'idx_video_analytics_user');
    table.index('mux_view_id', 'idx_video_analytics_mux_view');
    table.index(['lesson_id', 'user_id'], 'idx_video_analytics_lesson_user');
    table.index('session_started_at', 'idx_video_analytics_session_start');
    table.index(['lesson_id', 'session_completed'], 'idx_video_analytics_completion');
  });
  
  console.log('✅ Created video_analytics table');
  
  console.log('🎉 Mux integration migration completed successfully!');
};

exports.down = async function(knex) {
  console.log('🔄 Rolling back Mux integration...');
  
  // Drop video_analytics table
  await knex.schema.dropTableIfExists('video_analytics');
  console.log('✅ Dropped video_analytics table');
  
  // Remove indexes from lessons table
  await knex.schema.alterTable('lessons', (table) => {
    table.dropIndex('mux_asset_id', 'idx_lessons_mux_asset_id');
    table.dropIndex('mux_playback_id', 'idx_lessons_mux_playback_id');
    table.dropIndex('video_provider', 'idx_lessons_video_provider');
    table.dropIndex(['video_provider', 'mux_status'], 'idx_lessons_provider_status');
  });
  
  console.log('✅ Dropped Mux indexes');
  
  // Remove Mux columns from lessons table
  await knex.schema.alterTable('lessons', (table) => {
    table.dropColumn('mux_asset_id');
    table.dropColumn('mux_playback_id');
    table.dropColumn('mux_upload_id');
    table.dropColumn('video_provider');
    table.dropColumn('mux_status');
    table.dropColumn('mux_error_message');
    table.dropColumn('mux_created_at');
    table.dropColumn('mux_ready_at');
    table.dropColumn('mux_metadata');
  });
  
  console.log('✅ Removed Mux columns from lessons table');
  console.log('🔄 Mux integration rollback completed');
};
