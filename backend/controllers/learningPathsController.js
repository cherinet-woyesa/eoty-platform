const db = require('../config/database');

// Helper: coerce numeric safely
const num = (val, fallback = 0) => {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
};

const learningPathsController = {
  // GET /api/learning-paths
  async list(req, res) {
    try {
      const userId = req.user.userId;

      // Fetch enrolled courses with progress and metadata we need for grouping
      const courses = await db('courses as c')
        .join('user_course_enrollments as uce', 'c.id', 'uce.course_id')
        .leftJoin('lessons as l', 'l.course_id', 'c.id')
        .leftJoin('user_lesson_progress as ulp', function () {
          this.on('ulp.user_id', '=', 'uce.user_id').andOn('ulp.lesson_id', '=', 'l.id');
        })
        .where('uce.user_id', userId)
        .groupBy('c.id', 'c.title', 'c.description', 'c.category', 'c.level', 'c.metadata')
        .select(
          'c.id',
          'c.title',
          'c.description',
          'c.category',
          'c.level',
          'c.metadata',
          db.raw('COALESCE(AVG(ulp.progress), 0) as progress_percentage'),
          db.raw('COUNT(DISTINCT CASE WHEN ulp.is_completed = true OR ulp.progress = 100 THEN ulp.lesson_id END) as completed_lessons'),
          db.raw('COUNT(DISTINCT ulp.lesson_id) as total_lessons'),
          db.raw('0 as spent_seconds'),
          db.raw('0 as estimated_seconds')
        );

      // Build paths by category
      const pathsMap = new Map();
      courses.forEach((course) => {
        const category = course.category || 'General';
        const pathId = `path_${String(category).toLowerCase().replace(/\s+/g, '_')}`;
        const metadata = typeof course.metadata === 'string'
          ? (() => { try { return JSON.parse(course.metadata); } catch { return {}; } })()
          : (course.metadata || {});

        const estimatedDurationHours = num(metadata.estimatedDurationHours || metadata.estimated_duration || 0);
        const courseProgress = Math.round(num(course.progress_percentage, 0));

        if (!pathsMap.has(pathId)) {
          pathsMap.set(pathId, {
            id: pathId,
            title: `${category} Learning Path`,
            description: `Master ${category} through structured courses`,
            category,
            difficulty: String(course.level || 'beginner').toLowerCase(),
            estimated_duration: 0,
            courses: [],
            progress: 0,
            is_enrolled: true,
            student_count: 0,
            rating: 4.5
          });
        }

        const path = pathsMap.get(pathId);
        path.courses.push({
          id: course.id,
          title: course.title,
          order: path.courses.length + 1,
          is_completed: courseProgress === 100,
          is_locked: false,
          progress: courseProgress,
          estimated_duration: estimatedDurationHours
        });

        path.estimated_duration += estimatedDurationHours;
        path.progress = Math.round(
          path.courses.reduce((sum, c) => sum + num(c.progress, 0), 0) / path.courses.length
        );
      });

      // Static recommendations (placeholder until curated paths exist)
      const recommendedPaths = [
        {
          id: 'path_faith_foundations',
          title: 'Faith Foundations',
          description: 'Build a strong foundation in Orthodox faith and doctrine',
          category: 'Faith & Doctrine',
          difficulty: 'beginner',
          estimated_duration: 20,
          courses: [],
          progress: 0,
          is_enrolled: false,
          student_count: 1250,
          rating: 4.8
        },
        {
          id: 'path_church_history',
          title: 'Church History Journey',
          description: 'Explore the rich history of the Orthodox Church',
          category: 'History',
          difficulty: 'intermediate',
          estimated_duration: 30,
          courses: [],
          progress: 0,
          is_enrolled: false,
          student_count: 890,
          rating: 4.7
        },
        {
          id: 'path_spiritual_growth',
          title: 'Spiritual Growth',
          description: 'Deepen your spiritual practice and understanding',
          category: 'Spiritual Development',
          difficulty: 'intermediate',
          estimated_duration: 25,
          courses: [],
          progress: 0,
          is_enrolled: false,
          student_count: 1100,
          rating: 4.9
        }
      ];

      const paths = [...Array.from(pathsMap.values()), ...recommendedPaths];

      res.json({
        success: true,
        data: { paths }
      });
    } catch (error) {
      console.error('Failed to list learning paths:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to load learning paths'
      });
    }
  }
};

module.exports = learningPathsController;

