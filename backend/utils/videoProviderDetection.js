/**
 * Video Provider Detection Utility
 * 
 * Handles detection of video provider (Mux or S3) for lessons
 * and provides unified playback information
 */

const muxService = require('../services/muxService');
const cloudStorageService = require('../services/cloudStorageService');

/**
 * Detect video provider for a lesson
 * 
 * @param {Object} lesson - Lesson object from database
 * @returns {string} 'mux' | 's3' | 'none'
 */
function detectVideoProvider(lesson) {
  // Priority 1: Check for Mux playback ID (most reliable indicator)
  if (lesson.mux_playback_id && lesson.mux_playback_id.trim() !== '') {
    return 'mux';
  }

  // Priority 2: Check for Mux asset ID with ready status
  if (lesson.mux_asset_id && lesson.mux_status === 'ready') {
    return 'mux';
  }

  // Priority 3: Check video_provider field if it exists
  if (lesson.video_provider) {
    if (lesson.video_provider === 'mux' && lesson.mux_asset_id) {
      return 'mux';
    }
    if (lesson.video_provider === 's3' && (lesson.video_url || lesson.s3_key)) {
      return 's3';
    }
  }

  // Priority 4: Fallback to S3 if video_url or s3_key exists
  if (lesson.video_url || lesson.s3_key || lesson.hls_url) {
    return 's3';
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
    } else if (provider === 's3') {
      // S3 video playback
      // Check if video is still processing (check videos table status if available)
      const isProcessing = lesson.video_status === 'processing' || 
                          lesson.video_status === 'uploading' ||
                          (lesson.video_id && !lesson.video_url?.includes('.m3u8') && !lesson.video_url?.includes('/hls/'));
      
      playbackInfo.status = isProcessing ? 'processing' : 'ready';
      playbackInfo.metadata.s3Key = lesson.s3_key;
      playbackInfo.metadata.videoUrl = lesson.video_url;
      playbackInfo.metadata.hlsUrl = lesson.hls_url;
      playbackInfo.metadata.isProcessing = isProcessing;

      // Priority: Use video_url if it contains HLS (transcoded), otherwise use hls_url, then s3_key
      const hasHlsInVideoUrl = lesson.video_url && (
        lesson.video_url.includes('.m3u8') || 
        lesson.video_url.includes('/hls/')
      );

      if (hasHlsInVideoUrl) {
        // video_url contains the transcoded HLS URL - use it directly
        playbackInfo.playbackUrl = lesson.video_url;
        playbackInfo.metadata.supportsAdaptiveStreaming = true;
        playbackInfo.metadata.format = 'hls';
        playbackInfo.status = 'ready';
        console.log('✅ Using transcoded HLS URL from video_url:', lesson.video_url);
      } else if (lesson.hls_url) {
        // Prefer hls_url field if available
        playbackInfo.playbackUrl = lesson.hls_url;
        playbackInfo.metadata.supportsAdaptiveStreaming = true;
        playbackInfo.metadata.format = 'hls';
        playbackInfo.status = 'ready';
        console.log('✅ Using hls_url from lesson:', lesson.hls_url);
      } else if (isProcessing && generateSignedUrls && lesson.s3_key) {
        // Video is still processing - provide temporary URL from original file
        playbackInfo.playbackUrl = await cloudStorageService.getSignedStreamUrl(
          lesson.s3_key,
          urlExpiration
        );
        playbackInfo.metadata.supportsAdaptiveStreaming = false;
        playbackInfo.metadata.format = lesson.s3_key.toLowerCase().endsWith('.webm') ? 'webm' : 'mp4';
        playbackInfo.metadata.message = 'Video is being transcoded. This is a temporary URL - the transcoded version will be available shortly.';
        playbackInfo.metadata.warning = 'Transcoding in progress - using original file temporarily';
        console.log('⏳ Video is still processing, providing temporary URL from original file');
      } else if (generateSignedUrls && lesson.s3_key) {
        // Fallback: Generate signed URL from s3_key (original file)
        // This means transcoding hasn't completed or failed
        playbackInfo.playbackUrl = await cloudStorageService.getSignedStreamUrl(
          lesson.s3_key,
          urlExpiration
        );
        playbackInfo.metadata.supportsAdaptiveStreaming = false;
        playbackInfo.metadata.format = lesson.s3_key.toLowerCase().endsWith('.webm') ? 'webm' : 'mp4';
        playbackInfo.metadata.warning = lesson.s3_key.toLowerCase().endsWith('.webm') 
          ? 'WebM format may not be supported by all browsers. Transcoding may still be in progress.'
          : 'Using original file - transcoding may still be in progress.';
        console.log('⚠️ Using signed URL from s3_key (original file, transcoding may be in progress):', lesson.s3_key);
      } else {
        // Last resort: Use video_url as-is
        playbackInfo.playbackUrl = lesson.video_url;
        playbackInfo.metadata.supportsAdaptiveStreaming = false;
        playbackInfo.metadata.format = 'mp4';
        console.log('⚠️ Using video_url as-is (may be original file):', lesson.video_url);
      }

      // Thumbnail from S3 if available
      if (lesson.thumbnail_url) {
        playbackInfo.thumbnailUrl = lesson.thumbnail_url;
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
 * Check if a lesson can be migrated from S3 to Mux
 * 
 * @param {Object} lesson - Lesson object from database
 * @returns {Object} Migration eligibility info
 */
function checkMigrationEligibility(lesson) {
  const provider = detectVideoProvider(lesson);

  const eligibility = {
    canMigrate: false,
    reason: null,
    currentProvider: provider
  };

  if (provider === 'mux') {
    eligibility.reason = 'Already using Mux';
    return eligibility;
  }

  if (provider === 'none') {
    eligibility.reason = 'No video to migrate';
    return eligibility;
  }

  if (provider === 's3') {
    if (!lesson.video_url && !lesson.s3_key) {
      eligibility.reason = 'No S3 video URL or key found';
      return eligibility;
    }

    eligibility.canMigrate = true;
    eligibility.reason = 'Eligible for migration';
    eligibility.s3Url = lesson.video_url;
    eligibility.s3Key = lesson.s3_key;
    return eligibility;
  }

  return eligibility;
}

/**
 * Get provider statistics for all lessons
 * 
 * @param {Object} db - Database connection
 * @returns {Promise<Object>} Provider statistics
 */
async function getProviderStatistics(db) {
  try {
    const [muxCount, s3Count, noVideoCount, totalCount] = await Promise.all([
      db('lessons')
        .where({ video_provider: 'mux' })
        .whereNotNull('mux_playback_id')
        .count('* as count')
        .first(),
      db('lessons')
        .where(function() {
          this.where({ video_provider: 's3' })
            .orWhereNull('video_provider');
        })
        .where(function() {
          this.whereNotNull('video_url')
            .orWhereNotNull('s3_key');
        })
        .count('* as count')
        .first(),
      db('lessons')
        .whereNull('video_url')
        .whereNull('s3_key')
        .whereNull('mux_playback_id')
        .count('* as count')
        .first(),
      db('lessons').count('* as count').first()
    ]);

    return {
      total: parseInt(totalCount.count) || 0,
      mux: parseInt(muxCount.count) || 0,
      s3: parseInt(s3Count.count) || 0,
      noVideo: parseInt(noVideoCount.count) || 0,
      muxPercentage: totalCount.count > 0 
        ? Math.round((parseInt(muxCount.count) / parseInt(totalCount.count)) * 100)
        : 0
    };
  } catch (error) {
    console.error('Error getting provider statistics:', error);
    throw error;
  }
}

module.exports = {
  detectVideoProvider,
  getPlaybackInfo,
  getBulkPlaybackInfo,
  checkMigrationEligibility,
  getProviderStatistics
};
