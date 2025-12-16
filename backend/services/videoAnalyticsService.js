/**
 * Video Analytics Service
 * Combines Mux analytics with platform analytics for comprehensive video insights
 */

const db = require('../config/database');
const muxService = require('./muxService');

class VideoAnalyticsService {
  /**
   * Sync analytics for a specific lesson
   * Fetches Mux data and combines with platform data
   * 
   * @param {number} lessonId - Lesson ID
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} Combined analytics data
   */
  async syncLessonAnalytics(lessonId, options = {}) {
    try {
      const { timeframe = '7:days', forceRefresh = false } = options;

      console.log(`Syncing analytics for lesson ${lessonId}...`);

      // Get lesson details
      const lesson = await db('lessons')
        .where({ id: lessonId })
        .first();

      if (!lesson) {
        throw new Error(`Lesson ${lessonId} not found`);
      }

      let muxAnalytics = null;
      let platformAnalytics = null;

      // Get Mux analytics if video is on Mux
      if (lesson.video_provider === 'mux' && lesson.mux_asset_id) {
        try {
          muxAnalytics = await muxService.getCachedAnalytics(
            lesson.mux_asset_id,
            db,
            {
              timeframe,
              ttl: forceRefresh ? 0 : 300 // Force refresh or 5 min cache
            }
          );
        } catch (error) {
          console.error(`Failed to fetch Mux analytics for lesson ${lessonId}:`, error.message);
        }
      }

      // Get platform analytics from video_analytics table
      platformAnalytics = await this.getPlatformAnalytics(lessonId, { timeframe });

      // Combine analytics
      const combined = this.combineAnalytics(muxAnalytics, platformAnalytics, lesson);

      console.log(`✅ Analytics synced for lesson ${lessonId}`);

      return combined;
    } catch (error) {
      console.error(`Failed to sync analytics for lesson ${lessonId}:`, error);
      throw error;
    }
  }

  /**
   * Get platform analytics from video_analytics table
   * 
   * @param {number} lessonId - Lesson ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Platform analytics data
   */
  async getPlatformAnalytics(lessonId, options = {}) {
    try {
      // Check if video_analytics table exists
      const hasVideoAnalyticsTable = await db.schema.hasTable('video_analytics');
      if (!hasVideoAnalyticsTable) {
        console.log('Video analytics table does not exist, returning empty analytics');
        return {
          total_views: 0,
          unique_viewers: 0,
          total_watch_time: 0,
          avg_watch_time: 0,
          avg_completion_rate: 0,
          completed_views: 0,
          total_rebuffers: 0,
          avg_rebuffer_duration: 0
        };
      }

      const { timeframe = '7:days', startDate = null, endDate = null } = options;

      let dateFilter = db('video_analytics').where({ lesson_id: lessonId });

      // Apply date filtering
      if (startDate && endDate) {
        dateFilter = dateFilter.whereBetween('session_started_at', [startDate, endDate]);
      } else if (timeframe) {
        const [amount, unit] = timeframe.split(':');
        const daysAgo = unit === 'days' ? parseInt(amount) : 7;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
        dateFilter = dateFilter.where('session_started_at', '>=', cutoffDate);
      }

      // Get aggregated analytics
      const summary = await dateFilter
        .clone()
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

      // Get daily trend
      const dailyTrend = await dateFilter
        .clone()
        .select(
          db.raw("DATE_TRUNC('day', session_started_at)::date as date"),
          db.raw('COUNT(DISTINCT id) as views'),
          db.raw('COUNT(DISTINCT user_id) as unique_viewers'),
          db.raw('SUM(watch_time_seconds) as watch_time')
        )
        .groupBy(db.raw("DATE_TRUNC('day', session_started_at)::date"))
        .orderBy('date', 'asc');

      const totalViews = parseInt(summary.total_views) || 0;
      const completedViews = parseInt(summary.completed_views) || 0;

      return {
        summary: {
          totalViews,
          uniqueViewers: parseInt(summary.unique_viewers) || 0,
          totalWatchTime: parseInt(summary.total_watch_time) || 0,
          averageWatchTime: parseFloat(summary.avg_watch_time) || 0,
          averageCompletionRate: parseFloat(summary.avg_completion_rate) || 0,
          completionRate: totalViews > 0 ? (completedViews / totalViews) * 100 : 0,
          completedViews,
          totalRebuffers: parseInt(summary.total_rebuffers) || 0,
          averageRebufferDuration: parseFloat(summary.avg_rebuffer_duration) || 0
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
        },
        trend: dailyTrend.map(t => ({
          date: t.date,
          views: parseInt(t.views),
          uniqueViewers: parseInt(t.unique_viewers),
          watchTime: parseInt(t.watch_time)
        }))
      };
    } catch (error) {
      console.error('Failed to get platform analytics:', error);
      throw error;
    }
  }

