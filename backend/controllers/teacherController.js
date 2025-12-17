const db = require('../config/database');
const teacherService = require('../services/teacherService');

exports.getDashboard = async (req, res) => {
  try {
    const teacherId = String(req.user.userId);
    console.log(`Fetching dashboard data for teacher ID: ${teacherId}`);

    // Start timing for performance monitoring
    const startTime = Date.now();

    // Execute all queries in parallel for better performance
    const [
      totalCoursesResult,
      totalStudentsResult,
      totalLessonsResult,
      lessonsThisMonthResult,
      averageCompletionRateResult,
      ratingResult
    ] = await Promise.all([
      // Total courses created by the teacher
      db('courses')
        .where('created_by', teacherId)
        .count('id as count')
        .first(),

      // Total unique students enrolled in the teacher's courses
      db('user_course_enrollments as uce')
        .join('courses as c', 'uce.course_id', 'c.id')
        .where('c.created_by', teacherId)
        .countDistinct('uce.user_id as count')
        .first(),

      // Total lessons across all courses created by the teacher
      db('lessons as l')
        .join('courses as c', 'l.course_id', 'c.id')
        .where('c.created_by', teacherId)
        .count('l.id as count')
        .first(),

      // Lessons recorded this month (for progress on recording page)
      db('lessons as l')
        .join('courses as c', 'l.course_id', 'c.id')
        .where('c.created_by', teacherId)
        .andWhere('l.created_at', '>=', db.raw("DATE_TRUNC('month', NOW())"))
        .count('l.id as count')
        .first(),

      // Average completion rate of lessons across all students in the teacher's courses
      db('user_lesson_progress as ulp')
        .join('lessons as l', 'ulp.lesson_id', 'l.id')
        .join('courses as c', 'l.course_id', 'c.id')
        .where('c.created_by', teacherId)
        .avg('ulp.progress as average')
        .first(),

      // Average course rating across teacher's courses (if ratings exist)
      db('course_ratings as cr')
        .join('courses as c', 'cr.course_id', 'c.id')
        .where('c.created_by', teacherId)
        .avg('cr.rating as avg')
        .first()
        .catch(err => {
          console.warn('Failed to calculate averageCourseRating:', err.message);
          return { avg: 0 };
        })
    ]);

    const totalCourses = parseInt(totalCoursesResult.count, 10) || 0;
    const totalStudentsEnrolled = parseInt(totalStudentsResult.count, 10) || 0;
    const totalLessons = parseInt(totalLessonsResult.count, 10) || 0;
    const lessonsRecordedThisMonth = parseInt(lessonsThisMonthResult.count, 10) || 0;
    const averageCompletionRate = averageCompletionRateResult && averageCompletionRateResult.average ? Math.round(parseFloat(averageCompletionRateResult.average)) : 0;
    const averageCourseRating = ratingResult && ratingResult.avg ? parseFloat(ratingResult.avg).toFixed(1) : 0;

    // Calculate execution time
    const executionTime = Date.now() - startTime;
    console.log(`Dashboard data fetched in ${executionTime}ms for teacher ID: ${teacherId}`);

    res.json({
      success: true,
      data: {
        totalCourses,
        totalStudentsEnrolled,
        totalLessons,
        averageCompletionRate,
        lessonsRecordedThisMonth,
        averageCourseRating,
        teacherId,
      },
    });
  } catch (error) {
    console.error('Get teacher dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch teacher dashboard data' });
  }
};

