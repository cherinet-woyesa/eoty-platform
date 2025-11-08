/**
 * Mux Migration Controller
 * Handles S3 to Mux video migration operations
 */

const db = require('../config/database');
const muxService = require('../services/muxService');
const cloudStorageService = require('../services/cloudStorageService');
const axios = require('axios');
const { PassThrough } = require('stream');

class MuxMigrationController {
  /**
   * Migrate a single video from S3 to Mux
   * Downloads from S3 and uploads to Mux via direct upload
   * 
   * @param {number} lessonId - Lesson ID to migrate
   * @param {Object} options - Migration options
   * @returns {Promise<Object>} Migration result
   */
  async migrateSingleVideo(lessonId, options = {}) {
    const { keepS3Backup = true, retryAttempts = 2 } = options;
    let attempt = 0;
    let lastError = null;

    while (attempt <= retryAttempts) {
      attempt++;

      try {
        console.log(`[Migration] Starting migration for lesson ${lessonId} (attempt ${attempt}/${retryAttempts + 1})`);

        // Step 1: Get lesson details
        const lesson = await db('lessons')
          .where({ id: lessonId })
          .first();

        if (!lesson) {
          throw new Error(`Lesson ${lessonId} not found`);
        }

        // Check if already migrated
        if (lesson.video_provider === 'mux' && lesson.mux_asset_id) {
          console.log(`[Migration] Lesson ${lessonId} already migrated`);
          return {
            success: true,
            lessonId,
            status: 'already_migrated',
            muxAssetId: lesson.mux_asset_id
          };
        }

        // Check if video exists
        if (!lesson.video_url && !lesson.s3_key) {
          throw new Error('No video found for this lesson');
        }

        // Step 2: Get video URL from S3
        let videoUrl;
        if (lesson.s3_key) {
          videoUrl = await cloudStorageService.getSignedStreamUrl(lesson.s3_key, 3600);
        } else if (lesson.video_url) {
          videoUrl = lesson.video_url;
        }

        console.log(`[Migration] Video URL obtained for lesson ${lessonId}`);

        // Step 3: Create Mux direct upload
        const upload = await muxService.createDirectUpload({
          metadata: {
            lessonId: lesson.id,
            migrationSource: 's3',
            originalUrl: lesson.video_url || lesson.s3_key,
            migratedAt: new Date().toISOString(),
            title: lesson.title
          }
        });

        console.log(`[Migration] Mux upload URL created: ${upload.uploadId}`);

        // Step 4: Stream video from S3 to Mux
        await this.streamVideoToMux(videoUrl, upload.uploadUrl);

        console.log(`[Migration] Video streamed to Mux successfully`);

        // Step 5: Update database
        const updateData = {
          mux_upload_id: upload.uploadId,
          video_provider: 'mux',
          mux_status: 'preparing',
          updated_at: db.fn.now()
        };

        // Optionally remove S3 references
        if (!keepS3Backup) {
          updateData.video_url = null;
          updateData.hls_url = null;
          updateData.s3_key = null;
        }

        await db('lessons')
          .where({ id: lessonId })
          .update(updateData);

        console.log(`[Migration] Database updated for lesson ${lessonId}`);

        return {
          success: true,
          lessonId,
          status: 'migrated',
          uploadId: upload.uploadId,
          s3BackupKept: keepS3Backup,
          attempts: attempt
        };

      } catch (error) {
        lastError = error;
        console.error(`[Migration] Attempt ${attempt} failed for lesson ${lessonId}:`, error.message);

        if (attempt <= retryAttempts) {
          const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`[Migration] Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    // All attempts failed
    console.error(`[Migration] All attempts failed for lesson ${lessonId}`);

    // Log error to database
    try {
      await db('lessons')
        .where({ id: lessonId })
        .update({
          mux_error_message: JSON.stringify({
            error: lastError.message,
            attempts: attempt,
            timestamp: new Date().toISOString()
          }),
          updated_at: db.fn.now()
        });
    } catch (dbError) {
      console.error(`[Migration] Failed to log error for lesson ${lessonId}:`, dbError.message);
    }

    return {
      success: false,
      lessonId,
      status: 'failed',
      error: lastError.message,
      attempts: attempt
    };
  }

  /**
   * Stream video from S3 URL to Mux upload URL
   * 
   * @param {string} sourceUrl - S3 video URL
   * @param {string} targetUrl - Mux upload URL
   * @returns {Promise<void>}
   */
  async streamVideoToMux(sourceUrl, targetUrl) {
    try {
      console.log('[Migration] Starting video stream from S3 to Mux...');

      // Download from S3
      const response = await axios({
        method: 'GET',
        url: sourceUrl,
        responseType: 'stream',
        timeout: 300000, // 5 minutes
        maxContentLength: 5 * 1024 * 1024 * 1024, // 5GB
        maxBodyLength: 5 * 1024 * 1024 * 1024
      });

      const contentLength = response.headers['content-length'];
      console.log(`[Migration] Downloading video (${contentLength} bytes)...`);

      // Upload to Mux
      await axios({
        method: 'PUT',
        url: targetUrl,
        data: response.data,
        headers: {
          'Content-Type': response.headers['content-type'] || 'video/mp4',
          'Content-Length': contentLength
        },
        maxContentLength: 5 * 1024 * 1024 * 1024,
        maxBodyLength: 5 * 1024 * 1024 * 1024,
        timeout: 600000 // 10 minutes
      });

      console.log('[Migration] Video uploaded to Mux successfully');
    } catch (error) {
      console.error('[Migration] Stream error:', error.message);
      throw new Error(`Failed to stream video: ${error.message}`);
    }
  }

  /**
   * Migrate multiple videos in batches
   * 
   * @param {Array<number>} lessonIds - Array of lesson IDs
   * @param {Object} options - Migration options
   * @returns {Promise<Object>} Migration results
   */
  async migrateBatch(lessonIds, options = {}) {
    const {
      batchSize = 3,
      keepS3Backup = true,
      retryAttempts = 2,
      onProgress = null
    } = options;

    console.log(`[Migration] Starting batch migration of ${lessonIds.length} videos...`);

    const results = {
      total: lessonIds.length,
      successful: 0,
      failed: 0,
      skipped: 0,
      details: [],
      startTime: new Date().toISOString()
    };

    // Process in batches
    for (let i = 0; i < lessonIds.length; i += batchSize) {
      const batch = lessonIds.slice(i, Math.min(i + batchSize, lessonIds.length));
      console.log(`[Migration] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(lessonIds.length / batchSize)}`);

      await Promise.all(
        batch.map(async (lessonId) => {
          try {
            if (onProgress) {
              onProgress({
                current: i + batch.indexOf(lessonId) + 1,
                total: lessonIds.length,
                lessonId,
                status: 'processing'
              });
            }

            const result = await this.migrateSingleVideo(lessonId, {
              keepS3Backup,
              retryAttempts
            });

            if (result.success) {
              if (result.status === 'already_migrated') {
                results.skipped++;
              } else {
                results.successful++;
              }
            } else {
              results.failed++;
            }

            results.details.push(result);

            if (onProgress) {
              onProgress({
                current: i + batch.indexOf(lessonId) + 1,
                total: lessonIds.length,
                lessonId,
                status: result.success ? 'completed' : 'failed',
                result
              });
            }
          } catch (error) {
            console.error(`[Migration] Unexpected error for lesson ${lessonId}:`, error);
            results.failed++;
            results.details.push({
              success: false,
              lessonId,
              status: 'failed',
              error: error.message
            });
          }
        })
      );

      // Small delay between batches
      if (i + batchSize < lessonIds.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    results.endTime = new Date().toISOString();
    const duration = new Date(results.endTime) - new Date(results.startTime);
    results.durationMs = duration;

    console.log(`[Migration] Batch migration completed:`, {
      successful: results.successful,
      failed: results.failed,
      skipped: results.skipped,
      duration: `${Math.round(duration / 1000)}s`
    });

    return results;
  }

  /**
   * Verify migration success for a lesson
   * 
   * @param {number} lessonId - Lesson ID
   * @returns {Promise<Object>} Verification result
   */
  async verifyMigration(lessonId) {
    try {
      const lesson = await db('lessons')
        .where({ id: lessonId })
        .first();

      if (!lesson) {
        throw new Error('Lesson not found');
      }

      if (!lesson.mux_asset_id) {
        return {
          verified: false,
          status: 'not_migrated',
          message: 'Lesson has not been migrated to Mux'
        };
      }

      // Get asset status from Mux
      const asset = await muxService.getAsset(lesson.mux_asset_id);

      // Update database with latest status
      await db('lessons')
        .where({ id: lessonId })
        .update({
          mux_status: asset.status,
          mux_playback_id: asset.playbackIds[0]?.id || lesson.mux_playback_id,
          duration: asset.duration || lesson.duration,
          mux_metadata: JSON.stringify({
            aspectRatio: asset.aspectRatio,
            maxResolution: asset.maxStoredResolution,
            tracks: asset.tracks
          }),
          updated_at: db.fn.now()
        });

      return {
        verified: asset.status === 'ready',
        status: asset.status,
        assetId: asset.id,
        playbackId: asset.playbackIds[0]?.id,
        duration: asset.duration,
        errors: asset.errors,
        metadata: {
          aspectRatio: asset.aspectRatio,
          maxResolution: asset.maxStoredResolution
        }
      };
    } catch (error) {
      console.error('[Migration] Verification error:', error);
      throw error;
    }
  }

  /**
   * Rollback migration for a lesson (revert to S3)
   * 
   * @param {number} lessonId - Lesson ID
   * @returns {Promise<Object>} Rollback result
   */
  async rollbackMigration(lessonId) {
    try {
      const lesson = await db('lessons')
        .where({ id: lessonId })
        .first();

      if (!lesson) {
        throw new Error('Lesson not found');
      }

      // Check if S3 backup exists
      if (!lesson.video_url && !lesson.s3_key) {
        throw new Error('No S3 backup available for rollback');
      }

      // Delete Mux asset if exists
      if (lesson.mux_asset_id) {
        try {
          await muxService.deleteAsset(lesson.mux_asset_id, { db });
        } catch (error) {
          console.warn('[Migration] Failed to delete Mux asset during rollback:', error.message);
        }
      }

      // Revert to S3
      await db('lessons')
        .where({ id: lessonId })
        .update({
          video_provider: 's3',
          mux_asset_id: null,
          mux_playback_id: null,
          mux_upload_id: null,
          mux_status: null,
          mux_error_message: null,
          mux_metadata: null,
          updated_at: db.fn.now()
        });

      console.log(`[Migration] Rolled back lesson ${lessonId} to S3`);

      return {
        success: true,
        lessonId,
        status: 'rolled_back',
        provider: 's3'
      };
    } catch (error) {
      console.error('[Migration] Rollback error:', error);
      throw error;
    }
  }
}

module.exports = new MuxMigrationController();
