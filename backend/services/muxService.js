/**
 * Mux Video Service
 * 
 * Handles all Mux video operations including:
 * - Direct upload URL generation
 * - Asset management and status checking
 * - Signed playback URL generation
 * - Video analytics
 * - Asset deletion and migration
 */

const Mux = require('@mux/mux-node');
const muxConfig = require('../config/mux');

class MuxService {
  constructor() {
    // Validate configuration
    if (!muxConfig.isConfigured) {
      console.warn('⚠️  MuxService: Configuration incomplete. Some features may not work.');
    }

    // Initialize Mux client
    try {
      this.mux = new Mux({
        tokenId: muxConfig.tokenId,
        tokenSecret: muxConfig.tokenSecret
      });

      console.log('✅ MuxService initialized successfully');
      console.log(`   Environment: ${muxConfig.environment}`);
      console.log(`   Default playback policy: ${muxConfig.defaultPlaybackPolicy}`);
    } catch (error) {
      console.error('❌ Failed to initialize MuxService:', error.message);
      throw new Error(`MuxService initialization failed: ${error.message}`);
    }

    this.config = muxConfig;
  }

  /**
   * Create a direct upload URL for video uploads
   * 
   * @param {Object} options - Upload options
   * @param {string} options.corsOrigin - CORS origin for the upload
   * @param {Object} options.metadata - Additional metadata for the asset
   * @param {string} options.playbackPolicy - 'public' or 'signed'
   * @returns {Promise<Object>} Upload URL and upload ID
   */
  async createDirectUpload(options = {}) {
    try {
      const {
        corsOrigin = this.config.corsOrigins[0],
        metadata = {},
        playbackPolicy = this.config.defaultPlaybackPolicy
      } = options;

      console.log('Creating Mux direct upload...', { corsOrigin, playbackPolicy });

      // Create direct upload
      const upload = await this.mux.video.uploads.create({
        cors_origin: corsOrigin,
        new_asset_settings: {
          playback_policy: [playbackPolicy],
          mp4_support: this.config.assetSettings.mp4_support,
          normalize_audio: this.config.assetSettings.normalize_audio,
          master_access: this.config.assetSettings.master_access,
          passthrough: JSON.stringify(metadata)
        }
      });

      console.log('✅ Direct upload created:', upload.id);

      return {
        uploadId: upload.id,
        uploadUrl: upload.url,
        status: upload.status,
        timeout: upload.timeout,
        corsOrigin: upload.cors_origin
      };
    } catch (error) {
      console.error('❌ Failed to create direct upload:', error);
      
      // Parse Mux API error messages for better user feedback
      let errorMessage = error.message || 'Unknown error';
      
      // Check if error has response data with Mux error details
      if (error.response?.data) {
        const muxError = error.response.data;
        
        // Check for asset limit error
        if (muxError.error && muxError.error.messages) {
          const messages = muxError.error.messages;
          if (messages.some(msg => msg.includes('10 assets') || msg.includes('exceeding this limit'))) {
            errorMessage = `400 ${JSON.stringify({error: {type: muxError.error.type, messages}})}`;
          } else {
            errorMessage = `400 ${JSON.stringify(muxError)}`;
          }
        } else {
          errorMessage = `400 ${JSON.stringify(muxError)}`;
        }
      }
      
      throw new Error(`Failed to create Mux direct upload: ${errorMessage}`);
    }
  }

  /**
   * Get upload information from Mux
   * 
   * @param {string} uploadId - Mux upload ID
   * @returns {Promise<Object>} Upload information
   */
  async getUpload(uploadId) {
    try {
      console.log('Fetching Mux upload:', uploadId);
      const upload = await this.mux.video.uploads.retrieve(uploadId);
      return upload;
    } catch (error) {
      console.error('Failed to fetch Mux upload:', error.message);
      throw error;
    }
  }

  /**
   * Get asset information and status
   * 
   * @param {string} assetId - Mux asset ID
   * @returns {Promise<Object>} Asset information
   */
  async getAsset(assetId) {
    try {
      console.log('Fetching Mux asset:', assetId);

      const asset = await this.mux.video.assets.retrieve(assetId);

      return {
        id: asset.id,
        status: asset.status,
        playbackIds: asset.playback_ids || [],
        duration: asset.duration,
        aspectRatio: asset.aspect_ratio,
        createdAt: asset.created_at,
        maxStoredResolution: asset.max_stored_resolution,
        maxStoredFrameRate: asset.max_stored_frame_rate,
        tracks: asset.tracks,
        errors: asset.errors,
        metadata: asset.passthrough ? JSON.parse(asset.passthrough) : {}
      };
    } catch (error) {
      console.error('❌ Failed to get asset:', error.message);
      throw new Error(`Failed to get Mux asset: ${error.message}`);
    }
  }

