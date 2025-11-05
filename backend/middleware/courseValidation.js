const validateCourseData = (req, res, next) => {
  const { title, category, level } = req.body;
  const errors = {};

  // Validate title
  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      errors.title = 'Title is required';
    } else if (title.length < 3) {
      errors.title = 'Title must be at least 3 characters';
    } else if (title.length > 200) {
      errors.title = 'Title must be less than 200 characters';
    }
  }

  // Validate category
  const validCategories = ['faith', 'history', 'spiritual', 'bible', 'liturgical', 'youth'];
  if (category !== undefined && category !== null && category !== '') {
    if (!validCategories.includes(category)) {
      errors.category = `Category must be one of: ${validCategories.join(', ')}`;
    }
  }

  // Validate level
  const validLevels = ['beginner', 'intermediate', 'advanced'];
  if (level !== undefined && level !== null && level !== '') {
    if (!validLevels.includes(level)) {
      errors.level = `Level must be one of: ${validLevels.join(', ')}`;
    }
  }

  // If there are validation errors, return them
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid course data',
        details: errors
      }
    });
  }

  next();
};

const validateBulkAction = (req, res, next) => {
  const { action, courseIds } = req.body;
  const errors = {};

  // Validate action
  const validActions = ['publish', 'unpublish', 'delete', 'archive', 'unarchive'];
  if (!action) {
    errors.action = 'Action is required';
  } else if (!validActions.includes(action)) {
    errors.action = `Action must be one of: ${validActions.join(', ')}`;
  }

  // Validate courseIds
  if (!courseIds || !Array.isArray(courseIds)) {
    errors.courseIds = 'courseIds must be an array';
  } else if (courseIds.length === 0) {
    errors.courseIds = 'At least one course ID is required';
  } else if (courseIds.length > 50) {
    errors.courseIds = 'Cannot process more than 50 courses at once';
  } else if (!courseIds.every(id => Number.isInteger(id) && id > 0)) {
    errors.courseIds = 'All course IDs must be positive integers';
  }

  // If there are validation errors, return them
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid bulk action data',
        details: errors
      }
    });
  }

  next();
};

module.exports = {
  validateCourseData,
  validateBulkAction
};
