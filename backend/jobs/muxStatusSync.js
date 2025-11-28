/**
 * Mux Status Sync Job
 * Periodically checks and updates the status of Mux video assets
 * that are stuck in processing or missing playback IDs
 */

const db = require('../config/database');
const muxService = require('../services/muxService');

/**
 * Sync Mux asset statuses for lessons that are stuck or incomplete
 */
async function syncMuxAssetStatuses() {
  try {
    console.log('[Mux Status Sync] Starting Mux asset status sync...');

    if (!muxService.isConfigured()) {
      console.warn('[Mux Status Sync] Mux service not configured, skipping sync');
      return {
        success: false,
        error: 'Mux service not configured'
      };
    }

    // Check if required columns exist
    const hasMuxUploadId = await db.schema.hasColumn('lessons', 'mux_upload_id');
    const hasMuxAssetId = await db.schema.hasColumn('lessons', 'mux_asset_id');
    const hasMuxPlaybackId = await db.schema.hasColumn('lessons', 'mux_playback_id');
    const hasMuxStatus = await db.schema.hasColumn('lessons', 'mux_status');
    const hasVideoProvider = await db.schema.hasColumn('lessons', 'video_provider');

    // If required columns don't exist, skip sync
    if (!hasMuxUploadId || !hasMuxAssetId || !hasMuxPlaybackId || !hasMuxStatus || !hasVideoProvider) {
      console.warn('[Mux Status Sync] Required Mux columns not found, skipping sync');
      return {
        success: true,
        syncedCount: 0,
        message: 'Required columns not found'
      };
    }

    // Find lessons that need status updates:
    // 1. Have mux_upload_id but no mux_asset_id (upload not processed)
    // 2. Have mux_asset_id but no mux_playback_id (asset not ready)
    // 3. Have mux_status = 'preparing' or 'processing' (stuck assets)
    const lessonsToCheck = await db('lessons')
      .where(function() {
        this.where(function() {
          // Case 1: Upload exists but no asset
          this.whereNotNull('mux_upload_id')
          .whereNull('mux_asset_id');
        })
        .orWhere(function() {
          // Case 2: Asset exists but no playback ID
          this.whereNotNull('mux_asset_id')
          .whereNull('mux_playback_id');
        })
        .orWhere(function() {
          // Case 3: Status indicates processing
          this.whereIn('mux_status', ['preparing', 'processing']);
        });
      })
      .limit(50) // Process in batches
      .select('id', 'title', 'mux_upload_id', 'mux_asset_id', 'mux_playback_id', 'mux_status');

    if (lessonsToCheck.length === 0) {
      console.log('[Mux Status Sync] No lessons need status updates');
      return {
        success: true,
        syncedCount: 0,
        lessons: []
      };
    }

    console.log(`[Mux Status Sync] Found ${lessonsToCheck.length} lesson(s) to check`);

    const results = {
      success: [],
      failed: [],
      syncedCount: 0
    };

    // Process each lesson
    for (const lesson of lessonsToCheck) {
      try {
        console.log(`[Mux Status Sync] Checking lesson ${lesson.id}: ${lesson.title}`);

        let updated = false;
        const updateData = {
          updated_at: db.fn.now()
        };

        // Case 1: Check upload status if we have upload_id but no asset_id
        if (lesson.mux_upload_id && !lesson.mux_asset_id) {
          try {
            console.log(`[Mux Status Sync] Checking upload: ${lesson.mux_upload_id}`);
            const upload = await muxService.getUpload(lesson.mux_upload_id);

            const assetId = upload.asset_id || upload.assetId;
            if (assetId) {
              console.log(`[Mux Status Sync] ✅ Found asset_id from upload: ${assetId}`);
              updateData.mux_asset_id = assetId;
              updateData.mux_status = 'processing';
              updated = true;

              if (await db.schema.hasColumn('lessons', 'mux_created_at')) {
                updateData.mux_created_at = db.fn.now();
              }
            }
          } catch (error) {
            console.warn(`[Mux Status Sync] ⚠️ Failed to check upload ${lesson.mux_upload_id}: ${error.message}`);
          }
        }

        // Case 2: Check asset status if we have asset_id but no playback_id or status is processing
        if (lesson.mux_asset_id && (!lesson.mux_playback_id || lesson.mux_status === 'processing' || lesson.mux_status === 'preparing')) {
          try {
            console.log(`[Mux Status Sync] Checking asset: ${lesson.mux_asset_id}`);
            const asset = await muxService.getAsset(lesson.mux_asset_id);

            if (asset.status === 'ready' && asset.playbackIds && asset.playbackIds.length > 0) {
              const playbackId = asset.playbackIds[0].id;
              console.log(`[Mux Status Sync] ✅ Asset ready with playback_id: ${playbackId}`);

              updateData.mux_playback_id = playbackId;
              updateData.mux_status = 'ready';
              updateData.video_provider = 'mux';
              updated = true;
            } else if (asset.status === 'errored') {
              console.log(`[Mux Status Sync] ❌ Asset errored: ${asset.errors || 'Unknown error'}`);
              updateData.mux_status = 'errored';

              if (await db.schema.hasColumn('lessons', 'mux_error_message')) {
                updateData.mux_error_message = JSON.stringify(asset.errors || {});
              }
              updated = true;
            } else {
              // Still processing, update status to reflect current state
              updateData.mux_status = asset.status || 'processing';
              updated = true;
            }
          } catch (error) {
            console.warn(`[Mux Status Sync] ⚠️ Failed to check asset ${lesson.mux_asset_id}: ${error.message}`);
          }
        }

        // Update lesson if we found changes
        if (updated) {
          await db('lessons')
            .where({ id: lesson.id })
            .update(updateData);

          results.success.push({
            lessonId: lesson.id,
            title: lesson.title,
            updates: Object.keys(updateData).filter(key => key !== 'updated_at')
          });

          results.syncedCount++;
          console.log(`[Mux Status Sync] ✅ Updated lesson ${lesson.id}`);
        } else {
          console.log(`[Mux Status Sync] No updates needed for lesson ${lesson.id}`);
        }

      } catch (error) {
        console.error(`[Mux Status Sync] ❌ Failed to process lesson ${lesson.id}:`, error);
        results.failed.push({
          lessonId: lesson.id,
          title: lesson.title,
          error: error.message
        });
      }
    }

    console.log(`[Mux Status Sync] Completed. Synced: ${results.syncedCount}, Failed: ${results.failed.length}`);

    return {
      success: true,
      syncedCount: results.syncedCount,
      successCount: results.success.length,
      failedCount: results.failed.length,
      lessons: results.success
    };

  } catch (error) {
    console.error('[Mux Status Sync] Job error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Initialize the Mux status sync job
 * Runs every 5 minutes to check for stuck assets
 */
function initializeMuxStatusSync() {
  // Run immediately on startup
  syncMuxAssetStatuses().catch(error => {
    console.error('[Mux Status Sync] Initial sync failed:', error);
  });

  // Then run every 5 minutes
  setInterval(() => {
    syncMuxAssetStatuses().catch(error => {
      console.error('[Mux Status Sync] Scheduled sync failed:', error);
    });
  }, 5 * 60 * 1000); // 5 minutes

  console.log('[Mux Status Sync] Initialized - will sync every 5 minutes');
}

module.exports = {
  syncMuxAssetStatuses,
  initializeMuxStatusSync
};
