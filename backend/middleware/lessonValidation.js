// backend/middleware/lessonValidation.js
const db = require('../config/database');

/**
 * Validate lesson data for create/update operations
 */
const validateLessonData = (req, res, next) => {
  const { title, description, order, duration } = req.body;
  const errors = {};

  // Title validation
  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim() === '') {
      errors.title = 'Lesson title is required and must be a non-empty string';
    } else if (title.length < 3) {
      errors.title = 'Lesson title must be at least 3 characters long';
    } else if (title.length > 200) {
      errors.title = 'Lesson title must be less than 200 characters';
    }
  }

  // Description validation (optional)
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      errors.description = 'Lesson description must be a string';
    } else if (description.length > 5000) {
      errors.description = 'Lesson description must be less than 5000 characters';
    }
  }

  // Order validation (optional)
  if (order !== undefined && order !== null) {
    const orderNum = parseInt(order);
    if (isNaN(orderNum) || orderNum < 0) {
      errors.order = 'Lesson order must be a non-negative number';
    }
  }

  // Duration validation (optional)
  if (duration !== undefined && duration !== null) {
    const durationNum = parseInt(duration);
    if (isNaN(durationNum) || durationNum < 0) {
      errors.duration = 'Lesson duration must be a non-negative number';
    }
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Lesson validation failed',
      errors
    });
  }

  next();
};

/**
 * Validate lesson reorder data
 */
const validateReorderData = (req, res, next) => {
  const { lessons } = req.body;
  const errors = {};

  if (!lessons || !Array.isArray(lessons)) {
    errors.lessons = 'Lessons array is required';
  } else if (lessons.length === 0) {
    errors.lessons = 'Lessons array cannot be empty';
  } else {
    // Validate each lesson in the array
    const invalidLessons = [];
    lessons.forEach((lesson, index) => {
      if (!lesson.id || typeof lesson.id !== 'number') {
        invalidLessons.push(`Lesson at index ${index} missing valid id`);
      }
      if (lesson.order === undefined || typeof lesson.order !== 'number' || lesson.order < 0) {
        invalidLessons.push(`Lesson at index ${index} missing valid order`);
      }
    });

    if (invalidLessons.length > 0) {
      errors.lessons = invalidLessons;
    }
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Reorder validation failed',
      errors
    });
  }

  next();
};

/**
 * Check if user has permission to modify a lesson
 * Verifies that the user owns the course that the lesson belongs to
 */
const checkLessonOwnership = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { lessonId, courseId } = req.params;

    // Admins can modify any lesson
    if (userRole === 'chapter_admin' || userRole === 'admin') {
      return next();
    }

    let lesson;
    
    if (lessonId) {
      // Get lesson with course info
      lesson = await db('lessons as l')
        .join('courses as c', 'l.course_id', 'c.id')
        .where('l.id', lessonId)
        .select('l.*', 'c.created_by as course_owner')
        .first();

      if (!lesson) {
        return res.status(404).json({
          success: false,
          message: 'Lesson not found'
        });
      }

      // Check if user owns the course
      if (lesson.course_owner !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to modify this lesson'
        });
      }
    } else if (courseId) {
      // For reorder operations, check course ownership
      const course = await db('courses')
        .where({ id: courseId })
        .first();

      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      if (course.created_by !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to modify lessons in this course'
        });
      }
    }

    next();
  } catch (error) {
    console.error('Check lesson ownership error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify lesson permissions'
    });
  }
};

module.exports = {
  validateLessonData,
  validateReorderData,
  checkLessonOwnership
};
