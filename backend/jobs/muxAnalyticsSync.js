/**
 * Mux Analytics Sync Job
 * Periodically syncs video analytics data from Mux to local database
 * and maintains analytics cache
 */

const db = require('../config/database');
const muxService = require('../services/muxService');
const videoAnalyticsService = require('../services/videoAnalyticsService');

/**
 * Sync analytics for all Mux videos
 * This job aggregates existing view data and updates summary statistics
 */
async function syncMuxAnalytics() {
  try {
    console.log('[Mux Analytics Sync] Starting analytics sync...');

    if (!muxService.isConfigured()) {
      console.warn('[Mux Analytics Sync] Mux service not configured, skipping sync');
      return {
        success: false,
        error: 'Mux service not configured'
      };
    }

    // Check if required columns exist
    const hasVideoProvider = await db.schema.hasColumn('lessons', 'video_provider');
    const hasMuxAssetId = await db.schema.hasColumn('lessons', 'mux_asset_id');
    const hasMuxPlaybackId = await db.schema.hasColumn('lessons', 'mux_playback_id');
    const hasMuxStatus = await db.schema.hasColumn('lessons', 'mux_status');
    
    // If required columns don't exist, skip sync
    if (!hasVideoProvider || !hasMuxAssetId || !hasMuxPlaybackId || !hasMuxStatus) {
      return {
        success: true,
        syncedCount: 0,
        lessons: []
      };
    }

    // Get all lessons with Mux videos
    let muxLessons;
    try {
      muxLessons = await db('lessons')
        .where({ video_provider: 'mux' })
        .whereNotNull('mux_asset_id')
        .whereNotNull('mux_playback_id')
        .where('mux_status', 'ready')
        .limit(100)
        .select('id', 'title', 'mux_asset_id');
    } catch (queryError) {
      // If query fails due to missing column, return success with no lessons
      if (queryError.code === '42703' || queryError.message.includes('does not exist')) {
        return {
          success: true,
          syncedCount: 0,
          lessons: []
        };
      }
      throw queryError;
    }

    if (muxLessons.length === 0) {
      console.log('[Mux Analytics Sync] No Mux videos found to sync');
      return {
        success: true,
        syncedCount: 0,
        lessons: []
      };
    }

    console.log(`[Mux Analytics Sync] Found ${muxLessons.length} Mux videos to sync`);

    const results = {
      success: [],
      failed: []
    };

    // Sync analytics for each lesson
    for (const lesson of muxLessons) {
      try {
        await videoAnalyticsService.syncLessonAnalytics(lesson.id, {
          timeframe: '30:days',
          forceRefresh: true
        });

        results.success.push({
          lessonId: lesson.id,
          title: lesson.title
        });

        console.log(`✅ Synced analytics for lesson ${lesson.id}`);
      } catch (error) {
        results.failed.push({
          lessonId: lesson.id,
          title: lesson.title,
          error: error.message
        });

        console.error(`❌ Failed to sync lesson ${lesson.id}:`, error.message);
      }
    }

    console.log(`[Mux Analytics Sync] Completed: ${results.success.length} synced, ${results.failed.length} failed`);

    return {
      success: true,
      syncedCount: results.success.length,
      failedCount: results.failed.length,
      lessons: results.success,
      errors: results.failed
    };
  } catch (error) {
    // Silently fail if column doesn't exist
    if (error.code === '42703' || error.message.includes('does not exist')) {
      return {
        success: true,
        syncedCount: 0,
        lessons: []
      };
    }
    console.error('[Mux Analytics Sync] Job failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Clean up old analytics data
 * Removes analytics records older than the retention period
 * 
 * @param {number} retentionDays - Number of days to retain analytics (default: 90)
 */
async function cleanupOldAnalytics(retentionDays = 90) {
  try {
    // Check if table exists
    const tableExists = await db.schema.hasTable('video_analytics');
    if (!tableExists) {
      return { success: true, deletedCount: 0 };
    }

    console.log(`[Mux Analytics Cleanup] Removing analytics older than ${retentionDays} days...`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const deleted = await db('video_analytics')
      .where('created_at', '<', cutoffDate)
      .delete();

    console.log(`[Mux Analytics Cleanup] Removed ${deleted} old analytics records`);

    return {
      success: true,
      deletedCount: deleted
    };
  } catch (error) {
    // Silently fail if table/column doesn't exist
    if (error.code === '42703' || error.code === '42P01' || error.message.includes('does not exist')) {
      return { success: true, deletedCount: 0 };
    }
    console.error('[Mux Analytics Cleanup] Cleanup failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Clear analytics cache
 * Useful for forcing fresh data fetch
 */
function clearAnalyticsCache() {
  try {
    console.log('[Mux Analytics Cache] Clearing analytics cache...');
    muxService.clearAnalyticsCache();
    console.log('[Mux Analytics Cache] Cache cleared successfully');
    return { success: true };
  } catch (error) {
    console.error('[Mux Analytics Cache] Failed to clear cache:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Initialize the Mux analytics sync job
 * Sets up periodic sync and cleanup tasks
 */
function initializeMuxAnalyticsSync() {
  if (!muxService.isConfigured()) {
    console.warn('[Mux Analytics Sync] Mux service not configured, analytics sync disabled');
    return;
  }

  // Run analytics sync every 15 minutes
  const SYNC_INTERVAL = 15 * 60 * 1000; // 15 minutes
  setInterval(syncMuxAnalytics, SYNC_INTERVAL);
  console.log('[Mux Analytics Sync] Sync job initialized - running every 15 minutes');

  // Run cleanup daily at 2 AM
  const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  const scheduleCleanup = () => {
    const now = new Date();
    const next2AM = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      2, 0, 0, 0
    );
    const timeUntil2AM = next2AM - now;

    setTimeout(() => {
      cleanupOldAnalytics();
      setInterval(cleanupOldAnalytics, CLEANUP_INTERVAL);
    }, timeUntil2AM);
  };

  scheduleCleanup();
  console.log('[Mux Analytics Cleanup] Cleanup job scheduled for 2 AM daily');

  // Clear cache every hour to ensure fresh data
  const CACHE_CLEAR_INTERVAL = 60 * 60 * 1000; // 1 hour
  setInterval(clearAnalyticsCache, CACHE_CLEAR_INTERVAL);
  console.log('[Mux Analytics Cache] Cache clear scheduled every hour');

  // Run initial sync after 30 seconds
  setTimeout(syncMuxAnalytics, 30000);
  console.log('[Mux Analytics Sync] Initial sync scheduled in 30 seconds');
}

module.exports = {
  syncMuxAnalytics,
  cleanupOldAnalytics,
  clearAnalyticsCache,
  initializeMuxAnalyticsSync
};