// Get all students enrolled in teacher's courses
exports.getStudents = async (req, res) => {
  try {
    const teacherId = String(req.user.userId); // Ensure it's a string since user_id is text
    const { search, status, courseId, page = 1, limit = 50 } = req.query;

    console.log(`[Teacher Students] Fetching students for teacher ID: ${teacherId}`);

    // First, verify teacher has courses
    const teacherCourses = await db('courses')
      .where('created_by', teacherId)
      .select('id', 'title');

    console.log(`[Teacher Students] Teacher has ${teacherCourses.length} courses`);

    if (teacherCourses.length === 0) {
      return res.json({
        success: true,
        data: {
          students: [],
          pagination: {
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            total: 0,
            totalPages: 0
          }
        }
      });
    }

    // Base query: Get all students enrolled in teacher's courses
    // Join through lessons to get progress (user_lesson_progress has lesson_id, not course_id)
    let query = db('user_course_enrollments as uce')
      .join('courses as c', 'uce.course_id', 'c.id')
      .join('users as u', 'uce.user_id', 'u.id')
      .leftJoin('lessons as l', 'l.course_id', 'c.id')
      .leftJoin('user_lesson_progress as ulp', function () {
        this.on('ulp.user_id', '=', 'u.id')
          .andOn('ulp.lesson_id', '=', 'l.id');
      })
      .where('c.created_by', teacherId)
      .whereIn('u.role', ['user', 'student'])
      .groupBy('u.id', 'u.first_name', 'u.last_name', 'u.email', 'u.is_active', 'u.last_login_at', 'u.profile_picture')
      .select(
        'u.id',
        'u.first_name',
        'u.last_name',
        'u.email',
        'u.is_active',
        'u.last_login_at',
        'u.profile_picture',
        db.raw('COUNT(DISTINCT uce.course_id) as enrolled_courses'),
        db.raw('COALESCE(AVG(ulp.progress), 0) as avg_progress'),
        db.raw('MAX(ulp.updated_at) as last_progress_at')
      );

    // Apply filters
    if (search) {
      query = query.where(function () {
        this.where('u.first_name', 'ilike', `%${search}%`)
          .orWhere('u.last_name', 'ilike', `%${search}%`)
          .orWhere('u.email', 'ilike', `%${search}%`);
      });
    }

    if (status === 'active') {
      query = query.where('u.is_active', true);
    } else if (status === 'inactive') {
      query = query.where('u.is_active', false);
    }

    if (courseId) {
      query = query.where('uce.course_id', courseId);
    }

    // Get total count for pagination - need to count distinct users
    let countQuery = db('user_course_enrollments as uce')
      .join('courses as c', 'uce.course_id', 'c.id')
      .join('users as u', 'uce.user_id', 'u.id')
      .where('c.created_by', teacherId)
      .whereIn('u.role', ['user', 'student']);

    // Apply same filters to count query
    if (search) {
      countQuery = countQuery.where(function () {
        this.where('u.first_name', 'ilike', `%${search}%`)
          .orWhere('u.last_name', 'ilike', `%${search}%`)
          .orWhere('u.email', 'ilike', `%${search}%`);
      });
    }

    if (status === 'active') {
      countQuery = countQuery.where('u.is_active', true);
    } else if (status === 'inactive') {
      countQuery = countQuery.where('u.is_active', false);
    }

    if (courseId) {
      countQuery = countQuery.where('uce.course_id', courseId);
    }

    const totalResult = await countQuery.countDistinct('u.id as total').first();
    const total = parseInt(totalResult.total, 10);

    // Apply pagination
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    query = query.limit(parseInt(limit, 10)).offset(offset);

    // Order by last active
    query = query.orderBy('u.last_login_at', 'desc');

    const students = await query;

    console.log(`[Teacher Students] Found ${students.length} students`);

    // Format response
    const formattedStudents = students.map(student => ({
      id: student.id,
      firstName: student.first_name,
      lastName: student.last_name,
      email: student.email,
      isActive: student.is_active,
      lastActiveAt: student.last_login_at,
      profilePicture: student.profile_picture,
      enrolledCourses: parseInt(student.enrolled_courses, 10),
      avgProgress: Math.round(parseFloat(student.avg_progress) || 0),
      lastProgressAt: student.last_progress_at
    }));

    res.json({
      success: true,
      data: {
        students: formattedStudents,
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total,
          totalPages: Math.ceil(total / parseInt(limit, 10))
        }
      }
    });
  } catch (error) {
    console.error('Get teacher students error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch students',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


exports.getProfile = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    console.log(`[Teacher Profile] Fetching profile for user ID: ${userId}`);

    // Get teacher profile
    const teacherProfile = await teacherService.getProfileByUserId(userId);

    // Get user basic info
    const db = require('../config/database');
    const userInfo = await db('users')
      .where('id', userId)
      .select('first_name', 'last_name', 'email', 'is_active') // Removed profile_picture to avoid 500 if column missing
      .first();

    if (!teacherProfile || !userInfo) {
      return res.status(404).json({
        success: false,
        message: 'Teacher profile not found'
      });
    }

    // Helper to safely parse JSON or return original if already object
    const safeParse = (val, fallback) => {
      if (!val) return fallback;
      if (typeof val === 'object') return val;
      try {
        return JSON.parse(val);
      } catch (e) {
        console.warn('JSON parse error:', e);
        return fallback;
      }
    };

    const specializations = safeParse(teacherProfile.specializations, []);
    const socialMediaLinks = safeParse(teacherProfile.social_media_links, {});
    const onboardingStatus = safeParse(teacherProfile.onboarding_status, {});
    const verificationDocs = safeParse(teacherProfile.verification_docs, {});
    const availability = safeParse(teacherProfile.availability, {});
    const payoutDetails = safeParse(teacherProfile.payout_details, {});

    // Map specializations to simple subjects array if needed
    const subjects = array => {
      if (!Array.isArray(array)) return [];
      // If it's already an array of strings, return it
      if (typeof array[0] === 'string') return array;
      // If it's an array of objects (legacy/spiritual format), map to area name
      return array.map(item => item.area || item.label || JSON.stringify(item));
    };

    // Calculate or mock stats (since they might not be stored directly)
    const stats = {
      total_students: teacherProfile.total_students || 0,
      total_earnings: teacherProfile.total_earnings || 0,
      rating: teacherProfile.rating || 5.0,
      reviews_count: teacherProfile.reviews_count || 0,
      ...(typeof teacherProfile.stats === 'object' ? teacherProfile.stats : {})
    };

    // Format response matching frontend expectations
    const formattedProfile = {
      id: teacherProfile.id,
      userId: teacherProfile.user_id,
      bio: teacherProfile.bio || '',
      experience_years: teacherProfile.experience_years || 0,
      profile_picture: teacherProfile.profile_picture_url || userInfo.profile_picture,

      // Navigation/Display fields
      subjects: subjects(specializations),
      specializations: specializations, // Keep original for reference

      // Social
      linkedin_url: teacherProfile.linkedin_url || socialMediaLinks.linkedin || '',
      website_url: teacherProfile.website_url || socialMediaLinks.website || '',
      social_media_links: socialMediaLinks,

      // Settings & Status
      onboarding_status: onboardingStatus,
      verification_docs: verificationDocs,
      availability: availability,

      // Payout
      payout_method: teacherProfile.payout_method,
      payout_region: teacherProfile.payout_region,
      payout_details: payoutDetails,
      tax_status: teacherProfile.tax_status,

      // Dashboard Stats
      stats: stats
    };

    res.status(200).json({
      success: true,
      teacherProfile: formattedProfile
    });

  } catch (error) {
    console.error('[Teacher Profile] Error fetching profile:', error);
    // DEBUG: Check if table exists and return error details
    try {
        const db = require('../config/database');
        const hasTeachers = await db.schema.hasTable('teachers');
        const hasUsers = await db.schema.hasTable('users');

        // Self-healing: Create teachers table if missing
        if (!hasTeachers) {
            console.log('Self-healing: Creating teachers table...');
            await db.schema.createTable('teachers', function(table) {
                table.increments('id').primary();
                table.integer('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable().unique();
                table.text('bio');
                table.integer('experience_years').defaultTo(0);
                table.jsonb('qualifications').defaultTo('[]');
                table.jsonb('specializations').defaultTo('[]');
                table.jsonb('languages_taught').defaultTo('[]');
                table.string('profile_picture_url');
                table.jsonb('social_media_links').defaultTo('{}');
                table.enu('status', ['pending_verification', 'verified', 'active', 'inactive', 'suspended']).defaultTo('pending_verification');
                table.jsonb('onboarding_status').defaultTo('{}');
                table.jsonb('verification_docs').defaultTo('{}');
                table.string('payout_method');
                table.string('payout_region');
                table.jsonb('payout_details').defaultTo('{}');
                table.string('tax_status');
                table.timestamp('created_at').defaultTo(db.fn.now());
                table.timestamp('updated_at').defaultTo(db.fn.now());
            });
            
            // Retry getProfile
            return exports.getProfile(req, res, next);
        }

        return res.status(500).json({ 
            success: false, 
            message: 'Internal server error', 
            debug: { 
                error: error.message, 
                hasTeachers,
                hasUsers
            } 
        });
    } catch (e) {
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const updateData = req.body;

    console.log(`[Teacher Profile] Updating profile for user ID: ${userId}`);

    // Structure update data for backend service
    // We map frontend fields to backend schema
    const backendUpdateData = {
      bio: updateData.bio,
      experience_years: updateData.experienceYears,
      profile_picture_url: updateData.profile_picture || updateData.profilePictureUrl,

      // Handle subjects/specializations
      // If sending simple string array (from subject editor), save as specializations
      specializations: updateData.specializations || updateData.subjects,

      // Social
      linkedin_url: updateData.linkedin_url,
      website_url: updateData.website_url,
      social_media_links: {
        linkedin: updateData.linkedin_url,
        website: updateData.website_url,
        ...updateData.social_media_links
      },

      // Availability
      availability: updateData.availability,

      // Status & verification
      onboardingStatus: updateData.onboarding_status || updateData.onboardingStatus,
      verificationDocs: updateData.verification_docs || updateData.verificationDocs,

      // Payout (pass through to service)
      payoutMethod: updateData.payout_method,
      payoutRegion: updateData.payout_region,
      payoutDetails: updateData.payout_details,
      taxStatus: updateData.tax_status
    };

    // Remove undefined values
    Object.keys(backendUpdateData).forEach(key => {
      if (backendUpdateData[key] === undefined) {
        delete backendUpdateData[key];
      }
    });

    // Stringify complex objects that are stored as JSON strings in standard TEXT columns
    // (Note: teacherService might handle some of this, but we ensure consistency)
    if (backendUpdateData.availability && typeof backendUpdateData.availability === 'object') {
      backendUpdateData.availability = JSON.stringify(backendUpdateData.availability);
    }
    if (backendUpdateData.specializations && typeof backendUpdateData.specializations === 'object') {
      backendUpdateData.specializations = JSON.stringify(backendUpdateData.specializations);
    }
    if (backendUpdateData.social_media_links && typeof backendUpdateData.social_media_links === 'object') {
      backendUpdateData.social_media_links = JSON.stringify(backendUpdateData.social_media_links);
    }

    const updatedProfile = await teacherService.updateProfileByUserId(userId, backendUpdateData);

    // Return the updated profile using the same format as getProfile
    // To ensure consistency, we just call getProfile's logic or re-format
    // For simplicity, we trigger a fetch
    return exports.getProfile(req, res, next);

  } catch (error) {
    console.error('[Teacher Profile] Error updating profile:', error);
    next(error);
  }
};

exports.uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }
    const { documentType } = req.body;
    const document = await teacherService.uploadDocument(req.user.userId, req.file, documentType);
    res.status(200).json({ success: true, data: { documentUrl: document.file_url } });
  } catch (error) {
    next(error);
  }
};

