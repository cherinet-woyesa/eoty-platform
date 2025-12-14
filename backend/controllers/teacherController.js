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
      .leftJoin('user_lesson_progress as ulp', function() {
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
      query = query.where(function() {
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
      countQuery = countQuery.where(function() {
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
      .select('first_name', 'last_name', 'email', 'profile_picture', 'is_active')
      .first();
    
    if (!teacherProfile || !userInfo) {
      return res.status(404).json({ 
        success: false, 
        message: 'Teacher profile not found' 
      });
    }

    // Parse JSON fields
    const qualifications = teacherProfile.qualifications || [];
    const specializations = teacherProfile.specializations || [];
    const languagesTaught = teacherProfile.languages_taught || [];
    const socialMediaLinks = teacherProfile.social_media_links || {};
    const onboardingStatus = teacherProfile.onboarding_status || {};
    const verificationDocs = teacherProfile.verification_docs || {};

    // Format response for spiritual platform
    const formattedProfile = {
      // Basic Info
      id: teacherProfile.id,
      userId: teacherProfile.user_id,
      firstName: userInfo.first_name,
      lastName: userInfo.last_name,
      email: userInfo.email,
      isActive: userInfo.is_active,
      
      // Professional Profile
      bio: teacherProfile.bio || '',
      experienceYears: teacherProfile.experience_years || 0,
      profilePictureUrl: teacherProfile.profile_picture_url || userInfo.profile_picture,
      
      // Spiritual & Teaching Qualifications
      qualifications: qualifications.map(qual => ({
        type: qual.type || 'certification', // 'certification', 'degree', 'spiritual_training', 'ordination'
        title: qual.title || '',
        institution: qual.institution || '',
        year: qual.year || null,
        description: qual.description || '',
        documentUrl: qual.document_url || null
      })),
      
      // Specializations (spiritual focus areas)
      specializations: specializations.map(spec => ({
        area: spec.area || '',
        level: spec.level || 'intermediate', // 'beginner', 'intermediate', 'advanced', 'master'
        description: spec.description || '',
        yearsExperience: spec.years_experience || 0
      })),
      
      // Languages (for multilingual spiritual teaching)
      languagesTaught: languagesTaught.map(lang => ({
        language: lang.language || '',
        proficiency: lang.proficiency || 'fluent', // 'basic', 'intermediate', 'fluent', 'native'
        certification: lang.certification || null
      })),
      
      // Ministry/Spiritual Practice
      spiritualBackground: {
        tradition: teacherProfile.spiritual_tradition || '',
        denomination: teacherProfile.denomination || '',
        ordinationStatus: teacherProfile.ordination_status || null,
        ministryExperience: teacherProfile.ministry_experience || null
      },
      
      // Teaching Approach
      teachingApproach: {
        methodology: teacherProfile.teaching_methodology || '',
        targetAudience: teacherProfile.target_audience || [],
        classSize: teacherProfile.preferred_class_size || 'any',
        teachingStyle: teacherProfile.teaching_style || ''
      },
      
      // Social Media & Outreach
      socialMediaLinks: {
        website: socialMediaLinks.website || '',
        facebook: socialMediaLinks.facebook || '',
        youtube: socialMediaLinks.youtube || '',
        instagram: socialMediaLinks.instagram || '',
        podcast: socialMediaLinks.podcast || '',
        other: socialMediaLinks.other || {}
      },
      
      // Verification & Status
      status: teacherProfile.status,
      onboardingStatus: onboardingStatus,
      verificationDocs: verificationDocs,
      
      // Financial (payout info - only show status, not sensitive details)
      payoutInfo: {
        method: teacherProfile.payout_method || null,
        region: teacherProfile.payout_region || null,
        taxStatus: teacherProfile.tax_status || null,
        isComplete: !!(teacherProfile.payout_method && teacherProfile.payout_region)
      },
      
      // Timestamps
      createdAt: teacherProfile.created_at,
      updatedAt: teacherProfile.updated_at
    };

    res.status(200).json({ 
      success: true, 
      data: { teacherProfile: formattedProfile } 
    });
    
  } catch (error) {
    console.error('[Teacher Profile] Error fetching profile:', error);
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const updateData = req.body;
    
    console.log(`[Teacher Profile] Updating profile for user ID: ${userId}`);
    
    // Validate and structure the update data for spiritual platform
    const structuredUpdateData = {
      // Basic Profile
      bio: updateData.bio,
      experience_years: updateData.experienceYears,
      profile_picture_url: updateData.profilePictureUrl,
      
      // Spiritual Background
      spiritual_tradition: updateData.spiritualBackground?.tradition,
      denomination: updateData.spiritualBackground?.denomination,
      ordination_status: updateData.spiritualBackground?.ordinationStatus,
      ministry_experience: updateData.spiritualBackground?.ministryExperience,
      
      // Teaching Approach
      teaching_methodology: updateData.teachingApproach?.methodology,
      target_audience: updateData.teachingApproach?.targetAudience || [],
      preferred_class_size: updateData.teachingApproach?.classSize,
      teaching_style: updateData.teachingApproach?.teachingStyle,
      
      // Qualifications (format for storage)
      qualifications: updateData.qualifications?.map(qual => ({
        type: qual.type,
        title: qual.title,
        institution: qual.institution,
        year: qual.year,
        description: qual.description,
        document_url: qual.documentUrl
      })) || [],
      
      // Specializations
      specializations: updateData.specializations?.map(spec => ({
        area: spec.area,
        level: spec.level,
        description: spec.description,
        years_experience: spec.yearsExperience
      })) || [],
      
      // Languages
      languages_taught: updateData.languagesTaught?.map(lang => ({
        language: lang.language,
        proficiency: lang.proficiency,
        certification: lang.certification
      })) || [],
      
      // Social Media
      social_media_links: {
        website: updateData.socialMediaLinks?.website,
        facebook: updateData.socialMediaLinks?.facebook,
        youtube: updateData.socialMediaLinks?.youtube,
        instagram: updateData.socialMediaLinks?.instagram,
        podcast: updateData.socialMediaLinks?.podcast,
        other: updateData.socialMediaLinks?.other
      },
      
      // Onboarding and verification (if provided)
      onboardingStatus: updateData.onboardingStatus,
      verificationDocs: updateData.verificationDocs
    };
    
    // Remove undefined values
    Object.keys(structuredUpdateData).forEach(key => {
      if (structuredUpdateData[key] === undefined) {
        delete structuredUpdateData[key];
      }
    });
    
    const updatedProfile = await teacherService.updateProfileByUserId(userId, structuredUpdateData);
    
    // Return the formatted profile
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
    const document = await teacherService.uploadDocument(req.user.id, req.file, documentType);
    res.status(200).json({ success: true, data: { documentUrl: document.file_url } });
  } catch (error) {
    next(error);
  }
};

exports.getDocuments = async (req, res, next) => {
  try {
    const documents = await teacherService.getDocumentsByUserId(req.user.id);
    res.status(200).json({ success: true, data: { documents } });
  } catch (error) {
    next(error);
  }
};

exports.getDocumentById = async (req, res, next) => {
  try {
    const document = await teacherService.getDocumentById(req.user.id, req.params.id);
    res.status(200).json({ success: true, data: { document } });
  } catch (error) {
    next(error);
  }
};

exports.deleteDocument = async (req, res, next) => {
  try {
    await teacherService.deleteDocument(req.user.id, req.params.id);
    res.status(200).json({ success: true, message: 'Document deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

exports.getPayoutDetails = async (req, res, next) => {
  try {
    const payoutDetails = await teacherService.getPayoutDetailsByUserId(req.user.id);
    res.status(200).json({ success: true, data: { payoutDetails } });
  } catch (error) {
    next(error);
  }
};

exports.updatePayoutDetails = async (req, res, next) => {
  try {
    const updatedPayoutDetails = await teacherService.updatePayoutDetailsByUserId(req.user.id, req.body);
    res.status(200).json({ success: true, data: { payoutDetails: updatedPayoutDetails } });
  } catch (error) {
    next(error);
  }
};

// Get teacher statistics (students, courses, ratings, earnings)
exports.getTeacherStats = async (req, res) => {
  try {
    const teacherId = String(req.user.userId);
    
    const [
      totalStudents,
      totalCourses,
      ratingsData,
      earningsData
    ] = await Promise.all([
      // Total unique students
      db('user_course_enrollments as uce')
        .join('courses as c', 'uce.course_id', 'c.id')
        .where('c.created_by', teacherId)
        .countDistinct('uce.user_id as count')
        .first(),
      
      // Total courses
      db('courses')
        .where('created_by', teacherId)
        .count('id as count')
        .first(),
      
      // Ratings statistics
      db('course_ratings as cr')
        .join('courses as c', 'cr.course_id', 'c.id')
        .where('c.created_by', teacherId)
        .select(
          db.raw('AVG(cr.rating) as average_rating'),
          db.raw('COUNT(*) as total_ratings')
        )
        .first(),
      
      // Earnings data (if payments table exists)
      db.raw(`
        SELECT COALESCE(SUM(amount), 0) as total_earnings
        FROM payments
        WHERE teacher_id = ?
        AND status = 'completed'
      `, [teacherId])
        .then(result => result.rows[0])
        .catch(() => ({ total_earnings: 0 }))
    ]);

    // Update user stats in database
    await db('users')
      .where('id', teacherId)
      .update({
        total_students: parseInt(totalStudents.count, 10) || 0,
        total_courses: parseInt(totalCourses.count, 10) || 0,
        average_rating: ratingsData && ratingsData.average_rating ? parseFloat(ratingsData.average_rating) : null,
        total_ratings: ratingsData && ratingsData.total_ratings ? parseInt(ratingsData.total_ratings, 10) : 0,
        total_earnings: earningsData ? parseFloat(earningsData.total_earnings) : 0,
        updated_at: new Date()
      });

    res.json({
      success: true,
      data: {
        totalStudents: parseInt(totalStudents.count, 10) || 0,
        totalCourses: parseInt(totalCourses.count, 10) || 0,
        averageRating: ratingsData && ratingsData.average_rating ? parseFloat(ratingsData.average_rating).toFixed(2) : null,
        totalRatings: ratingsData && ratingsData.total_ratings ? parseInt(ratingsData.total_ratings, 10) : 0,
        totalEarnings: earningsData ? parseFloat(earningsData.total_earnings).toFixed(2) : '0.00'
      }
    });
  } catch (error) {
    console.error('Get teacher stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch teacher statistics' });
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