  /**
   * Combine Mux and platform analytics
   * 
   * @param {Object} muxAnalytics - Mux analytics data
   * @param {Object} platformAnalytics - Platform analytics data
   * @param {Object} lesson - Lesson object
   * @returns {Object} Combined analytics
   */
  combineAnalytics(muxAnalytics, platformAnalytics, lesson) {
    // If we have Mux analytics, use it as primary source
    if (muxAnalytics && muxAnalytics.summary) {
      return {
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        videoProvider: lesson.video_provider,
        source: 'mux',
        summary: muxAnalytics.summary,
        breakdown: muxAnalytics.breakdown || {},
        trend: platformAnalytics?.trend || [],
        lastSynced: new Date().toISOString()
      };
    }

    // Otherwise use platform analytics
    if (platformAnalytics && platformAnalytics.summary) {
      return {
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        videoProvider: lesson.video_provider || 's3',
        source: 'platform',
        summary: platformAnalytics.summary,
        breakdown: platformAnalytics.breakdown || {},
        trend: platformAnalytics.trend || [],
        lastSynced: new Date().toISOString()
      };
    }

    // No analytics available
    return {
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      videoProvider: lesson.video_provider || 's3',
      source: 'none',
      summary: {
        totalViews: 0,
        uniqueViewers: 0,
        totalWatchTime: 0,
        averageWatchTime: 0,
        averageCompletionRate: 0,
        completionRate: 0
      },
      breakdown: {
        devices: [],
        geography: []
      },
      trend: [],
      lastSynced: new Date().toISOString()
    };
  }

  /**
   * Get analytics for multiple lessons (bulk operation)
   * 
   * @param {Array<number>} lessonIds - Array of lesson IDs
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of analytics for each lesson
   */
  async getBulkLessonAnalytics(lessonIds, options = {}) {
    try {
      console.log(`Fetching bulk analytics for ${lessonIds.length} lessons`);

      const results = await Promise.all(
        lessonIds.map(async (lessonId) => {
          try {
            return await this.syncLessonAnalytics(lessonId, options);
          } catch (error) {
            console.error(`Failed to get analytics for lesson ${lessonId}:`, error.message);
            return {
              lessonId,
              error: error.message,
              summary: {
                totalViews: 0,
                uniqueViewers: 0,
                totalWatchTime: 0,
                averageWatchTime: 0,
                averageCompletionRate: 0
              }
            };
          }
        })
      );

      console.log('✅ Bulk analytics fetch completed');
      return results;
    } catch (error) {
      console.error('Failed to get bulk analytics:', error);
      throw error;
    }
  }

