/**
 * Video Provider Detection Utility
 * 
 * Handles Mux video detection and playback information
 * All videos use Mux - S3 video support removed
 */

const muxService = require('../services/muxService');

/**
 * Detect video provider for a lesson (Mux only)
 * 
 * @param {Object} lesson - Lesson object from database
 * @returns {string} 'mux' | 'none'
 */
function detectVideoProvider(lesson) {
  // Check for Mux playback ID (most reliable indicator - video is ready)
  if (lesson.mux_playback_id && lesson.mux_playback_id.trim() !== '') {
    return 'mux';
  }

  // Check for Mux asset ID (video is processing or ready)
  if (lesson.mux_asset_id && lesson.mux_asset_id.trim() !== '') {
    return 'mux';
  }

  // Check for Mux upload ID (upload in progress or processing)
  if (lesson.mux_upload_id && lesson.mux_upload_id.trim() !== '') {
    return 'mux';
  }

  // Check video_provider field with any Mux status (preparing, processing, ready, etc.)
  if (lesson.video_provider === 'mux' && lesson.mux_status) {
    return 'mux';
  }

  // No video found
  return 'none';
}

/**
 * Get playback information for a lesson
 * 
 * @param {Object} lesson - Lesson object from database
 * @param {Object} options - Options for playback info
 * @param {boolean} options.generateSignedUrls - Whether to generate signed URLs
 * @param {number} options.urlExpiration - URL expiration in seconds (default: 3600)
 * @param {string} options.playbackPolicy - 'public' or 'signed' for Mux
 * @returns {Promise<Object>} Playback information
 */
async function getPlaybackInfo(lesson, options = {}) {
  const {
    generateSignedUrls = true,
    urlExpiration = 3600,
    playbackPolicy = 'public'
  } = options;

  const provider = detectVideoProvider(lesson);

  const playbackInfo = {
    lessonId: lesson.id,
    provider,
    hasVideo: provider !== 'none',
    status: null,
    playbackUrl: null,
    thumbnailUrl: null,
    duration: lesson.duration || null,
    metadata: {}
  };

  try {
    if (provider === 'mux') {
      // Mux video playback
      playbackInfo.status = lesson.mux_status || 'unknown';
      playbackInfo.metadata.assetId = lesson.mux_asset_id;
      playbackInfo.metadata.playbackId = lesson.mux_playback_id;
      playbackInfo.metadata.uploadId = lesson.mux_upload_id;

      if (lesson.mux_playback_id && lesson.mux_status === 'ready') {
        // For Mux, we need to provide the playback ID and optionally a token
        playbackInfo.playbackUrl = lesson.mux_playback_id; // Just the playback ID
        
        // Only generate tokens for signed policy (production)
        if (playbackPolicy === 'signed' && generateSignedUrls) {
          try {
            playbackInfo.metadata.playbackToken = await muxService.generatePlaybackToken(
              lesson.mux_playback_id,
              { expiresIn: urlExpiration, type: 'video' }
            );
            console.log('✅ Playback token generated for signed video');
          } catch (error) {
            console.error('Failed to generate playback token:', error);
            // Fallback to public playback if token generation fails
            console.warn('Falling back to public playback');
          }
        } else {
          console.log('🔓 Using public playback (development mode)');
        }

        // Generate thumbnail URL - use public for development
        if (playbackPolicy === 'public' || !generateSignedUrls) {
          // Use public Mux thumbnail URL
          playbackInfo.thumbnailUrl = `https://image.mux.com/${lesson.mux_playback_id}/thumbnail.jpg`;
          console.log('🔓 Using public thumbnail URL');
        } else {
          // Try to generate signed thumbnail for production
          try {
            playbackInfo.thumbnailUrl = await muxService.getThumbnailUrl(
              lesson.mux_playback_id,
              { signed: true }
            );
          } catch (error) {
            console.error('Failed to generate signed thumbnail URL:', error);
            // Fallback to public thumbnail
            playbackInfo.thumbnailUrl = `https://image.mux.com/${lesson.mux_playback_id}/thumbnail.jpg`;
          }
        }

        playbackInfo.metadata.supportsAdaptiveStreaming = true;
        playbackInfo.metadata.format = 'hls';
      } else if (lesson.mux_status === 'preparing' || lesson.mux_status === 'processing') {
        playbackInfo.status = lesson.mux_status;
        playbackInfo.metadata.message = 'Video is being processed';
      } else if (lesson.mux_status === 'errored') {
        playbackInfo.status = 'error';
        playbackInfo.metadata.error = lesson.mux_error_message || 'Video processing failed';
      }
    } else {
      // No video
      playbackInfo.status = 'no_video';
      playbackInfo.metadata.message = 'No video uploaded for this lesson';
    }

    return playbackInfo;
  } catch (error) {
    console.error('Error getting playback info:', error);
    
    // Return error info but don't throw
    playbackInfo.status = 'error';
    playbackInfo.metadata.error = error.message;
    return playbackInfo;
  }
}

/**
 * Get playback information for multiple lessons
 * 
 * @param {Array<Object>} lessons - Array of lesson objects
 * @param {Object} options - Options for playback info
 * @returns {Promise<Array<Object>>} Array of playback information
 */
async function getBulkPlaybackInfo(lessons, options = {}) {
  try {
    const playbackInfoPromises = lessons.map(lesson => 
      getPlaybackInfo(lesson, options)
    );

    return await Promise.all(playbackInfoPromises);
  } catch (error) {
    console.error('Error getting bulk playback info:', error);
    throw error;
  }
}

/**
 * Check if a lesson has a Mux video
 * 
 * @param {Object} lesson - Lesson object from database
 * @returns {Object} Video status info
 */
function checkVideoStatus(lesson) {
  const provider = detectVideoProvider(lesson);

  return {
    hasVideo: provider === 'mux',
    provider: provider,
    status: lesson.mux_status || 'none',
    playbackId: lesson.mux_playback_id || null
  };
}

/**
 * Get video statistics for all lessons
 * 
 * @param {Object} db - Database connection
 * @returns {Promise<Object>} Video statistics
 */
async function getVideoStatistics(db) {
  try {
    const [muxCount, noVideoCount, totalCount] = await Promise.all([
      db('lessons')
        .whereNotNull('mux_playback_id')
        .count('* as count')
        .first(),
      db('lessons')
        .whereNull('mux_playback_id')
        .count('* as count')
        .first(),
      db('lessons').count('* as count').first()
    ]);

    return {
      total: parseInt(totalCount.count) || 0,
      withVideo: parseInt(muxCount.count) || 0,
      withoutVideo: parseInt(noVideoCount.count) || 0,
      videoPercentage: totalCount.count > 0 
        ? Math.round((parseInt(muxCount.count) / parseInt(totalCount.count)) * 100)
        : 0
    };
  } catch (error) {
    console.error('Error getting video statistics:', error);
    throw error;
  }
}

module.exports = {
  detectVideoProvider,
  getPlaybackInfo,
  getBulkPlaybackInfo,
  checkVideoStatus,
  getVideoStatistics
};
