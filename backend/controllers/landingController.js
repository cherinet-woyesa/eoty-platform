const db = require('../config/database');

const landingController = {
  // Get public landing page statistics
  async getStats(req, res) {
    try {
      // Get total active students
      const totalStudents = await db('users')
        .where({ role: 'student', is_active: true })
        .count('id as count')
        .first();

      // Get total published courses
      const totalCourses = await db('courses')
        .where({ is_published: true })
        .count('id as count')
        .first();

      // Get total active users (all roles)
      const totalUsers = await db('users')
        .where({ is_active: true })
        .count('id as count')
        .first();

      // Calculate satisfaction rate from course ratings
      const ratingStats = await db('course_ratings')
        .avg('rating as avg_rating')
        .count('id as total_ratings')
        .first();

      const avgRating = parseFloat(ratingStats?.avg_rating || 0);
      const satisfactionRate = Math.round((avgRating / 5) * 100);

      res.json({
        success: true,
        data: {
          totalStudents: parseInt(totalStudents?.count || 0),
          totalCourses: parseInt(totalCourses?.count || 0),
          totalUsers: parseInt(totalUsers?.count || 0),
          satisfactionRate: satisfactionRate || 98
        }
      });
    } catch (error) {
      console.error('Get landing stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch landing page statistics'
      });
    }
  },

  // Get featured courses for landing page
  async getFeaturedCourses(req, res) {
    try {
      const featuredCourses = await db('courses as c')
        .leftJoin('course_stats as cs', 'c.id', 'cs.course_id')
        .leftJoin('users as u', 'c.created_by', 'u.id')
        .where('c.is_published', true)
        .orderBy('cs.enrollment_count', 'desc')
        .orderBy('cs.average_rating', 'desc')
        .limit(4)
        .select(
          'c.id',
          'c.title',
          'c.description',
          'c.cover_image',
          'c.category',
          'c.level',
          db.raw('COALESCE(cs.enrollment_count, 0) as student_count'),
          db.raw('COALESCE(cs.average_rating, 0) as rating'),
          db.raw('COALESCE(cs.rating_count, 0) as rating_count'),
          db.raw("CONCAT(u.first_name, ' ', u.last_name) as instructor_name")
        );

      res.json({
        success: true,
        data: {
          courses: featuredCourses.map(course => ({
            id: course.id,
            title: course.title,
            description: course.description,
            coverImage: course.cover_image,
            category: course.category,
            level: course.level,
            studentCount: parseInt(course.student_count || 0),
            rating: parseFloat(course.rating || 0),
            ratingCount: parseInt(course.rating_count || 0),
            instructor: course.instructor_name
          }))
        }
      });
    } catch (error) {
      console.error('Get featured courses error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch featured courses'
      });
    }
  },

  // Get testimonials/reviews for landing page
  async getTestimonials(req, res) {
    try {
      const testimonials = await db('course_ratings as cr')
        .join('users as u', 'cr.user_id', 'u.id')
        .join('courses as c', 'cr.course_id', 'c.id')
        .whereNotNull('cr.review')
        .where('cr.review', '!=', '')
        .where('c.is_published', true)
        .orderBy('cr.created_at', 'desc')
        .limit(6)
        .select(
          'cr.id',
          'cr.rating',
          'cr.review',
          'cr.created_at',
          'u.first_name',
          'u.last_name',
          'u.profile_picture',
          'c.title as course_title'
        );

      res.json({
        success: true,
        data: {
          testimonials: testimonials.map(testimonial => ({
            id: testimonial.id,
            rating: testimonial.rating,
            review: testimonial.review,
            author: `${testimonial.first_name} ${testimonial.last_name}`,
            profilePicture: testimonial.profile_picture,
            courseTitle: testimonial.course_title,
            date: testimonial.created_at
          }))
        }
      });
    } catch (error) {
      console.error('Get testimonials error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch testimonials'
      });
    }
  }
};

module.exports = landingController;