  /**
   * Generate a signed playback token (JWT) for private videos
   * 
   * @param {string} playbackId - Mux playback ID
   * @param {Object} options - Signing options
   * @param {number} options.expiresIn - Expiration time in seconds
   * @param {string} options.type - 'video' or 'thumbnail' or 'storyboard'
   * @param {Object} options.params - Additional parameters for the token
   * @returns {Promise<string>} Signed playback token (JWT)
   */
  async generatePlaybackToken(playbackId, options = {}) {
    try {
      const {
        expiresIn = this.config.signedUrlExpiration.playback,
        type = 'video',
        params = {}
      } = options;

      console.log('Generating signed playback token:', { playbackId, type, expiresIn });

      // Check if we have signing key configuration
      if (!this.config.signingKeyId || !this.config.signingKeyPrivate) {
        console.warn('⚠️  No signing key configured. Attempting to fetch from Mux...');
        
        // Try to get or create signing keys
        const signingKeys = await this.mux.video.signingKeys.list();
        
        if (!signingKeys || signingKeys.data.length === 0) {
          console.warn('⚠️  No signing keys found. Creating one...');
          const newKey = await this.mux.video.signingKeys.create();
          console.log('✅ Created signing key:', newKey.id);
          console.log('⚠️  Please add these to your .env file:');
          console.log(`   MUX_SIGNING_KEY_ID=${newKey.id}`);
          console.log(`   MUX_SIGNING_KEY_PRIVATE=${newKey.private_key}`);
          
          // Use the newly created key
          this.config.signingKeyId = newKey.id;
          this.config.signingKeyPrivate = newKey.private_key;
        } else {
          // Use the first available key
          const firstKey = signingKeys.data[0];
          console.log('✅ Using existing signing key:', firstKey.id);
          this.config.signingKeyId = firstKey.id;
          this.config.signingKeyPrivate = firstKey.private_key;
        }
      }

      // Generate JWT token using Mux utilities
      const jwt = require('jsonwebtoken');
      
      // Calculate expiration timestamp
      const expiration = Math.floor(Date.now() / 1000) + expiresIn;

      // Create JWT payload
      const payload = {
        sub: playbackId,
        aud: type,
        exp: expiration,
        kid: this.config.signingKeyId,
        ...params
      };

      // Sign the token
      const token = jwt.sign(payload, Buffer.from(this.config.signingKeyPrivate, 'base64'), {
        algorithm: 'RS256',
        keyid: this.config.signingKeyId
      });

      console.log('✅ Playback token generated');

      return token;
    } catch (error) {
      console.error('❌ Failed to generate playback token:', error.message);
      throw new Error(`Failed to generate playback token: ${error.message}`);
    }
  }

  /**
   * Create a signed playback URL for private videos (legacy method)
   * 
   * @param {string} playbackId - Mux playback ID
   * @param {Object} options - Signing options
   * @returns {Promise<string>} Signed playback URL
   */
  async createSignedPlaybackUrl(playbackId, options = {}) {
    try {
      const token = await this.generatePlaybackToken(playbackId, options);
      const baseUrl = `https://stream.mux.com/${playbackId}.m3u8`;
      return `${baseUrl}?token=${token}`;
    } catch (error) {
      console.error('❌ Failed to create signed URL:', error.message);
      throw new Error(`Failed to create signed playback URL: ${error.message}`);
    }
  }

  /**
   * Get playback URL (signed or public based on policy)
   * 
   * @param {string} playbackId - Mux playback ID
   * @param {string} policy - 'public' or 'signed'
   * @param {Object} options - Additional options
   * @returns {Promise<string>} Playback URL
   */
  async getPlaybackUrl(playbackId, policy = 'public', options = {}) {
    try {
      if (policy === 'signed') {
        return await this.createSignedPlaybackUrl(playbackId, options);
      }

      // Public playback URL
      const publicUrl = `https://stream.mux.com/${playbackId}.m3u8`;
      console.log('✅ Public playback URL generated');
      return publicUrl;
    } catch (error) {
      console.error('❌ Failed to get playback URL:', error.message);
      throw new Error(`Failed to get playback URL: ${error.message}`);
    }
  }

  /**
   * Get thumbnail URL for a video
   * 
   * @param {string} playbackId - Mux playback ID
   * @param {Object} options - Thumbnail options
   * @param {number} options.width - Thumbnail width
   * @param {number} options.height - Thumbnail height
   * @param {number} options.time - Time in seconds for the thumbnail
   * @param {boolean} options.signed - Whether to generate signed URL
   * @returns {Promise<string>} Thumbnail URL
   */
  async getThumbnailUrl(playbackId, options = {}) {
    try {
      const {
        width = 640,
        height = 360,
        time = 0,
        signed = false
      } = options;

      let thumbnailUrl = `https://image.mux.com/${playbackId}/thumbnail.jpg?width=${width}&height=${height}&time=${time}`;

      if (signed) {
        thumbnailUrl = await this.createSignedPlaybackUrl(playbackId, {
          type: 'thumbnail',
          expiresIn: this.config.signedUrlExpiration.thumbnail
        });
      }

      console.log('✅ Thumbnail URL generated');
      return thumbnailUrl;
    } catch (error) {
      console.error('❌ Failed to get thumbnail URL:', error.message);
      throw new Error(`Failed to get thumbnail URL: ${error.message}`);
    }
  }

