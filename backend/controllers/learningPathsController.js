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

      // If curated tables exist, return curated paths with per-user enrollment
      const hasCurated = await db.schema.hasTable('learning_paths');
      if (hasCurated) {
        const paths = await fetchCuratedPaths(db, userId);
        return res.json({ success: true, data: { paths } });
      }

      // Fallback: derive paths from enrolled courses (legacy behaviour)
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
  },

  // POST /api/learning-paths/:pathId/enroll
  async enroll(req, res) {
    try {
      const { pathId } = req.params;
      const userId = req.user.userId;

      const exists = await db('learning_paths').where({ id: pathId, is_published: true }).first();
      if (!exists) {
        return res.status(404).json({ success: false, message: 'Learning path not found or not published' });
      }

      const existingEnrollment = await db('learning_path_enrollments')
        .where({ path_id: pathId, user_id: userId })
        .first();

      if (!existingEnrollment) {
        await db('learning_path_enrollments').insert({
          path_id: pathId,
          user_id: userId,
          progress: 0,
          status: 'active'
        });
      }

      return res.json({ success: true, message: 'Enrolled in learning path' });
    } catch (error) {
      console.error('Failed to enroll in learning path:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to enroll in learning path'
      });
    }
  },

  // GET /api/learning-paths/:pathId
  async getOne(req, res) {
    try {
      const { pathId } = req.params;
      const userId = req.user.userId;

      const path = await buildPathDetail(db, pathId, userId);
      if (!path) {
        return res.status(404).json({ success: false, message: 'Learning path not found' });
      }

      return res.json({ success: true, data: { path } });
    } catch (error) {
      console.error('Failed to load learning path detail:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to load learning path'
      });
    }
  }
};

/**
 * Build curated paths with user enrollment/progress and course list.
 */
async function fetchCuratedPaths(db, userId) {
  const pathRows = await db('learning_paths as lp')
    .leftJoin('learning_path_enrollments as lpe', function() {
      this.on('lpe.path_id', '=', 'lp.id').andOnVal('lpe.user_id', '=', userId);
    })
    .select(
      'lp.id',
      'lp.slug',
      'lp.title',
      'lp.description',
      'lp.category',
      'lp.difficulty',
      'lp.estimated_duration_hours',
      'lp.thumbnail_url',
      'lp.is_published',
      'lp.metadata',
      'lpe.progress as user_progress',
      'lpe.status as enrollment_status',
      'lpe.started_at',
      'lpe.completed_at',
      'lpe.last_accessed_at'
    )
    .orderBy('lp.title', 'asc');

  const courseRows = await db('learning_path_courses as lpc')
    .join('courses as c', 'lpc.course_id', 'c.id')
    .select(
      'lpc.path_id',
      'lpc.course_id',
      'lpc.order',
      'lpc.is_required',
      'c.title',
      'c.level',
      'c.category'
    )
    .orderBy('lpc.path_id')
    .orderBy('lpc.order');

  let progressMap = new Map();
  try {
    const courseProgress = await db('user_course_progress_view')
      .where({ user_id: userId })
      .select('course_id', 'progress');
    progressMap = new Map(courseProgress.map(r => [r.course_id, Number(r.progress || 0)]));
  } catch (err) {
    // View may not exist yet; silently fallback to 0 progress
    progressMap = new Map();
  }

  const coursesByPath = courseRows.reduce((acc, row) => {
    if (!acc[row.path_id]) acc[row.path_id] = [];
    acc[row.path_id].push({
      id: row.course_id,
      title: row.title,
      order: row.order,
      is_required: row.is_required,
      level: row.level,
      category: row.category,
      progress: progressMap.get(row.course_id) || 0,
      is_completed: (progressMap.get(row.course_id) || 0) >= 100
    });
    return acc;
  }, {});

  return pathRows.map(row => {
    const courses = coursesByPath[row.id] || [];
    const avgProgress = courses.length
      ? Math.round(courses.reduce((s, c) => s + (c.progress || 0), 0) / courses.length)
      : Number(row.user_progress || 0);

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      category: row.category,
      difficulty: row.difficulty,
      estimated_duration: row.estimated_duration_hours,
      thumbnail: row.thumbnail_url,
      is_published: row.is_published,
      progress: avgProgress,
      is_enrolled: !!row.enrollment_status,
      enrollment_status: row.enrollment_status || null,
      started_at: row.started_at,
      completed_at: row.completed_at,
      last_accessed_at: row.last_accessed_at,
      courses
    };
  });
}

/**
 * Build a single path detail, returns null if not found.
 */
async function buildPathDetail(db, pathId, userId) {
  const paths = await fetchCuratedPaths(db, userId);
  return paths.find(p => String(p.id) === String(pathId) || String(p.slug) === String(pathId)) || null;
}

module.exports = learningPathsController;