exports.getDocuments = async (req, res, next) => {
  try {
    const documents = await teacherService.getDocumentsByUserId(req.user.userId);
    res.status(200).json({ success: true, data: { documents } });
  } catch (error) {
    next(error);
  }
};

exports.getDocumentById = async (req, res, next) => {
  try {
    const document = await teacherService.getDocumentById(req.user.userId, req.params.id);
    res.status(200).json({ success: true, data: { document } });
  } catch (error) {
    next(error);
  }
};

exports.deleteDocument = async (req, res, next) => {
  try {
    await teacherService.deleteDocument(req.user.userId, req.params.id);
    res.status(200).json({ success: true, message: 'Document deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

exports.getPayoutDetails = async (req, res, next) => {
  try {
    const payoutDetails = await teacherService.getPayoutDetailsByUserId(req.user.userId);
    res.status(200).json({ success: true, data: { payoutDetails } });
  } catch (error) {
    next(error);
  }
};

exports.updatePayoutDetails = async (req, res, next) => {
  try {
    const updatedPayoutDetails = await teacherService.updatePayoutDetailsByUserId(req.user.userId, req.body);
    res.status(200).json({ success: true, data: { payoutDetails: updatedPayoutDetails } });
  } catch (error) {
    next(error);
  }
};

// Get teacher statistics (students, courses, ratings, earnings)
exports.getTeacherStats = async (req, res) => {
  try {
    const teacherId = String(req.user.userId);
    console.log(`Fetching comprehensive teacher stats for teacher ID: ${teacherId}`);

    // Get detailed statistics in parallel
    const [
      overviewResult,
      engagementResult,
      monthlyActivityResult,
      topCoursesResult,
      recentActivityResult,
      earningsResult
    ] = await Promise.all([
      // Overview metrics
      db('courses as c')
        .leftJoin('user_course_enrollments as uce', 'c.id', 'uce.course_id')
        .leftJoin('course_ratings as cr', 'c.id', 'cr.course_id')
        .where('c.created_by', teacherId)
        .select(
          db.raw('COUNT(DISTINCT c.id) as total_courses'),
          db.raw('COUNT(DISTINCT uce.user_id) as total_students'),
          db.raw('COUNT(CASE WHEN uce.enrollment_status = \'completed\' THEN 1 END) as completed_enrollments'),
          db.raw('AVG(uce.progress) as avg_completion_rate'),
          db.raw('AVG(cr.rating) as avg_course_rating'),
          db.raw('COUNT(DISTINCT cr.id) as total_ratings'),
          db.raw('COUNT(CASE WHEN uce.enrolled_at >= NOW() - INTERVAL \'30 days\' THEN 1 END) as recent_enrollments'),
          db.raw('COUNT(CASE WHEN c.created_at >= NOW() - INTERVAL \'30 days\' THEN 1 END) as recent_courses')
        )
        .first(),

      // Engagement metrics
      db('user_lesson_progress as ulp')
        .join('lessons as l', 'ulp.lesson_id', 'l.id')
        .join('courses as c', 'l.course_id', 'c.id')
        .where('c.created_by', teacherId)
        .select(
          db.raw('COUNT(DISTINCT ulp.user_id) as active_students'),
          db.raw('AVG(ulp.progress) as avg_lesson_completion'),
          db.raw('SUM(ulp.progress) as total_watch_time'),
          db.raw('COUNT(CASE WHEN ulp.completed_at IS NOT NULL THEN 1 END) as completed_lessons'),
          db.raw('COUNT(CASE WHEN ulp.created_at >= NOW() - INTERVAL \'7 days\' THEN 1 END) as weekly_engagement'),
          db.raw('COUNT(CASE WHEN ulp.created_at >= NOW() - INTERVAL \'30 days\' THEN 1 END) as monthly_engagement')
        )
        .first(),

      // Monthly activity (last 6 months)
      db('user_course_enrollments as uce')
        .join('courses as c', 'uce.course_id', 'c.id')
        .where('c.created_by', teacherId)
        .where('uce.enrolled_at', '>=', db.raw("NOW() - INTERVAL '6 months'"))
        .select(
          db.raw("DATE_TRUNC('month', uce.enrolled_at) as month"),
          db.raw('COUNT(*) as enrollments'),
          db.raw('COUNT(CASE WHEN uce.enrollment_status = \'completed\' THEN 1 END) as completions')
        )
        .groupBy(db.raw("DATE_TRUNC('month', uce.enrolled_at)"))
        .orderBy('month', 'desc'),

      // Top performing courses
      db('courses as c')
        .leftJoin('user_course_enrollments as uce', 'c.id', 'uce.course_id')
        .leftJoin('course_ratings as cr', 'c.id', 'cr.course_id')
        .where('c.created_by', teacherId)
        .select(
          'c.id',
          'c.title',
          'c.created_at',
          'c.cover_image',
          db.raw('COUNT(DISTINCT uce.user_id) as student_count'),
          db.raw('AVG(uce.progress) as avg_completion'),
          db.raw('COUNT(CASE WHEN uce.enrollment_status = \'completed\' THEN 1 END) as completions'),
          db.raw('AVG(cr.rating) as avg_rating'),
          db.raw('COUNT(DISTINCT cr.id) as review_count')
        )
        .groupBy('c.id', 'c.title', 'c.created_at', 'c.cover_image')
        .orderBy('student_count', 'desc')
        .limit(5),

      // Recent activity (last 30 days)
      db.select(
        db.raw(`
          'enrollment' as type,
          uce.enrolled_at as date,
          CONCAT(u.first_name, ' ', u.last_name) as description,
          c.title as course_title,
          uce.user_id as student_id
        `)
      )
        .from('user_course_enrollments as uce')
        .join('courses as c', 'uce.course_id', 'c.id')
        .join('users as u', 'uce.user_id', 'u.id')
        .where('c.created_by', teacherId)
        .where('uce.enrolled_at', '>=', db.raw("NOW() - INTERVAL '30 days'"))
        .union([
          db.select(
            db.raw(`
            'completion' as type,
            uce.completed_at as date,
            CONCAT(u.first_name, ' ', u.last_name) as description,
            c.title as course_title,
            uce.user_id as student_id
          `)
          )
            .from('user_course_enrollments as uce')
            .join('courses as c', 'uce.course_id', 'c.id')
            .join('users as u', 'uce.user_id', 'u.id')
            .where('c.created_by', teacherId)
            .where('uce.completed_at', '>=', db.raw("NOW() - INTERVAL '30 days'"))
            .whereNotNull('uce.completed_at')
        ])
        .orderBy('date', 'desc')
        .limit(10),

      // Earnings data (placeholder for now)
      db.select(
        db.raw('0 as total_earnings'),
        db.raw('0 as monthly_earnings'),
        db.raw('0 as pending_payments')
      )
    ]);

    // Calculate growth metrics
    const currentMonth = monthlyActivityResult.find(m => {
      const monthDate = new Date(m.month);
      const now = new Date();
      return monthDate.getMonth() === now.getMonth() && monthDate.getFullYear() === now.getFullYear();
    });

    const lastMonth = monthlyActivityResult.find(m => {
      const monthDate = new Date(m.month);
      const now = new Date();
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1);
      return monthDate.getMonth() === lastMonthDate.getMonth() && monthDate.getFullYear() === lastMonthDate.getFullYear();
    });

    const enrollmentGrowth = lastMonth && lastMonth.enrollments > 0
      ? (((currentMonth?.enrollments || 0) - lastMonth.enrollments) / lastMonth.enrollments) * 100
      : 0;

    const completionGrowth = lastMonth && lastMonth.completions > 0
      ? (((currentMonth?.completions || 0) - lastMonth.completions) / lastMonth.completions) * 100
      : 0;

    // Update user stats in database for caching
    await db('users')
      .where('id', teacherId)
      .update({
        total_students: parseInt(overviewResult?.total_students || 0),
        total_courses: parseInt(overviewResult?.total_courses || 0),
        average_rating: overviewResult?.avg_course_rating ? parseFloat(overviewResult.avg_course_rating) : null,
        total_ratings: parseInt(overviewResult?.total_ratings || 0),
        total_earnings: 0, // Placeholder
        updated_at: new Date()
      });

    const stats = {
      overview: {
        totalCourses: parseInt(overviewResult?.total_courses || 0),
        totalStudents: parseInt(overviewResult?.total_students || 0),
        totalEnrollments: parseInt(overviewResult?.completed_enrollments || 0),
        averageCompletionRate: Math.round(parseFloat(overviewResult?.avg_completion_rate || 0)),
        averageRating: overviewResult?.avg_course_rating ? parseFloat(overviewResult.avg_course_rating).toFixed(1) : null,
        totalRatings: parseInt(overviewResult?.total_ratings || 0),
        recentEnrollments: parseInt(overviewResult?.recent_enrollments || 0),
        recentCourses: parseInt(overviewResult?.recent_courses || 0),
        enrollmentGrowth: Math.round(enrollmentGrowth),
        completionGrowth: Math.round(completionGrowth)
      },
      engagement: {
        activeStudents: parseInt(engagementResult?.active_students || 0),
        averageLessonCompletion: Math.round(parseFloat(engagementResult?.avg_lesson_completion || 0)),
        totalWatchTime: parseInt(engagementResult?.total_watch_time || 0),
        completedLessons: parseInt(engagementResult?.completed_lessons || 0),
        weeklyEngagement: parseInt(engagementResult?.weekly_engagement || 0),
        monthlyEngagement: parseInt(engagementResult?.monthly_engagement || 0)
      },
      trends: {
        monthlyActivity: monthlyActivityResult.map(m => ({
          month: new Date(m.month).toISOString().slice(0, 7), // YYYY-MM format
          enrollments: parseInt(m.enrollments),
          completions: parseInt(m.completions)
        })),
        topCourses: topCoursesResult.map(c => ({
          id: c.id,
          title: c.title,
          coverImage: c.cover_image,
          studentCount: parseInt(c.student_count),
          avgCompletion: Math.round(parseFloat(c.avg_completion || 0)),
          completions: parseInt(c.completions),
          avgRating: c.avg_rating ? parseFloat(c.avg_rating).toFixed(1) : null,
          reviewCount: parseInt(c.review_count)
        }))
      },
      recentActivity: recentActivityResult.map(a => ({
        type: a.type,
        date: a.date,
        description: a.description,
        courseTitle: a.course_title,
        studentId: a.student_id
      })),
      earnings: {
        totalEarnings: parseFloat(earningsResult[0]?.total_earnings || 0),
        monthlyEarnings: parseFloat(earningsResult[0]?.monthly_earnings || 0),
        pendingPayments: parseFloat(earningsResult[0]?.pending_payments || 0)
      }
    };

    console.log(`Comprehensive teacher stats fetched successfully for teacher ID: ${teacherId}`);
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get teacher comprehensive stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teacher statistics'
    });
  }
};

// Get earnings analytics
exports.getEarningsAnalytics = async (req, res) => {
  try {
    const teacherId = String(req.user.userId);
    const { period = 'month' } = req.query; // 'week', 'month', 'year', 'all'

    let dateFilter = '';
    switch (period) {
      case 'week':
        dateFilter = "AND created_at >= NOW() - INTERVAL '7 days'";
        break;
      case 'month':
        dateFilter = "AND created_at >= NOW() - INTERVAL '30 days'";
        break;
      case 'year':
        dateFilter = "AND created_at >= NOW() - INTERVAL '365 days'";
        break;
      default:
        dateFilter = '';
    }

    const earningsData = await db.raw(`
      SELECT 
        COALESCE(SUM(amount), 0) as total,
        COUNT(*) as transaction_count,
        AVG(amount) as average_transaction
      FROM payments
      WHERE teacher_id = ?
      AND status = 'completed'
      ${dateFilter}
    `, [teacherId])
      .then(result => result.rows[0])
      .catch(() => ({ total: 0, transaction_count: 0, average_transaction: 0 }));

    res.json({
      success: true,
      data: {
        period,
        totalEarnings: parseFloat(earningsData.total || 0).toFixed(2),
        transactionCount: parseInt(earningsData.transaction_count, 10) || 0,
        averageTransaction: parseFloat(earningsData.average_transaction || 0).toFixed(2)
      }
    });
  } catch (error) {
    console.error('Get earnings analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch earnings analytics' });
  }
};

