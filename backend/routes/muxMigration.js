const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const muxService = require('../services/muxService');
const muxMigrationController = require('../controllers/muxMigrationController');
const { detectVideoProvider, checkMigrationEligibility } = require('../utils/videoProviderDetection');
const db = require('../config/database');

// All routes require admin authentication
router.use(authenticateToken);
router.use(requireRole('admin'));

/**
 * GET /api/mux-migration/eligible-videos
 * Get list of S3 videos eligible for migration
 */
router.get('/eligible-videos', async (req, res) => {
  try {
    const { page = 1, limit = 50, courseId, search } = req.query;
    const offset = (page - 1) * limit;

    // Build query for S3 videos
    let query = db('lessons')
      .select(
        'lessons.id',
        'lessons.title',
        'lessons.description',
        'lessons.video_url',
        'lessons.s3_key',
        'lessons.hls_url',
        'lessons.duration',
        'lessons.video_provider',
        'lessons.created_at',
        'courses.id as course_id',
        'courses.title as course_title',
        'courses.teacher_id'
      )
      .leftJoin('courses', 'lessons.course_id', 'courses.id')
      .where(function() {
        this.whereNotNull('lessons.video_url')
          .orWhereNotNull('lessons.s3_key');
      })
      .where(function() {
        this.where('lessons.video_provider', 's3')
          .orWhereNull('lessons.video_provider');
      })
      .whereNull('lessons.mux_asset_id');

    // Apply filters
    if (courseId) {
      query = query.where('lessons.course_id', courseId);
    }

    if (search) {
      query = query.where(function() {
        this.where('lessons.title', 'ilike', `%${search}%`)
          .orWhere('courses.title', 'ilike', `%${search}%`);
      });
    }

    // Get total count
    const countQuery = query.clone();
    const [{ count: total }] = await countQuery.count('* as count');

    // Get paginated results
    const lessons = await query
      .orderBy('lessons.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    // Check migration eligibility for each lesson
    const eligibleVideos = lessons.map(lesson => {
      const eligibility = checkMigrationEligibility(lesson);
      return {
        ...lesson,
        eligibility
      };
    });

    res.json({
      success: true,
      data: {
        videos: eligibleVideos,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total),
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching eligible videos:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch eligible videos',
      error: error.message
    });
  }
});

/**
 * GET /api/mux-migration/status
 * Get migration status overview
 */
router.get('/status', async (req, res) => {
  try {
    const status = await muxService.getMigrationStatus(db);

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error fetching migration status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch migration status',
      error: error.message
    });
  }
});

/**
 * POST /api/mux-migration/migrate
 * Migrate selected videos from S3 to Mux
 */
router.post('/migrate', async (req, res) => {
  try {
    const { lessonIds, options = {} } = req.body;

    if (!lessonIds || !Array.isArray(lessonIds) || lessonIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'lessonIds array is required'
      });
    }

    // Fetch lessons to migrate
    const lessons = await db('lessons')
      .whereIn('id', lessonIds)
      .select('*');

    if (lessons.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No lessons found with provided IDs'
      });
    }

    // Start migration (this will run in background)
    const migrationOptions = {
      batchSize: options.batchSize || 3,
      retryAttempts: options.retryAttempts || 2,
      keepS3Backup: options.keepS3Backup !== false, // Default true
      onProgress: (progress) => {
        // Could emit WebSocket event here for real-time updates
        console.log('Migration progress:', progress);
      }
    };

    // Start migration asynchronously using the new controller
    muxMigrationController.migrateBatch(lessonIds, migrationOptions)
      .then(results => {
        console.log('Migration completed:', results);
      })
      .catch(error => {
        console.error('Migration failed:', error);
      });

    // Return immediately with accepted status
    res.status(202).json({
      success: true,
      message: 'Migration started',
      data: {
        lessonCount: lessons.length,
        estimatedDuration: `${Math.ceil(lessons.length / migrationOptions.batchSize) * 2} minutes`
      }
    });
  } catch (error) {
    console.error('Error starting migration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start migration',
      error: error.message
    });
  }
});

/**
 * GET /api/mux-migration/progress/:lessonId
 * Get migration progress for a specific lesson
 */
router.get('/progress/:lessonId', async (req, res) => {
  try {
    const { lessonId } = req.params;

    const lesson = await db('lessons')
      .where({ id: lessonId })
      .first();

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    const provider = detectVideoProvider(lesson);
    
    let progress = {
      lessonId: lesson.id,
      status: 'unknown',
      provider,
      muxStatus: lesson.mux_status,
      muxAssetId: lesson.mux_asset_id,
      muxPlaybackId: lesson.mux_playback_id,
      errorMessage: lesson.mux_error_message
    };

    if (provider === 'mux') {
      if (lesson.mux_status === 'ready') {
        progress.status = 'completed';
      } else if (lesson.mux_status === 'preparing' || lesson.mux_status === 'processing') {
        progress.status = 'in_progress';
      } else if (lesson.mux_status === 'errored') {
        progress.status = 'failed';
      }
    } else if (provider === 's3') {
      progress.status = 'not_started';
    }

    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    console.error('Error fetching migration progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch migration progress',
      error: error.message
    });
  }
});

/**
 * POST /api/mux-migration/verify/:lessonId
 * Verify migration success for a lesson
 */
router.post('/verify/:lessonId', async (req, res) => {
  try {
    const { lessonId } = req.params;

    const verification = await muxMigrationController.verifyMigration(lessonId);

    res.json({
      success: true,
      data: verification
    });
  } catch (error) {
    console.error('Error verifying migration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify migration',
      error: error.message
    });
  }
});

/**
 * POST /api/mux-migration/rollback/:lessonId
 * Rollback migration for a lesson (revert to S3)
 */
router.post('/rollback/:lessonId', async (req, res) => {
  try {
    const { lessonId } = req.params;

    const result = await muxMigrationController.rollbackMigration(lessonId);

    res.json({
      success: true,
      data: result,
      message: 'Migration rolled back successfully'
    });
  } catch (error) {
    console.error('Error rolling back migration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to rollback migration',
      error: error.message
    });
  }
});

/**
 * POST /api/mux-migration/migrate-single/:lessonId
 * Migrate a single video (synchronous for testing)
 */
router.post('/migrate-single/:lessonId', async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { keepS3Backup = true, retryAttempts = 2 } = req.body;

    const result = await muxMigrationController.migrateSingleVideo(
      parseInt(lessonId),
      { keepS3Backup, retryAttempts }
    );

    if (result.success) {
      res.json({
        success: true,
        data: result,
        message: 'Video migrated successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        data: result,
        message: 'Migration failed'
      });
    }
  } catch (error) {
    console.error('Error migrating single video:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to migrate video',
      error: error.message
    });
  }
});

module.exports = router;
