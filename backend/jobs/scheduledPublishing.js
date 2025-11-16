/**
 * Scheduled Publishing Job
 * Automatically publishes courses that have reached their scheduled publish time
 */

const db = require('../config/database');

/**
 * Process scheduled course publications
 * Finds courses with scheduled_publish_at <= now and publishes them
 */
async function processScheduledPublications() {
  try {
    // Check if column exists
    const hasColumn = await db.schema.hasColumn('courses', 'scheduled_publish_at');
    if (!hasColumn) {
      return { success: true, publishedCount: 0, courses: [] }; // Column doesn't exist yet, skip silently
    }

    console.log('[Scheduled Publishing] Starting scheduled publication check...');

    // Find courses that are scheduled to be published and the time has come
    const coursesToPublish = await db('courses')
      .where('is_published', false)
      .whereNotNull('scheduled_publish_at')
      .where('scheduled_publish_at', '<=', new Date())
      .select('id', 'title', 'scheduled_publish_at');

    if (coursesToPublish.length === 0) {
      console.log('[Scheduled Publishing] No courses scheduled for publishing at this time');
      return {
        success: true,
        publishedCount: 0,
        courses: []
      };
    }

    console.log(`[Scheduled Publishing] Found ${coursesToPublish.length} course(s) to publish`);

    const results = {
      success: [],
      failed: []
    };

    // Publish each course
    for (const course of coursesToPublish) {
      try {
        // Validate course has at least one lesson
        const lessonCount = await db('lessons')
          .where({ course_id: course.id })
          .count('id as count')
          .first();

        if (parseInt(lessonCount.count) === 0) {
          console.warn(`[Scheduled Publishing] Course ${course.id} (${course.title}) has no lessons, skipping`);
          results.failed.push({
            courseId: course.id,
            title: course.title,
            reason: 'No lessons found'
          });
          continue;
        }

        // Publish the course
        await db('courses')
          .where({ id: course.id })
          .update({
            is_published: true,
            published_at: new Date(),
            scheduled_publish_at: null, // Clear the scheduled time
            updated_at: new Date()
          });

        console.log(`[Scheduled Publishing] Successfully published course ${course.id} (${course.title})`);
        results.success.push({
          courseId: course.id,
          title: course.title,
          scheduledFor: course.scheduled_publish_at
        });

      } catch (error) {
        console.error(`[Scheduled Publishing] Failed to publish course ${course.id}:`, error);
        results.failed.push({
          courseId: course.id,
          title: course.title,
          reason: error.message
        });
      }
    }

    console.log(`[Scheduled Publishing] Completed: ${results.success.length} published, ${results.failed.length} failed`);

    return {
      success: true,
      publishedCount: results.success.length,
      failedCount: results.failed.length,
      courses: results.success,
      errors: results.failed
    };

  } catch (error) {
    // Silently fail if column doesn't exist
    if (error.code === '42703') {
      return { success: true, publishedCount: 0, courses: [] };
    }
    console.error('[Scheduled Publishing] Job failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Initialize the scheduled publishing job
 * Sets up a cron job to run every 5 minutes
 */
function initializeScheduledPublishing() {
  // Run immediately on startup
  processScheduledPublications();

  // Run every 5 minutes
  const INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds
  setInterval(processScheduledPublications, INTERVAL);

  console.log('[Scheduled Publishing] Job initialized - running every 5 minutes');
}

module.exports = {
  processScheduledPublications,
  initializeScheduledPublishing
};