  /**
   * Get course-level analytics (aggregated from all lessons)
   * 
   * @param {number} courseId - Course ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Course analytics
   */
  async getCourseAnalytics(courseId, options = {}) {
    try {
      const { timeframe = '7:days' } = options;

      console.log(`Fetching course analytics for course ${courseId}...`);

      // Get all lessons for this course
      const lessons = await db('lessons')
        .where({ course_id: courseId })
        .select('id', 'title', 'video_provider', 'mux_asset_id', 'order');

      if (lessons.length === 0) {
        return {
          courseId,
          totalLessons: 0,
          summary: {
            totalViews: 0,
            uniqueViewers: 0,
            totalWatchTime: 0,
            averageCompletionRate: 0
          },
          lessonAnalytics: []
        };
      }

      // Get analytics for all lessons
      const lessonIds = lessons.map(l => l.id);
      const lessonAnalytics = await this.getBulkLessonAnalytics(lessonIds, { timeframe });

      // Aggregate course-level metrics
      const summary = {
        totalViews: 0,
        uniqueViewers: new Set(),
        totalWatchTime: 0,
        totalCompletionRate: 0,
        lessonsWithViews: 0
      };

      lessonAnalytics.forEach(analytics => {
        if (analytics.summary) {
          summary.totalViews += analytics.summary.totalViews || 0;
          summary.totalWatchTime += analytics.summary.totalWatchTime || 0;
          summary.totalCompletionRate += analytics.summary.averageCompletionRate || 0;
          
          if (analytics.summary.totalViews > 0) {
            summary.lessonsWithViews++;
          }
        }
      });

      // Get unique viewers across all lessons
      const uniqueViewers = await db('video_analytics')
        .whereIn('lesson_id', lessonIds)
        .distinct('user_id')
        .whereNotNull('user_id');

      return {
        courseId,
        totalLessons: lessons.length,
        summary: {
          totalViews: summary.totalViews,
          uniqueViewers: uniqueViewers.length,
          totalWatchTime: summary.totalWatchTime,
          averageWatchTime: summary.totalViews > 0 
            ? Math.round(summary.totalWatchTime / summary.totalViews) 
            : 0,
          averageCompletionRate: summary.lessonsWithViews > 0
            ? summary.totalCompletionRate / summary.lessonsWithViews
            : 0,
          engagementRate: lessons.length > 0
            ? (summary.lessonsWithViews / lessons.length) * 100
            : 0
        },
        lessonAnalytics: lessonAnalytics.map((analytics, index) => ({
          ...analytics,
          lessonOrder: lessons[index].order
        })).sort((a, b) => a.lessonOrder - b.lessonOrder),
        lastSynced: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Failed to get course analytics for course ${courseId}:`, error);
      throw error;
    }
  }

  /**
   * Get teacher dashboard analytics
   * Aggregates analytics across all teacher's courses
   * 
   * @param {string} teacherId - Teacher user ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Teacher dashboard analytics
   */
  async getTeacherDashboardAnalytics(teacherId, options = {}) {
    try {
      const { timeframe = '7:days', limit = 10 } = options;

      console.log(`Fetching teacher dashboard analytics for teacher ${teacherId}...`);

      // Get all courses for this teacher
      const courses = await db('courses')
        .where({ created_by: teacherId })
        .select('id', 'title');

      if (courses.length === 0) {
        return {
          teacherId,
          totalCourses: 0,
          summary: {
            totalViews: 0,
            uniqueViewers: 0,
            totalWatchTime: 0,
            averageCompletionRate: 0
          },
          topPerformingLessons: [],
          recentActivity: []
        };
      }

      // Get all lessons for these courses
      const courseIds = courses.map(c => c.id);
      const lessons = await db('lessons')
        .whereIn('course_id', courseIds)
        .select('id', 'title', 'course_id', 'video_provider', 'mux_asset_id');

      // Get analytics for all lessons
      const lessonIds = lessons.map(l => l.id);
      const lessonAnalytics = await this.getBulkLessonAnalytics(lessonIds, { timeframe });

      // Aggregate teacher-level metrics
      const summary = {
        totalViews: 0,
        totalWatchTime: 0,
        totalCompletionRate: 0,
        lessonsWithViews: 0
      };

      lessonAnalytics.forEach(analytics => {
        if (analytics.summary) {
          summary.totalViews += analytics.summary.totalViews || 0;
          summary.totalWatchTime += analytics.summary.totalWatchTime || 0;
          summary.totalCompletionRate += analytics.summary.averageCompletionRate || 0;
          
          if (analytics.summary.totalViews > 0) {
            summary.lessonsWithViews++;
          }
        }
      });

      // Get unique viewers across all lessons
      // Check if video_analytics table exists
      const hasVideoAnalyticsTable = await db.schema.hasTable('video_analytics');
      let uniqueViewers = [];
      
      if (hasVideoAnalyticsTable && lessonIds.length > 0) {
        try {
          uniqueViewers = await db('video_analytics')
            .whereIn('lesson_id', lessonIds)
            .distinct('user_id')
            .whereNotNull('user_id');
        } catch (error) {
          console.warn('Error querying video_analytics table for unique viewers:', error.message);
          uniqueViewers = [];
        }
      }

      // Get top performing lessons
      const topPerformingLessons = lessonAnalytics
        .filter(a => a.summary && a.summary.totalViews > 0)
        .sort((a, b) => b.summary.totalViews - a.summary.totalViews)
        .slice(0, limit)
        .map(analytics => {
          const lesson = lessons.find(l => l.id === analytics.lessonId);
          const course = courses.find(c => c.id === lesson?.course_id);
          return {
            lessonId: analytics.lessonId,
            lessonTitle: analytics.lessonTitle,
            courseTitle: course?.title || 'Unknown',
            views: analytics.summary.totalViews,
            completionRate: analytics.summary.averageCompletionRate,
            watchTime: analytics.summary.totalWatchTime
          };
        });

      // Fallback: if no platform/mux analytics available, try computing basic metrics
      // from `user_lesson_progress` so dev/local environments still show useful data.
      let fallbackTopLessons = topPerformingLessons;
      if ((Array.isArray(topPerformingLessons) && topPerformingLessons.length === 0)) {
        try {
          const progressRows = await db('user_lesson_progress as ulp')
            .join('lessons as l', 'ulp.lesson_id', 'l.id')
            .join('courses as c', 'l.course_id', 'c.id')
            .whereIn('l.course_id', courseIds)
            .where('ulp.progress', '>', 0)
            .select('l.id as lesson_id', 'l.title as lesson_title', 'c.title as course_title')
            .count('ulp.user_id as views')
            .groupBy('l.id', 'l.title', 'c.title')
            .orderBy('views', 'desc')
            .limit(limit);

          if (progressRows && progressRows.length > 0) {
            fallbackTopLessons = progressRows.map(r => ({
              lessonId: r.lesson_id,
              lessonTitle: r.lesson_title,
              courseTitle: r.course_title,
              views: parseInt(r.views) || 0,
              completionRate: 0,
              watchTime: 0
            }));
          }
        } catch (err) {
          console.warn('Fallback progress-based top lessons failed:', err.message);
        }
      }

      // Get recent activity (last 7 days)
      let recentActivity = [];
      
      if (hasVideoAnalyticsTable && lessonIds.length > 0) {
        try {
          recentActivity = await db('video_analytics')
            .whereIn('lesson_id', lessonIds)
            .where('session_started_at', '>=', db.raw("NOW() - INTERVAL '7 days'"))
            .select(
              db.raw("DATE_TRUNC('day', session_started_at)::date as date"),
              db.raw('COUNT(DISTINCT id) as views'),
              db.raw('COUNT(DISTINCT user_id) as unique_viewers'),
              db.raw('SUM(watch_time_seconds) as watch_time')
            )
            .groupBy(db.raw("DATE_TRUNC('day', session_started_at)::date"))
            .orderBy('date', 'desc')
            .limit(7);
        } catch (error) {
          console.warn('Error querying video_analytics for recent activity:', error.message);
          recentActivity = [];
        }
      }

      return {
        teacherId,
        totalCourses: courses.length,
        totalLessons: lessons.length,
        summary: {
          totalViews: summary.totalViews,
          uniqueViewers: uniqueViewers.length,
          totalWatchTime: summary.totalWatchTime,
          averageWatchTime: summary.totalViews > 0 
            ? Math.round(summary.totalWatchTime / summary.totalViews) 
            : 0,
          averageCompletionRate: summary.lessonsWithViews > 0
            ? summary.totalCompletionRate / summary.lessonsWithViews
            : 0
        },
        topPerformingLessons: fallbackTopLessons,
        recentActivity: recentActivity.map(a => ({
          date: a.date,
          views: parseInt(a.views),
          uniqueViewers: parseInt(a.unique_viewers),
          watchTime: parseInt(a.watch_time)
        })),
        lastSynced: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Failed to get teacher dashboard analytics:`, error);
      throw error;
    }
  }

