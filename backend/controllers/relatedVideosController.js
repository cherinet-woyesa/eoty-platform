const db = require('../config/database');

const relatedVideosController = {
  /**
   * Get related videos for a lesson
   * GET /api/lessons/:lessonId/related
   */
  async getRelatedVideos(req, res) {
    try {
      const { lessonId } = req.params;
      const { limit = 6 } = req.query;

      // Get the current lesson
      const currentLesson = await db('lessons')
        .where({ id: parseInt(lessonId) })
        .first();

      if (!currentLesson) {
        return res.status(404).json({
          success: false,
          message: 'Lesson not found.'
        });
      }

      // Get course info
      const course = await db('courses')
        .where({ id: currentLesson.course_id })
        .first();

      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found.'
        });
      }

      // Check if thumbnail_url column exists
      const hasThumbnailUrl = await db.schema.hasColumn('lessons', 'thumbnail_url');
      
      // Build select fields
      const baseSelectFields = [
        'lessons.id',
        'lessons.title',
        'lessons.description',
        'lessons.duration',
        'lessons.order',
        'lessons.mux_playback_id',
        'lessons.video_provider',
        'lessons.created_at'
      ];
      
      if (hasThumbnailUrl) {
        baseSelectFields.push('lessons.thumbnail_url');
      }

      // Get related videos from the same course (excluding current lesson)
      const sameCourseVideos = await db('lessons')
        .where({ course_id: currentLesson.course_id })
        .where('id', '!=', parseInt(lessonId))
        .where('is_published', true)
        .whereNotNull('mux_playback_id')
        .where('mux_status', 'ready')
        .select(...baseSelectFields)
        .orderBy('order', 'asc')
        .limit(parseInt(limit));

      // Get related videos from similar courses (same category or teacher)
      const similarSelectFields = [
        'l.id',
        'l.title',
        'l.description',
        'l.duration',
        'l.order',
        'l.mux_playback_id',
        'l.video_provider',
        'l.created_at',
        'c.id as course_id',
        'c.title as course_title'
      ];
      
      if (hasThumbnailUrl) {
        similarSelectFields.push('l.thumbnail_url');
      }
      
      const similarCourseVideos = await db('lessons as l')
        .join('courses as c', 'l.course_id', 'c.id')
        .where('l.id', '!=', parseInt(lessonId))
        .where('l.is_published', true)
        .whereNotNull('l.mux_playback_id')
        .where('l.mux_status', 'ready')
        .where(function() {
          this.where('c.category', course.category)
            .orWhere('c.created_by', course.created_by);
        })
        .select(...similarSelectFields)
        .orderBy('l.created_at', 'desc')
        .limit(parseInt(limit));

      // Combine and deduplicate (prioritize same course videos)
      const allRelated = [...sameCourseVideos];
      const existingIds = new Set(sameCourseVideos.map(v => v.id));
      
      for (const video of similarCourseVideos) {
        if (!existingIds.has(video.id) && allRelated.length < parseInt(limit)) {
          allRelated.push(video);
        }
      }

      // Generate thumbnail URLs for Mux videos
      const videosWithThumbnails = allRelated.map(video => {
        let thumbnailUrl = video.thumbnail_url;
        
        if (!thumbnailUrl && video.mux_playback_id) {
          thumbnailUrl = `https://image.mux.com/${video.mux_playback_id}/thumbnail.jpg?width=640&height=360&time=0`;
        }

        return {
          ...video,
          thumbnail_url: thumbnailUrl
        };
      });

      res.json({
        success: true,
        data: {
          relatedVideos: videosWithThumbnails,
          currentCourse: {
            id: course.id,
            title: course.title
          }
        }
      });
    } catch (error) {
      console.error('Error getting related videos:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve related videos.'
      });
    }
  }
};

module.exports = relatedVideosController;

