/**
 * Script to add Mux columns to lessons table
 * This bypasses the migration system to directly add the columns
 */

const db = require('../config/database');

async function addMuxColumns() {
  try {
    console.log('🎬 Adding Mux integration columns to lessons table...');
    
    // Check if columns already exist
    const hasMuxUploadId = await db.schema.hasColumn('lessons', 'mux_upload_id');
    const hasMuxAssetId = await db.schema.hasColumn('lessons', 'mux_asset_id');
    const hasMuxPlaybackId = await db.schema.hasColumn('lessons', 'mux_playback_id');
    const hasVideoProvider = await db.schema.hasColumn('lessons', 'video_provider');
    const hasMuxStatus = await db.schema.hasColumn('lessons', 'mux_status');
    
    if (hasMuxUploadId && hasMuxAssetId && hasMuxPlaybackId && hasVideoProvider && hasMuxStatus) {
      console.log('✅ Mux columns already exist');
      process.exit(0);
    }
    
    // Check optional columns
    const hasMuxErrorMessage = await db.schema.hasColumn('lessons', 'mux_error_message');
    const hasMuxCreatedAt = await db.schema.hasColumn('lessons', 'mux_created_at');
    const hasMuxReadyAt = await db.schema.hasColumn('lessons', 'mux_ready_at');
    const hasMuxMetadata = await db.schema.hasColumn('lessons', 'mux_metadata');
    
    // Add Mux-specific columns to lessons table
    await db.schema.alterTable('lessons', (table) => {
      if (!hasMuxAssetId) {
        table.string('mux_asset_id').nullable();
        console.log('  ✓ Added mux_asset_id');
      }
      
      if (!hasMuxPlaybackId) {
        table.string('mux_playback_id').nullable();
        console.log('  ✓ Added mux_playback_id');
      }
      
      if (!hasMuxUploadId) {
        table.string('mux_upload_id').nullable();
        console.log('  ✓ Added mux_upload_id');
      }
      
      if (!hasVideoProvider) {
        table.string('video_provider').nullable().defaultTo('s3');
        console.log('  ✓ Added video_provider');
      }
      
      if (!hasMuxStatus) {
        table.string('mux_status').nullable();
        console.log('  ✓ Added mux_status');
      }
      
      // Optional columns
      if (!hasMuxErrorMessage) {
        table.text('mux_error_message').nullable();
        console.log('  ✓ Added mux_error_message');
      }
      
      if (!hasMuxCreatedAt) {
        table.timestamp('mux_created_at').nullable();
        console.log('  ✓ Added mux_created_at');
      }
      
      if (!hasMuxReadyAt) {
        table.timestamp('mux_ready_at').nullable();
        console.log('  ✓ Added mux_ready_at');
      }
      
      if (!hasMuxMetadata) {
        table.jsonb('mux_metadata').nullable();
        console.log('  ✓ Added mux_metadata');
      }
    });
    
    console.log('✅ Successfully added Mux columns to lessons table');
    
    // Add indexes
    try {
      await db.raw('CREATE INDEX IF NOT EXISTS idx_lessons_mux_asset_id ON lessons(mux_asset_id)');
      await db.raw('CREATE INDEX IF NOT EXISTS idx_lessons_mux_playback_id ON lessons(mux_playback_id)');
      await db.raw('CREATE INDEX IF NOT EXISTS idx_lessons_video_provider ON lessons(video_provider)');
      await db.raw('CREATE INDEX IF NOT EXISTS idx_lessons_provider_status ON lessons(video_provider, mux_status)');
      console.log('✅ Added indexes for Mux columns');
    } catch (error) {
      console.warn('⚠️  Some indexes may already exist:', error.message);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding Mux columns:', error);
    process.exit(1);
  }
}

addMuxColumns();