  /**
   * Get engagement heatmap data for a lesson
   * Returns watch count per timestamp segment
   * 
   * @param {number} lessonId - Lesson ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Engagement heatmap data
   */
  async getEngagementHeatmap(lessonId, options = {}) {
    try {
      const { timeframe = '7:days', segments = 100 } = options;

      // Get lesson duration
      const lesson = await db('lessons')
        .where({ id: lessonId })
        .select('id', 'title', 'video_duration')
        .first();

      if (!lesson) {
        throw new Error(`Lesson ${lessonId} not found`);
      }

      // Get video duration (from lesson or calculate from video_analytics)
      let videoDuration = lesson.video_duration;
      if (!videoDuration) {
        const durationData = await db('video_analytics')
          .where({ lesson_id: lessonId })
          .whereNotNull('video_duration_seconds')
          .select(db.raw('MAX(video_duration_seconds) as max_duration'))
          .first();
        videoDuration = durationData?.max_duration || 600; // Default to 10 minutes
      }

      // Apply timeframe filter
      let dateFilter = db('user_lesson_progress')
        .where({ lesson_id: lessonId })
        .whereNotNull('last_watched_timestamp');

      if (timeframe) {
        const [amount, unit] = timeframe.split(':');
        const daysAgo = unit === 'days' ? parseInt(amount) : 7;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
        dateFilter = dateFilter.where('last_accessed_at', '>=', cutoffDate);
      }

      // Get watch history data
      const watchHistory = await dateFilter
        .select('last_watched_timestamp', 'progress')
        .whereNotNull('last_watched_timestamp');

      // Segment duration
      const segmentDuration = videoDuration / segments;

      // Aggregate watch data by segment
      const segmentData = Array(segments).fill(0).map((_, i) => ({
        startTime: i * segmentDuration,
        endTime: (i + 1) * segmentDuration,
        watchCount: 0
      }));

      // Count watches per segment
      watchHistory.forEach((record) => {
        const timestamp = parseFloat(record.last_watched_timestamp) || 0;
        if (timestamp >= 0 && timestamp <= videoDuration) {
          const segmentIndex = Math.floor(timestamp / segmentDuration);
          if (segmentIndex >= 0 && segmentIndex < segments) {
            segmentData[segmentIndex].watchCount++;
          }
        }
      });

      return {
        lessonId,
        videoDuration,
        segments,
        segmentData: segmentData.map(s => ({
          timestamp: s.startTime,
          watchCount: s.watchCount
        })),
        totalWatches: watchHistory.length
      };
    } catch (error) {
      console.error(`Failed to get engagement heatmap for lesson ${lessonId}:`, error);
      throw error;
    }
  }