// Recent teacher activity for dashboard
exports.getRecentActivity = async (req, res) => {
  try {
    const teacherId = String(req.user.userId);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const offset = (page - 1) * limit;

    // Recent courses created
    const courseActivity = await db('courses')
      .where('created_by', teacherId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .select(
        'id as entity_id',
        'title',
        'created_at as timestamp',
        db.raw(`'course_created' as type`)
      );

    // Recent lessons created
    const lessonActivity = await db('lessons as l')
      .join('courses as c', 'l.course_id', 'c.id')
      .where('c.created_by', teacherId)
      .orderBy('l.created_at', 'desc')
      .limit(limit)
      .select(
        'l.id as entity_id',
        'l.title',
        'l.created_at as timestamp',
        db.raw(`'lesson_uploaded' as type`),
        'c.title as course_title'
      );

    // Recent enrollments into teacher courses
    const enrollmentActivity = await db('user_course_enrollments as uce')
      .join('courses as c', 'uce.course_id', 'c.id')
      .join('users as u', 'uce.user_id', 'u.id')
      .where('c.created_by', teacherId)
      .orderBy('uce.enrolled_at', 'desc')
      .limit(limit)
      .select(
        'uce.course_id as entity_id',
        db.raw("CONCAT(u.first_name, ' ', u.last_name) as title"),
        'uce.enrolled_at as timestamp',
        db.raw(`'student_enrolled' as type`),
        'c.title as course_title'
      );

    // Recent assignment submissions (if table exists)
    let assignmentActivity = [];
    try {
      assignmentActivity = await db('assignment_submissions as s')
        .join('assignments as a', 's.assignment_id', 'a.id')
        .join('courses as c', 'a.course_id', 'c.id')
        .join('users as u', 's.student_id', 'u.id')
        .where('c.created_by', teacherId)
        .orderBy('s.submitted_at', 'desc')
        .limit(limit)
        .select(
          'a.id as entity_id',
          'a.title',
          's.submitted_at as timestamp',
          db.raw(`'assignment_submitted' as type`),
          'c.title as course_title',
          db.raw("CONCAT(u.first_name, ' ', u.last_name) as student_name")
        );
    } catch (err) {
      console.warn('Skipping assignment activity (table missing):', err.message);
    }

    const combined = [
      ...courseActivity,
      ...lessonActivity,
      ...enrollmentActivity,
      ...assignmentActivity
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const paged = combined.slice(offset, offset + limit);

    res.json({
      success: true,
      data: {
        activities: paged,
        pagination: {
          page,
          limit,
          total: combined.length,
          pages: Math.ceil(combined.length / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch activity' });
  }
};

// Upcoming tasks for teacher (based on assignments due soon)
exports.getUpcomingTasks = async (req, res) => {
  try {
    const teacherId = String(req.user.userId);
    const now = new Date();
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const offset = (page - 1) * limit;

    // Pull assignments tied to teacher courses
    let assignments = [];
    try {
      assignments = await db('assignments as a')
        .join('courses as c', 'a.course_id', 'c.id')
        .where('c.created_by', teacherId)
        .whereNot('a.status', 'archived')
        .orderBy('a.due_date', 'asc')
        .limit(limit)
        .select(
          'a.id',
          'a.title',
          'a.description',
          'a.due_date',
          'a.status',
          'a.created_at',
          'a.course_id',
          'c.title as course_title'
        );
    } catch (err) {
      console.warn('Skipping assignments in tasks (table missing):', err.message);
    }

    // Map to task DTO
    const tasks = assignments.map((a) => {
      const due = a.due_date ? new Date(a.due_date) : null;
      const daysLeft = due ? Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
      let priority = 'medium';
      if (daysLeft !== null) {
        if (daysLeft <= 2) priority = 'high';
        else if (daysLeft <= 7) priority = 'medium';
        else priority = 'low';
      }
      return {
        id: String(a.id),
        type: 'assignment',
        title: a.title,
        description: a.description,
        dueDate: a.due_date,
        priority,
        course: a.course_title,
        courseId: a.course_id,
        completed: a.status === 'graded',
        createdAt: a.created_at,
        tags: [],
        attachments: 0
      };
    });

    const total = tasks.length;
    const paged = tasks.slice(offset, offset + limit);

    res.json({
      success: true,
      data: {
        tasks: paged,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get upcoming tasks error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tasks' });
  }
};

// Export recent activity as CSV
exports.exportActivity = async (req, res) => {
  try {
    const teacherId = String(req.user.userId);
    const limit = Math.min(parseInt(req.query.limit, 10) || 500, 2000);
    const format = (req.query.format || 'csv').toLowerCase();

    // Reuse recent activity aggregation
    req.query.page = 1;
    req.query.limit = limit;
    const fakeRes = {
      json(payload) {
        this.payload = payload;
      }
    };
    await exports.getRecentActivity(req, fakeRes);
    const activities = fakeRes.payload?.data?.activities || [];

    const rows = [
      ['type', 'title', 'course', 'timestamp'],
      ...activities.map(a => [
        a.type,
        a.title?.replace(/,/g, ';') || '',
        a.course_title?.replace(/,/g, ';') || '',
        new Date(a.timestamp).toISOString()
      ])
    ];

    const csv = rows.map(r => r.join(',')).join('\n');

    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="activity.pdf"');
      // Minimal text-based PDF content (simple fallback)
      const text = rows.map(r => r.join(' | ')).join('\n');
      res.send(text);
    } else {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="activity.csv"');
      res.send(csv);
    }
  } catch (error) {
    console.error('Export activity error:', error);
    res.status(500).json({ success: false, message: 'Failed to export activity' });
  }
};

// Export tasks as CSV
exports.exportTasks = async (req, res) => {
  try {
    const teacherId = String(req.user.userId);
    const limit = Math.min(parseInt(req.query.limit, 10) || 500, 2000);
    const format = (req.query.format || 'csv').toLowerCase();
    const now = new Date();

    let assignments = [];
    try {
      assignments = await db('assignments as a')
        .join('courses as c', 'a.course_id', 'c.id')
        .where('c.created_by', teacherId)
        .whereNot('a.status', 'archived')
        .orderBy('a.due_date', 'asc')
        .limit(limit)
        .select(
          'a.id',
          'a.title',
          'a.description',
          'a.due_date',
          'a.status',
          'a.created_at',
          'a.course_id',
          'c.title as course_title'
        );
    } catch (err) {
      console.warn('Skipping assignments in export (table missing):', err.message);
    }

    const tasks = assignments.map((a) => {
      const due = a.due_date ? new Date(a.due_date) : null;
      const daysLeft = due ? Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
      let priority = 'medium';
      if (daysLeft !== null) {
        if (daysLeft <= 2) priority = 'high';
        else if (daysLeft <= 7) priority = 'medium';
        else priority = 'low';
      }
      return {
        id: String(a.id),
        type: 'assignment',
        title: a.title,
        description: a.description,
        dueDate: a.due_date,
        priority,
        course: a.course_title,
        courseId: a.course_id,
        completed: a.status === 'graded',
        createdAt: a.created_at
      };
    });

    const rows = [
      ['id', 'type', 'title', 'course', 'dueDate', 'priority', 'completed', 'createdAt'],
      ...tasks.map(t => [
        t.id,
        t.type,
        (t.title || '').replace(/,/g, ';'),
        (t.course || '').replace(/,/g, ';'),
        t.dueDate ? new Date(t.dueDate).toISOString() : '',
        t.priority,
        t.completed ? 'true' : 'false',
        t.createdAt ? new Date(t.createdAt).toISOString() : ''
      ])
    ];

    const csv = rows.map(r => r.join(',')).join('\n');

    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="tasks.pdf"');
      const text = rows.map(r => r.join(' | ')).join('\n');
      res.send(text);
    } else {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="tasks.csv"');
      res.send(csv);
    }
  } catch (error) {
    console.error('Export tasks error:', error);
    res.status(500).json({ success: false, message: 'Failed to export tasks' });
  }
};

// Get student analytics
exports.getStudentAnalytics = async (req, res) => {
  try {
    const teacherId = String(req.user.userId);

    const studentData = await db.raw(`
      SELECT 
        COUNT(DISTINCT uce.user_id) as total_students,
        COUNT(DISTINCT CASE WHEN u.last_login_at >= NOW() - INTERVAL '7 days' THEN u.id END) as active_students,
        AVG(ulp.progress) as avg_completion_rate
      FROM user_course_enrollments uce
      JOIN courses c ON uce.course_id = c.id
      JOIN users u ON uce.user_id = u.id
      LEFT JOIN lessons l ON l.course_id = c.id
      LEFT JOIN user_lesson_progress ulp ON ulp.user_id = u.id AND ulp.lesson_id = l.id
      WHERE c.created_by = ?
    `, [teacherId])
      .then(result => result.rows[0]);

    res.json({
      success: true,
      data: {
        totalStudents: parseInt(studentData.total_students, 10) || 0,
        activeStudents: parseInt(studentData.active_students, 10) || 0,
        avgCompletionRate: Math.round(parseFloat(studentData.avg_completion_rate || 0))
      }
    });
  } catch (error) {
    console.error('Get student analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch student analytics' });
  }
};

// Update social links
exports.updateSocialLinks = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { website_url, twitter_url, linkedin_url, facebook_url, instagram_url } = req.body;

    await db('users')
      .where('id', userId)
      .update({
        website_url,
        twitter_url,
        linkedin_url,
        facebook_url,
        instagram_url,
        updated_at: new Date()
      });

    const updated = await db('users')
      .where('id', userId)
      .select('website_url', 'twitter_url', 'linkedin_url', 'facebook_url', 'instagram_url')
      .first();

    res.json({
      success: true,
      data: { socialLinks: updated }
    });
  } catch (error) {
    console.error('Update social links error:', error);
    res.status(500).json({ success: false, message: 'Failed to update social links' });
  }
};

// Add certification
exports.addCertification = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { title, institution, year, description } = req.body;
    let documentUrl = null;

    if (req.file) {
      // File upload handled by multer middleware
      documentUrl = req.file.path || req.file.location;
    }

    const user = await db('users').where('id', userId).first();
    let certifications = [];

    try {
      certifications = user.certifications ? JSON.parse(user.certifications) : [];
    } catch (e) {
      certifications = Array.isArray(user.certifications) ? user.certifications : [];
    }

    const newCert = {
      id: Date.now(),
      title,
      institution,
      year,
      description,
      documentUrl,
      createdAt: new Date().toISOString()
    };

    certifications.push(newCert);

    await db('users')
      .where('id', userId)
      .update({
        certifications: JSON.stringify(certifications),
        updated_at: new Date()
      });

    res.json({
      success: true,
      data: { certification: newCert }
    });
  } catch (error) {
    console.error('Add certification error:', error);
    res.status(500).json({ success: false, message: 'Failed to add certification' });
  }
};

// Delete certification
exports.deleteCertification = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const user = await db('users').where('id', userId).first();
    let certifications = [];

    try {
      certifications = user.certifications ? JSON.parse(user.certifications) : [];
    } catch (e) {
      certifications = Array.isArray(user.certifications) ? user.certifications : [];
    }

    certifications = certifications.filter(cert => cert.id !== parseInt(id, 10));

    await db('users')
      .where('id', userId)
      .update({
        certifications: JSON.stringify(certifications),
        updated_at: new Date()
      });

    res.json({
      success: true,
      message: 'Certification deleted successfully'
    });
  } catch (error) {
    console.error('Delete certification error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete certification' });
  }
};

// Get certifications
exports.getCertifications = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await db('users').where('id', userId).select('certifications').first();
    let certifications = [];

    try {
      certifications = user.certifications ? JSON.parse(user.certifications) : [];
    } catch (e) {
      certifications = Array.isArray(user.certifications) ? user.certifications : [];
    }

    res.json({
      success: true,
      data: { certifications }
    });
  } catch (error) {
    console.error('Get certifications error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch certifications' });
  }
};

module.exports = exports;