  /**
   * Delete a Mux asset with retry logic
   * 
   * @param {string} assetId - Mux asset ID
   * @param {Object} options - Delete options
   * @param {number} options.maxRetries - Maximum retry attempts (default: 3)
   * @param {Object} options.db - Database connection for cleanup
   * @returns {Promise<Object>} Deletion result with status
   */
  async deleteAsset(assetId, options = {}) {
    const { maxRetries = 3, db = null } = options;
    let attempt = 0;
    let lastError = null;

    while (attempt < maxRetries) {
      attempt++;

      try {
        console.log(`Deleting Mux asset: ${assetId} (attempt ${attempt}/${maxRetries})`);

        await this.mux.video.assets.delete(assetId);

        // Clean up database records if db connection provided
        if (db) {
          await db('lessons')
            .where({ mux_asset_id: assetId })
            .update({
              mux_asset_id: null,
              mux_playback_id: null,
              mux_status: null,
              video_provider: 's3', // Fallback to S3 if video_url exists
              updated_at: db.fn.now()
            });

          console.log('✅ Database records cleaned up');
        }

        console.log('✅ Asset deleted successfully');
        return {
          success: true,
          assetId,
          attempts: attempt,
          deletedAt: new Date().toISOString()
        };
      } catch (error) {
        lastError = error;
        console.error(`❌ Delete attempt ${attempt} failed:`, error.message);

        // Check if asset doesn't exist (already deleted)
        if (error.message.includes('not found') || error.message.includes('404')) {
          console.log('ℹ️  Asset already deleted or does not exist');
          
          // Still clean up database if provided
          if (db) {
            await db('lessons')
              .where({ mux_asset_id: assetId })
              .update({
                mux_asset_id: null,
                mux_playback_id: null,
                mux_status: null,
                updated_at: db.fn.now()
              });
          }

          return {
            success: true,
            assetId,
            attempts: attempt,
            message: 'Asset already deleted',
            deletedAt: new Date().toISOString()
          };
        }

        // Retry with exponential backoff if not last attempt
        if (attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          console.log(`⏳ Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    // All retries failed
    const errorMessage = `Failed to delete Mux asset after ${maxRetries} attempts: ${lastError.message}`;
    console.error('❌', errorMessage);
    
    throw new Error(errorMessage);
  }

  /**
   * Verify webhook signature
   * 
   * @param {string} rawBody - Raw request body
   * @param {string} signature - Mux-Signature header value
   * @returns {boolean} Whether signature is valid
   */
  verifyWebhookSignature(rawBody, signature) {
    try {
      // Mux webhook signature verification
      const isValid = Mux.webhooks.verifyHeader(
        rawBody,
        signature,
        this.config.webhookSecret
      );

      if (isValid) {
        console.log('✅ Webhook signature verified');
      } else {
        console.warn('⚠️  Invalid webhook signature');
      }

      return isValid;
    } catch (error) {
      console.error('❌ Webhook signature verification failed:', error.message);
      return false;
    }
  }

  /**
   * Check if MuxService is properly configured
   * 
   * @returns {boolean} Configuration status
   */
  isConfigured() {
    return this.config.isConfigured;
  }

  /**
   * Get service configuration (without sensitive data)
   * 
   * @returns {Object} Safe configuration object
   */
  getConfig() {
    return {
      environment: this.config.environment,
      defaultPlaybackPolicy: this.config.defaultPlaybackPolicy,
      corsOrigins: this.config.corsOrigins,
      isConfigured: this.config.isConfigured
    };
  }

  /**
   * Get video analytics for an asset from local database
   * 
   * @param {string} assetId - Mux asset ID
   * @param {Object} db - Database connection
   * @param {Object} options - Query options
   * @param {string} options.timeframe - Timeframe for analytics (e.g., '7:days', '30:days')
   * @param {Date} options.startDate - Start date for analytics
   * @param {Date} options.endDate - End date for analytics
   * @returns {Promise<Object>} Analytics data
   */
  async getVideoAnalytics(assetId, db, options = {}) {
    try {
      const {
        timeframe = '7:days',
        startDate = null,
        endDate = null
      } = options;

      console.log('Fetching video analytics:', { assetId, timeframe });

      // Get lesson associated with this asset
      const lesson = await db('lessons')
        .where({ mux_asset_id: assetId })
        .first();

      if (!lesson) {
        throw new Error(`No lesson found for asset ${assetId}`);
      }

      // Calculate date range
      let dateFilter = db('video_analytics').where({ lesson_id: lesson.id });

      if (startDate && endDate) {
        dateFilter = dateFilter.whereBetween('session_started_at', [startDate, endDate]);
      } else if (timeframe) {
        // Parse timeframe (e.g., '7:days', '30:days')
        const [amount, unit] = timeframe.split(':');
        const daysAgo = unit === 'days' ? parseInt(amount) : 7;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
        dateFilter = dateFilter.where('session_started_at', '>=', cutoffDate);
      }

      // Get aggregated analytics
      const analytics = await dateFilter
        .select(
          db.raw('COUNT(DISTINCT id) as total_views'),
          db.raw('COUNT(DISTINCT user_id) as unique_viewers'),
          db.raw('SUM(watch_time_seconds) as total_watch_time'),
          db.raw('AVG(watch_time_seconds) as avg_watch_time'),
          db.raw('AVG(completion_percentage) as avg_completion_rate'),
          db.raw('COUNT(CASE WHEN session_completed = true THEN 1 END) as completed_views'),
          db.raw('SUM(rebuffer_count) as total_rebuffers'),
          db.raw('AVG(rebuffer_duration_ms) as avg_rebuffer_duration')
        )
        .first();

      // Get device breakdown
      const deviceBreakdown = await dateFilter
        .clone()
        .select('device_type')
        .count('* as count')
        .groupBy('device_type')
        .whereNotNull('device_type');

      // Get geographic breakdown
      const geoBreakdown = await dateFilter
        .clone()
        .select('country')
        .count('* as count')
        .groupBy('country')
        .whereNotNull('country')
        .orderBy('count', 'desc')
        .limit(10);

      // Calculate completion rate
      const totalViews = parseInt(analytics.total_views) || 0;
      const completedViews = parseInt(analytics.completed_views) || 0;
      const completionRate = totalViews > 0 ? (completedViews / totalViews) * 100 : 0;

      const analyticsData = {
        assetId,
        lessonId: lesson.id,
        timeframe,
        summary: {
          totalViews: totalViews,
          uniqueViewers: parseInt(analytics.unique_viewers) || 0,
          totalWatchTime: parseInt(analytics.total_watch_time) || 0,
          averageWatchTime: parseFloat(analytics.avg_watch_time) || 0,
          averageCompletionRate: parseFloat(analytics.avg_completion_rate) || 0,
          completionRate: completionRate,
          completedViews: completedViews,
          totalRebuffers: parseInt(analytics.total_rebuffers) || 0,
          averageRebufferDuration: parseFloat(analytics.avg_rebuffer_duration) || 0
        },
        breakdown: {
          devices: deviceBreakdown.map(d => ({
            type: d.device_type,
            count: parseInt(d.count)
          })),
          geography: geoBreakdown.map(g => ({
            country: g.country,
            count: parseInt(g.count)
          }))
        }
      };

      console.log('✅ Analytics data retrieved from database');
      return analyticsData;
    } catch (error) {
      console.error('❌ Failed to get video analytics:', error.message);
      throw new Error(`Failed to get video analytics: ${error.message}`);
    }
  }

  /**
   * Get view details for a specific view ID
   * 
   * @param {string} viewId - Mux view ID
   * @returns {Promise<Object>} View details
   */
  async getViewDetails(viewId) {
    try {
      console.log('Fetching view details:', viewId);

      // Note: This requires Mux Data API
      // Return structure for now
      const viewDetails = {
        viewId,
        timestamp: new Date().toISOString(),
        message: 'Mux Data API configuration required for detailed view data'
      };

      console.log('✅ View details structure prepared');
      return viewDetails;
    } catch (error) {
      console.error('❌ Failed to get view details:', error.message);
      throw new Error(`Failed to get view details: ${error.message}`);
    }
  }

  /**
   * Record a video view in the analytics table
   * 
   * @param {Object} viewData - View data to record
   * @param {number} viewData.lessonId - Lesson ID
   * @param {string} viewData.userId - User ID (optional)
   * @param {string} viewData.muxViewId - Mux view ID (optional)
   * @param {number} viewData.watchTime - Watch time in seconds
   * @param {number} viewData.videoDuration - Video duration in seconds
   * @param {number} viewData.completionPercentage - Completion percentage
   * @param {Object} viewData.deviceInfo - Device information
   * @param {Object} db - Database connection
   * @returns {Promise<Object>} Created analytics record
   */
  async recordVideoView(viewData, db) {
    try {
      const {
        lessonId,
        userId = null,
        muxViewId = null,
        watchTime = 0,
        videoDuration = null,
        completionPercentage = 0,
        deviceInfo = {}
      } = viewData;

      console.log('Recording video view:', { lessonId, userId, watchTime });

      // Check if this view already exists (by muxViewId or session)
      let existingView = null;
      if (muxViewId) {
        existingView = await db('video_analytics')
          .where({ mux_view_id: muxViewId })
          .first();
      }

      const sessionCompleted = completionPercentage >= 90;

      if (existingView) {
        // Update existing view
        const [updated] = await db('video_analytics')
          .where({ id: existingView.id })
          .update({
            watch_time_seconds: watchTime,
            completion_percentage: completionPercentage,
            session_completed: sessionCompleted,
            session_ended_at: new Date(),
            updated_at: new Date()
          })
          .returning('*');

        console.log('✅ Updated existing video view');
        return updated;
      } else {
        // Create new view record
        const [created] = await db('video_analytics')
          .insert({
            lesson_id: lessonId,
            user_id: userId,
            mux_view_id: muxViewId,
            watch_time_seconds: watchTime,
            video_duration_seconds: videoDuration,
            completion_percentage: completionPercentage,
            session_completed: sessionCompleted,
            device_type: deviceInfo.deviceType || null,
            browser: deviceInfo.browser || null,
            os: deviceInfo.os || null,
            country: deviceInfo.country || null,
            region: deviceInfo.region || null,
            session_started_at: new Date(),
            session_ended_at: new Date(),
            created_at: new Date(),
            updated_at: new Date()
          })
          .returning('*');

        console.log('✅ Created new video view record');
        return created;
      }
    } catch (error) {
      console.error('❌ Failed to record video view:', error.message);
      throw new Error(`Failed to record video view: ${error.message}`);
    }
  }

  /**
   * Sync analytics data for all Mux videos
   * This is a batch operation that can be run periodically
   * 
   * @param {Object} db - Database connection
   * @param {Object} options - Sync options
   * @param {number} options.limit - Limit number of lessons to sync
   * @param {number} options.daysBack - Number of days to look back for analytics
   * @returns {Promise<Object>} Sync result
   */
  async syncAllAnalytics(db, options = {}) {
    try {
      const {
        limit = 100,
        daysBack = 7
      } = options;

      console.log('Starting analytics sync for all Mux videos...');

      // Get all lessons with Mux videos
      const lessons = await db('lessons')
        .where({ video_provider: 'mux' })
        .whereNotNull('mux_asset_id')
        .whereNotNull('mux_playback_id')
        .where('mux_status', 'ready')
        .limit(limit)
        .select('id', 'mux_asset_id', 'title');

      if (lessons.length === 0) {
        console.log('No Mux videos found to sync');
        return {
          success: true,
          syncedCount: 0,
          lessons: []
        };
      }

      console.log(`Found ${lessons.length} Mux videos to sync`);

      const results = {
        success: [],
        failed: []
      };

      for (const lesson of lessons) {
        try {
          // Get analytics for this lesson
          const analytics = await this.getVideoAnalytics(
            lesson.mux_asset_id,
            db,
            { timeframe: `${daysBack}:days` }
          );

          results.success.push({
            lessonId: lesson.id,
            title: lesson.title,
            analytics: analytics.summary
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

      console.log(`✅ Analytics sync completed: ${results.success.length} synced, ${results.failed.length} failed`);

      return {
        success: true,
        syncedCount: results.success.length,
        failedCount: results.failed.length || 0,
        lessons: results.success,
        errors: results.failed
      };
    } catch (error) {
      console.error('❌ Failed to sync analytics:', error.message);
      throw new Error(`Failed to sync analytics: ${error.message}`);
    }
  }

  /**
   * Get cached analytics with automatic refresh
   * 
   * @param {string} assetId - Mux asset ID
   * @param {Object} db - Database connection
   * @param {Object} options - Query options
   * @param {number} options.ttl - Time to live in seconds (default: 300)
   * @returns {Promise<Object>} Cached or fresh analytics data
   */
  async getCachedAnalytics(assetId, db, options = {}) {
    try {
      const { ttl = 300, ...analyticsOptions } = options;
      const cacheKey = `analytics:${assetId}:${JSON.stringify(analyticsOptions)}`;

      // Initialize cache if needed
      if (!this.analyticsCache) {
        this.analyticsCache = new Map();
      }

      const cached = this.analyticsCache.get(cacheKey);
      const now = Date.now();

      // Return cached data if still valid
      if (cached && (now - cached.timestamp) < (ttl * 1000)) {
        console.log('✅ Returning cached analytics for:', assetId);
        return cached.data;
      }

      // Fetch fresh data
      console.log('Fetching fresh analytics data for:', assetId);
      const data = await this.getVideoAnalytics(assetId, db, analyticsOptions);

      // Cache the data
      this.analyticsCache.set(cacheKey, {
        data,
        timestamp: now
      });

      // Clean up old cache entries (keep max 100 entries)
      if (this.analyticsCache.size > 100) {
        const oldestKey = this.analyticsCache.keys().next().value;
        this.analyticsCache.delete(oldestKey);
        console.log('🧹 Cleaned up old cache entry');
      }

      console.log('✅ Analytics data cached for:', assetId);
      return data;
    } catch (error) {
      console.error('❌ Failed to get cached analytics:', error.message);
      throw error;
    }
  }

  /**
   * Clear analytics cache
   * 
   * @param {string} assetId - Specific asset ID to clear, or null to clear all
   */
  clearAnalyticsCache(assetId = null) {
    if (!this.analyticsCache) {
      return;
    }

    if (assetId) {
      // Clear all cache entries for this asset
      const keysToDelete = [];
      for (const key of this.analyticsCache.keys()) {
        if (key.startsWith(`analytics:${assetId}:`)) {
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach(key => this.analyticsCache.delete(key));
      console.log(`✅ Cleared analytics cache for asset: ${assetId} (${keysToDelete.length} entries)`);
    } else {
      this.analyticsCache.clear();
      console.log('✅ Cleared all analytics cache');
    }
  }

  /**
   * Get analytics summary for multiple lessons
   * 
   * @param {Array<number>} lessonIds - Array of lesson IDs
   * @param {Object} db - Database connection
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of analytics summaries
   */
  async getBulkAnalytics(lessonIds, db, options = {}) {
    try {
      console.log(`Fetching analytics for ${lessonIds.length} lessons`);

      const results = await Promise.all(
        lessonIds.map(async (lessonId) => {
          try {
            const lesson = await db('lessons')
              .where({ id: lessonId })
              .first('id', 'mux_asset_id', 'title');

            if (!lesson || !lesson.mux_asset_id) {
              return {
                lessonId,
                error: 'No Mux asset found'
              };
            }

            const analytics = await this.getCachedAnalytics(
              lesson.mux_asset_id,
              db,
              options
            );

            return {
              lessonId,
              title: lesson.title,
              analytics: analytics.summary
            };
          } catch (error) {
            return {
              lessonId,
              error: error.message
            };
          }
        })
      );

      console.log('✅ Bulk analytics fetch completed');
      return results;
    } catch (error) {
      console.error('❌ Failed to get bulk analytics:', error.message);
      throw error;
    }
  }

  /**
   * Bulk migrate videos from S3 to Mux with enhanced error handling
   * 
   * @param {Array<Object>} lessons - Array of lesson objects with S3 video data
   * @param {Object} db - Database connection
   * @param {Object} options - Migration options
   * @param {Function} options.progressCallback - Callback for progress updates
   * @param {number} options.batchSize - Number of lessons to process in parallel (default: 5)
   * @param {number} options.retryFailures - Number of retry attempts for failed migrations (default: 2)
   * @param {boolean} options.keepS3Backup - Keep S3 video as backup (default: true)
   * @returns {Promise<Object>} Migration results with detailed status
   */
  async bulkMigrateFromS3(lessons, db, options = {}) {
    const {
      progressCallback = null,
      batchSize = 5,
      retryFailures = 2,
      keepS3Backup = true
    } = options;

    try {
      console.log(`Starting bulk migration of ${lessons.length} videos...`);
      console.log(`Options: batchSize=${batchSize}, retryFailures=${retryFailures}, keepS3Backup=${keepS3Backup}`);

      const results = {
        total: lessons.length,
        successful: 0,
        failed: 0,
        skipped: 0,
        errors: [],
        details: [],
        startTime: new Date().toISOString()
      };

      // Process lessons in batches to avoid overwhelming the API
      for (let i = 0; i < lessons.length; i += batchSize) {
        const batch = lessons.slice(i, Math.min(i + batchSize, lessons.length));
        console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(lessons.length / batchSize)}`);

        await Promise.all(
          batch.map(async (lesson) => {
            let attempt = 0;
            let lastError = null;

            // Skip if already migrated
            if (lesson.video_provider === 'mux' && lesson.mux_asset_id) {
              console.log(`⏭️  Skipping lesson ${lesson.id} - already migrated`);
              results.skipped++;
              results.details.push({
                lessonId: lesson.id,
                title: lesson.title,
                status: 'skipped',
                reason: 'Already migrated to Mux'
              });
              return;
            }

            // Skip if no S3 video
            if (!lesson.video_url && !lesson.s3_key) {
              console.log(`⏭️  Skipping lesson ${lesson.id} - no S3 video found`);
              results.skipped++;
              results.details.push({
                lessonId: lesson.id,
                title: lesson.title,
                status: 'skipped',
                reason: 'No S3 video found'
              });
              return;
            }

            // Retry loop
            while (attempt <= retryFailures) {
              attempt++;

              try {
                // Report progress
                if (progressCallback) {
                  progressCallback({
                    current: i + batch.indexOf(lesson) + 1,
                    total: lessons.length,
                    lessonId: lesson.id,
                    lessonTitle: lesson.title,
                    status: attempt > 1 ? `retrying (${attempt}/${retryFailures + 1})` : 'processing',
                    attempt
                  });
                }

                // Create direct upload for this lesson
                const upload = await this.createDirectUpload({
                  metadata: {
                    lessonId: lesson.id,
                    migrationSource: 's3',
                    originalUrl: lesson.video_url || lesson.s3_key,
                    migratedAt: new Date().toISOString()
                  }
                });

                // Update lesson with upload info
                const updateData = {
                  mux_upload_id: upload.uploadId,
                  video_provider: 'mux',
                  mux_status: 'preparing',
                  updated_at: db.fn.now()
                };

                // Keep S3 backup if requested
                if (!keepS3Backup) {
                  updateData.video_url = null;
                  updateData.hls_url = null;
                  updateData.s3_key = null;
                }

                await db('lessons')
                  .where({ id: lesson.id })
                  .update(updateData);

                results.successful++;
                results.details.push({
                  lessonId: lesson.id,
                  title: lesson.title,
                  status: 'success',
                  uploadId: upload.uploadId,
                  attempts: attempt,
                  s3BackupKept: keepS3Backup
                });

                console.log(`✅ Migration initiated for lesson ${lesson.id} (attempt ${attempt})`);
                break; // Success, exit retry loop
              } catch (error) {
                lastError = error;
                console.error(`❌ Migration attempt ${attempt} failed for lesson ${lesson.id}:`, error.message);

                // If not last attempt, wait before retry
                if (attempt <= retryFailures) {
                  const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
                  console.log(`⏳ Waiting ${waitTime}ms before retry...`);
                  await new Promise(resolve => setTimeout(resolve, waitTime));
                }
              }
            }

            // If all retries failed
            if (lastError) {
              results.failed++;
              results.errors.push({
                lessonId: lesson.id,
                title: lesson.title,
                error: lastError.message,
                attempts: attempt
              });

              results.details.push({
                lessonId: lesson.id,
                title: lesson.title,
                status: 'failed',
                error: lastError.message,
                attempts: attempt
              });

              // Log error to database for admin notification
              try {
                await db('lessons')
                  .where({ id: lesson.id })
                  .update({
                    mux_error_message: lastError.message,
                    updated_at: db.fn.now()
                  });
              } catch (dbError) {
                console.error(`Failed to log error for lesson ${lesson.id}:`, dbError.message);
              }
            }
          })
        );

        // Small delay between batches to avoid rate limiting
        if (i + batchSize < lessons.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      results.endTime = new Date().toISOString();
      const duration = new Date(results.endTime) - new Date(results.startTime);
      results.durationMs = duration;

      console.log('✅ Bulk migration completed:', {
        successful: results.successful,
        failed: results.failed,
        skipped: results.skipped,
        duration: `${Math.round(duration / 1000)}s`
      });

      return results;
    } catch (error) {
      console.error('❌ Bulk migration failed:', error.message);
      throw new Error(`Bulk migration failed: ${error.message}`);
    }
  }

  /**
   * Retry failed asset processing with comprehensive error logging
   * 
   * @param {string} assetId - Mux asset ID
   * @param {Object} options - Retry options
   * @param {number} options.maxRetries - Maximum number of retries (default: 3)
   * @param {Object} options.db - Database connection for error logging
   * @param {Function} options.onRetry - Callback for retry events
   * @returns {Promise<Object>} Retry result with detailed status
   */
  async retryAssetProcessing(assetId, options = {}) {
    const { maxRetries = 3, db = null, onRetry = null } = options;

    try {
      console.log(`Retrying asset processing: ${assetId} (max ${maxRetries} attempts)`);

      let attempt = 0;
      let lastError = null;
      const retryLog = [];

      while (attempt < maxRetries) {
        attempt++;
        const attemptStartTime = Date.now();

        try {
          const asset = await this.getAsset(assetId);

          // Log attempt
          retryLog.push({
            attempt,
            timestamp: new Date().toISOString(),
            status: asset.status,
            duration: Date.now() - attemptStartTime
          });

          if (asset.status === 'ready') {
            console.log(`✅ Asset is ready after ${attempt} attempt(s)`);

            // Update database if provided
            if (db) {
              await db('lessons')
                .where({ mux_asset_id: assetId })
                .update({
                  mux_status: 'ready',
                  mux_playback_id: asset.playbackIds[0]?.id || null,
                  duration: asset.duration,
                  mux_error_message: null,
                  updated_at: db.fn.now()
                });
            }

            return {
              success: true,
              asset,
              attempts: attempt,
              retryLog,
              message: 'Asset processing completed successfully'
            };
          }

          if (asset.status === 'errored') {
            lastError = asset.errors;
            console.error(`❌ Asset in error state, attempt ${attempt}/${maxRetries}:`, asset.errors);

            // Log error to database
            if (db) {
              await db('lessons')
                .where({ mux_asset_id: assetId })
                .update({
                  mux_status: 'errored',
                  mux_error_message: JSON.stringify({
                    errors: asset.errors,
                    attempt,
                    timestamp: new Date().toISOString()
                  }),
                  updated_at: db.fn.now()
                });
            }

            // Notify via callback
            if (onRetry) {
              onRetry({
                assetId,
                attempt,
                status: 'errored',
                errors: asset.errors
              });
            }

            // Wait before retry (exponential backoff)
            if (attempt < maxRetries) {
              const waitTime = Math.pow(2, attempt) * 1000;
              console.log(`⏳ Waiting ${waitTime}ms before retry...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
            }
          } else {
            // Still processing
            console.log(`ℹ️  Asset status: ${asset.status} (attempt ${attempt})`);

            if (onRetry) {
              onRetry({
                assetId,
                attempt,
                status: asset.status
              });
            }

            return {
              success: false,
              status: asset.status,
              attempts: attempt,
              retryLog,
              message: 'Asset still processing'
            };
          }
        } catch (error) {
          lastError = error.message;
          console.error(`❌ Retry attempt ${attempt} failed:`, error.message);

          // Log error
          retryLog.push({
            attempt,
            timestamp: new Date().toISOString(),
            error: error.message,
            duration: Date.now() - attemptStartTime
          });

          // Log to database
          if (db) {
            try {
              await db('lessons')
                .where({ mux_asset_id: assetId })
                .update({
                  mux_error_message: JSON.stringify({
                    error: error.message,
                    attempt,
                    timestamp: new Date().toISOString()
                  }),
                  updated_at: db.fn.now()
                });
            } catch (dbError) {
              console.error('Failed to log error to database:', dbError.message);
            }
          }

          if (attempt < maxRetries) {
            const waitTime = Math.pow(2, attempt) * 1000;
            console.log(`⏳ Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      }

      // All retries exhausted
      const errorMessage = `Asset processing failed after ${maxRetries} attempts: ${JSON.stringify(lastError)}`;
      console.error('❌', errorMessage);

      return {
        success: false,
        error: errorMessage,
        attempts: maxRetries,
        retryLog,
        lastError
      };
    } catch (error) {
      console.error('❌ Retry process failed:', error.message);
      throw error;
    }
  }

  /**
   * Handle asset errors with comprehensive logging and notification
   * 
   * @param {string} assetId - Mux asset ID
   * @param {Object} options - Error handling options
   * @param {Object} options.db - Database connection
   * @param {Function} options.notifyAdmin - Callback to notify administrators
   * @param {boolean} options.attemptRecovery - Whether to attempt automatic recovery (default: false)
   * @returns {Promise<Object>} Error details and recovery status
   */
  async handleAssetError(assetId, options = {}) {
    const { db = null, notifyAdmin = null, attemptRecovery = false } = options;

    try {
      console.log('Handling asset error:', assetId);

      const asset = await this.getAsset(assetId);

      if (asset.status !== 'errored') {
        return {
          assetId,
          status: asset.status,
          message: 'Asset is not in error state',
          requiresAction: false
        };
      }

      // Comprehensive error details
      const errorDetails = {
        assetId,
        status: 'errored',
        errors: asset.errors,
        errorMessages: asset.errors?.messages || [],
        errorType: asset.errors?.type || 'unknown',
        timestamp: new Date().toISOString(),
        metadata: asset.metadata,
        requiresAction: true
      };

      // Categorize error severity
      const isCritical = this._isErrorCritical(asset.errors);
      errorDetails.severity = isCritical ? 'critical' : 'warning';

      console.error('Asset error details:', JSON.stringify(errorDetails, null, 2));

      // Update database with comprehensive error info
      if (db) {
        const lesson = await db('lessons')
          .where({ mux_asset_id: assetId })
          .first();

        if (lesson) {
          await db('lessons')
            .where({ id: lesson.id })
            .update({
              mux_status: 'errored',
              mux_error_message: JSON.stringify(errorDetails),
              updated_at: db.fn.now()
            });

          errorDetails.lessonId = lesson.id;
          errorDetails.lessonTitle = lesson.title;

          // Log to error tracking table if it exists
          try {
            await db('video_processing_errors').insert({
              lesson_id: lesson.id,
              asset_id: assetId,
              error_type: errorDetails.errorType,
              error_message: JSON.stringify(asset.errors),
              severity: errorDetails.severity,
              created_at: new Date()
            });
          } catch (err) {
            // Table might not exist, that's okay
            console.log('Note: video_processing_errors table not available');
          }
        }
      }

      // Notify administrators if callback provided
      if (notifyAdmin) {
        try {
          await notifyAdmin({
            type: 'mux_asset_error',
            severity: errorDetails.severity,
            assetId,
            lessonId: errorDetails.lessonId,
            lessonTitle: errorDetails.lessonTitle,
            errors: asset.errors,
            timestamp: errorDetails.timestamp
          });
          console.log('✅ Administrator notified of asset error');
        } catch (notifyError) {
          console.error('Failed to notify administrator:', notifyError.message);
        }
      }

      // Attempt automatic recovery if requested
      if (attemptRecovery) {
        console.log('Attempting automatic recovery...');
        try {
          const recoveryResult = await this.retryAssetProcessing(assetId, {
            maxRetries: 2,
            db
          });

          errorDetails.recoveryAttempted = true;
          errorDetails.recoveryResult = recoveryResult;

          if (recoveryResult.success) {
            console.log('✅ Automatic recovery successful');
            errorDetails.recovered = true;
            errorDetails.requiresAction = false;
          } else {
            console.log('⚠️  Automatic recovery failed');
            errorDetails.recovered = false;
          }
        } catch (recoveryError) {
          console.error('Recovery attempt failed:', recoveryError.message);
          errorDetails.recoveryError = recoveryError.message;
          errorDetails.recovered = false;
        }
      }

      return errorDetails;
    } catch (error) {
      console.error('❌ Failed to handle asset error:', error.message);
      throw error;
    }
  }

  /**
   * Determine if an error is critical
   * 
   * @private
   * @param {Object} errors - Mux error object
   * @returns {boolean} Whether error is critical
   */
  _isErrorCritical(errors) {
    if (!errors) return false;

    const criticalTypes = [
      'invalid_input',
      'encoding_error',
      'download_error'
    ];

    const errorType = errors.type || '';
    const errorMessages = JSON.stringify(errors.messages || []).toLowerCase();

    // Check for critical error types
    if (criticalTypes.includes(errorType)) {
      return true;
    }

    // Check for critical keywords in messages
    const criticalKeywords = ['corrupt', 'invalid', 'unsupported', 'failed permanently'];
    return criticalKeywords.some(keyword => errorMessages.includes(keyword));
  }

  /**
   * Get asset processing status with retry logic
   * 
   * @param {string} assetId - Mux asset ID
   * @param {number} maxAttempts - Maximum polling attempts
   * @param {number} pollInterval - Interval between polls in ms
   * @returns {Promise<Object>} Final asset status
   */
  async waitForAssetReady(assetId, maxAttempts = 60, pollInterval = 5000) {
    try {
      console.log(`Waiting for asset to be ready: ${assetId}`);

      let attempt = 0;

      while (attempt < maxAttempts) {
        attempt++;

        const asset = await this.getAsset(assetId);

        if (asset.status === 'ready') {
          console.log(`✅ Asset ready after ${attempt} attempts`);
          return asset;
        }

        if (asset.status === 'errored') {
          throw new Error(`Asset processing failed: ${JSON.stringify(asset.errors)}`);
        }

        console.log(`ℹ️  Asset status: ${asset.status}, attempt ${attempt}/${maxAttempts}`);

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }

      throw new Error(`Asset not ready after ${maxAttempts} attempts`);
    } catch (error) {
      console.error('❌ Failed waiting for asset:', error.message);
      throw error;
    }
  }

  /**
   * Bulk delete multiple Mux assets with error handling
   * 
   * @param {Array<string>} assetIds - Array of Mux asset IDs to delete
   * @param {Object} options - Delete options
   * @param {Object} options.db - Database connection for cleanup
   * @param {number} options.batchSize - Number of assets to delete in parallel (default: 5)
   * @param {Function} options.progressCallback - Callback for progress updates
   * @returns {Promise<Object>} Deletion results
   */
  async bulkDeleteAssets(assetIds, options = {}) {
    const { db = null, batchSize = 5, progressCallback = null } = options;

    try {
      console.log(`Starting bulk deletion of ${assetIds.length} assets...`);

      const results = {
        total: assetIds.length,
        successful: 0,
        failed: 0,
        errors: [],
        details: [],
        startTime: new Date().toISOString()
      };

      // Process in batches
      for (let i = 0; i < assetIds.length; i += batchSize) {
        const batch = assetIds.slice(i, Math.min(i + batchSize, assetIds.length));
        console.log(`Processing deletion batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(assetIds.length / batchSize)}`);

        await Promise.all(
          batch.map(async (assetId) => {
            try {
              // Report progress
              if (progressCallback) {
                progressCallback({
                  current: i + batch.indexOf(assetId) + 1,
                  total: assetIds.length,
                  assetId,
                  status: 'deleting'
                });
              }

              const deleteResult = await this.deleteAsset(assetId, {
                maxRetries: 3,
                db
              });

              results.successful++;
              results.details.push({
                assetId,
                status: 'deleted',
                attempts: deleteResult.attempts,
                deletedAt: deleteResult.deletedAt
              });

              console.log(`✅ Deleted asset: ${assetId}`);
            } catch (error) {
              results.failed++;
              results.errors.push({
                assetId,
                error: error.message
              });

              results.details.push({
                assetId,
                status: 'failed',
                error: error.message
              });

              console.error(`❌ Failed to delete asset ${assetId}:`, error.message);
            }
          })
        );

        // Small delay between batches
        if (i + batchSize < assetIds.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      results.endTime = new Date().toISOString();
      const duration = new Date(results.endTime) - new Date(results.startTime);
      results.durationMs = duration;

      console.log('✅ Bulk deletion completed:', {
        successful: results.successful,
        failed: results.failed,
        duration: `${Math.round(duration / 1000)}s`
      });

      return results;
    } catch (error) {
      console.error('❌ Bulk deletion failed:', error.message);
      throw new Error(`Bulk deletion failed: ${error.message}`);
    }
  }

  /**
   * Get download URL for a Mux asset
   * Note: This requires master_access to be enabled on the asset
   * 
   * @param {string} assetId - Mux asset ID
   * @returns {Promise<string>} Download URL
   */
  async getAssetDownloadUrl(assetId) {
    try {
      console.log('Getting download URL for asset:', assetId);
      
      const asset = await this.getAsset(assetId);
      
      // Check if asset has master access enabled
      // Master access allows downloading the original file
      if (!asset.tracks || asset.tracks.length === 0) {
        throw new Error('Asset has no tracks available for download');
      }

      // Find the master track (original file)
      const masterTrack = asset.tracks.find(track => track.type === 'video' && track.max_width);
      
      if (!masterTrack) {
        throw new Error('No master track found for download');
      }

      // Mux provides download URLs through the master track
      // The download URL format is: https://mux.com/{asset_id}/master.m3u8
      // But for direct file download, we need to use the master.m3u8 or check if there's a direct download URL
      
      // For now, we'll use the playback ID to generate a download URL
      // Note: This may not work for all assets - depends on Mux configuration
      if (asset.playbackIds && asset.playbackIds.length > 0) {
        const playbackId = asset.playbackIds[0].id;
        // Mux doesn't provide direct download URLs by default
        // We'll need to use the master.m3u8 URL or check asset settings
        const downloadUrl = `https://stream.mux.com/${playbackId}/master.m3u8`;
        
        console.log('✅ Download URL generated for asset:', assetId);
        return downloadUrl;
      }

      throw new Error('No playback ID found for asset');
    } catch (error) {
      console.error('❌ Failed to get asset download URL:', error.message);
      throw new Error(`Failed to get download URL: ${error.message}`);
    }
  }

  /**
   * Get migration status for lessons
   * 
   * @param {Object} db - Database connection
   * @returns {Promise<Object>} Migration status summary
   */
  async getMigrationStatus(db) {
    try {
      console.log('Fetching migration status...');

      const [s3Videos, muxVideos, totalVideos, erroredVideos, preparingVideos] = await Promise.all([
        db('lessons').where({ video_provider: 's3' }).whereNotNull('video_url').count('* as count').first(),
        db('lessons').where({ video_provider: 'mux' }).whereNotNull('mux_asset_id').count('* as count').first(),
        db('lessons').whereNotNull('video_url').orWhereNotNull('mux_asset_id').count('* as count').first(),
        db('lessons').where({ mux_status: 'errored' }).count('* as count').first(),
        db('lessons').where({ mux_status: 'preparing' }).count('* as count').first()
      ]);

      const status = {
        total: parseInt(totalVideos.count) || 0,
        s3: parseInt(s3Videos.count) || 0,
        mux: parseInt(muxVideos.count) || 0,
        errored: parseInt(erroredVideos.count) || 0,
        preparing: parseInt(preparingVideos.count) || 0,
        migrationProgress: 0
      };

      if (status.total > 0) {
        status.migrationProgress = Math.round((status.mux / status.total) * 100);
      }

      console.log('✅ Migration status:', status);
      return status;
    } catch (error) {
      console.error('❌ Failed to get migration status:', error.message);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new MuxService();