  /**
   * Get watch heatmap data for a lesson
   * Returns segments of timestamp (seconds) and watchCount
   */
  async getLessonHeatmap(lessonId, options = {}) {
    const { segments = 100 } = options;

    // If video_analytics doesn't exist, return empty
    const hasVideoAnalyticsTable = await db.schema.hasTable('video_analytics');
    if (!hasVideoAnalyticsTable) {
      return { segments: [], total: 0 };
    }

    // Get lesson duration
    const lesson = await db('lessons').where({ id: lessonId }).first('duration');
    const duration = lesson?.duration ? parseInt(lesson.duration, 10) : 0;
    if (!duration || duration <= 0) {
      return { segments: [], total: 0, duration: 0 };
    }

    const segmentDuration = duration / segments;
    const segmentsArray = Array(segments).fill(0).map((_, i) => ({
      startTime: i * segmentDuration,
      endTime: (i + 1) * segmentDuration,
      watchCount: 0
    }));

    const rows = await db('video_analytics')
      .where({ lesson_id: lessonId })
      .select('watch_time_seconds', 'playback_progress');

    rows.forEach(r => {
      const progress = parseFloat(r.playback_progress || 0);
      const time = Math.min(duration, Math.max(0, (progress / 100) * duration));
      const idx = Math.floor(time / segmentDuration);
      if (idx >= 0 && idx < segmentsArray.length) {
        segmentsArray[idx].watchCount += 1;
      }
    });

    const total = rows.length;

    return { segments: segmentsArray, total, duration };
  }
}

module.exports = new VideoAnalyticsService();
