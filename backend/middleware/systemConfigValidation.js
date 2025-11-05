/**
 * System Configuration Validation Middleware
 * 
 * Provides validation for all system configuration entities including
 * categories, levels, durations, tags, and chapters.
 */

const db = require('../config/database');

/**
 * Validate category data
 */
const validateCategory = (req, res, next) => {
  const { name, slug, icon, description } = req.body;
  const errors = {};

  // Validate name
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      errors.name = 'Name is required';
    } else if (name.length < 3) {
      errors.name = 'Name must be at least 3 characters';
    } else if (name.length > 50) {
      errors.name = 'Name must be less than 50 characters';
    }
  }

  // Validate slug (if provided)
  if (slug !== undefined && slug !== null && slug !== '') {
    if (!/^[a-z0-9-]+$/.test(slug)) {
      errors.slug = 'Slug must contain only lowercase letters, numbers, and hyphens';
    }
  }

  // Validate icon (if provided)
  if (icon !== undefined && icon !== null && icon !== '') {
    if (typeof icon !== 'string' || icon.length > 50) {
      errors.icon = 'Icon must be a valid Lucide icon name (max 50 characters)';
    }
  }

  // Validate description (if provided)
  if (description !== undefined && description !== null && description !== '') {
    if (typeof description !== 'string' || description.length > 500) {
      errors.description = 'Description must be less than 500 characters';
    }
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid category data',
      errors
    });
  }

  next();
};

/**
 * Validate level data
 */
const validateLevel = (req, res, next) => {
  const { name, slug, description } = req.body;
  const errors = {};

  // Validate name
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      errors.name = 'Name is required';
    } else if (name.length < 3) {
      errors.name = 'Name must be at least 3 characters';
    } else if (name.length > 30) {
      errors.name = 'Name must be less than 30 characters';
    }
  }

  // Validate slug (if provided)
  if (slug !== undefined && slug !== null && slug !== '') {
    if (!/^[a-z0-9-]+$/.test(slug)) {
      errors.slug = 'Slug must contain only lowercase letters, numbers, and hyphens';
    }
  }

  // Validate description
  if (description !== undefined) {
    if (typeof description !== 'string' || description.trim().length === 0) {
      errors.description = 'Description is required';
    } else if (description.length < 10) {
      errors.description = 'Description must be at least 10 characters';
    } else if (description.length > 100) {
      errors.description = 'Description must be less than 100 characters';
    }
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid level data',
      errors
    });
  }

  next();
};

/**
 * Validate duration data
 */
const validateDuration = (req, res, next) => {
  const { value, label, weeks_min, weeks_max } = req.body;
  const errors = {};

  // Validate value
  if (value !== undefined) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      errors.value = 'Value is required';
    } else if (!/^\d+-\d+$|^\d+\+$/.test(value)) {
      errors.value = 'Value must follow format "1-2" or "9+"';
    }
  }

  // Validate label
  if (label !== undefined) {
    if (typeof label !== 'string' || label.trim().length === 0) {
      errors.label = 'Label is required';
    } else if (label.length < 5) {
      errors.label = 'Label must be at least 5 characters';
    } else if (label.length > 30) {
      errors.label = 'Label must be less than 30 characters';
    }
  }

  // Validate weeks_min (if provided)
  if (weeks_min !== undefined && weeks_min !== null) {
    if (!Number.isInteger(weeks_min) || weeks_min < 0) {
      errors.weeks_min = 'Minimum weeks must be a non-negative integer';
    }
  }

  // Validate weeks_max (if provided)
  if (weeks_max !== undefined && weeks_max !== null) {
    if (!Number.isInteger(weeks_max) || weeks_max < 0) {
      errors.weeks_max = 'Maximum weeks must be a non-negative integer';
    }
    if (weeks_min !== undefined && weeks_max < weeks_min) {
      errors.weeks_max = 'Maximum weeks must be greater than or equal to minimum weeks';
    }
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid duration data',
      errors
    });
  }

  next();
};

/**
 * Validate tag data
 */
const validateTag = (req, res, next) => {
  const { name, category, color } = req.body;
  const errors = {};

  // Validate name
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      errors.name = 'Name is required';
    } else if (name.length < 2) {
      errors.name = 'Name must be at least 2 characters';
    } else if (name.length > 30) {
      errors.name = 'Name must be less than 30 characters';
    } else if (!/^[a-zA-Z0-9-]+$/.test(name)) {
      errors.name = 'Name must contain only alphanumeric characters and hyphens';
    }
  }

  // Validate category (if provided)
  if (category !== undefined && category !== null && category !== '') {
    if (typeof category !== 'string' || category.length > 50) {
      errors.category = 'Category must be less than 50 characters';
    }
  }

  // Validate color (if provided)
  if (color !== undefined && color !== null && color !== '') {
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
      errors.color = 'Color must be a valid hex color code (e.g., #3B82F6)';
    }
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid tag data',
      errors
    });
  }

  next();
};

/**
 * Validate chapter data
 */
const validateChapter = (req, res, next) => {
  const { name, description } = req.body;
  const errors = {};

  // Validate name
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      errors.name = 'Name is required';
    } else if (name.length < 3) {
      errors.name = 'Name must be at least 3 characters';
    } else if (name.length > 100) {
      errors.name = 'Name must be less than 100 characters';
    }
  }

  // Validate description (if provided)
  if (description !== undefined && description !== null && description !== '') {
    if (typeof description !== 'string' || description.length > 500) {
      errors.description = 'Description must be less than 500 characters';
    }
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid chapter data',
      errors
    });
  }

  next();
};

/**
 * Validate bulk action request
 */
const validateBulkAction = (req, res, next) => {
  const { action, ids } = req.body;
  const errors = {};

  // Validate action
  const validActions = ['activate', 'deactivate', 'delete'];
  if (!action) {
    errors.action = 'Action is required';
  } else if (!validActions.includes(action)) {
    errors.action = `Action must be one of: ${validActions.join(', ')}`;
  }

  // Validate ids
  if (!ids || !Array.isArray(ids)) {
    errors.ids = 'IDs must be an array';
  } else if (ids.length === 0) {
    errors.ids = 'At least one ID is required';
  } else if (ids.length > 50) {
    errors.ids = 'Cannot process more than 50 items at once';
  } else if (!ids.every(id => Number.isInteger(id) && id > 0)) {
    errors.ids = 'All IDs must be positive integers';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid bulk action data',
      errors
    });
  }

  next();
};

/**
 * Validate reorder request
 */
const validateReorder = (req, res, next) => {
  const { items } = req.body;
  const errors = {};

  if (!items || !Array.isArray(items)) {
    errors.items = 'Items must be an array';
  } else if (items.length === 0) {
    errors.items = 'At least one item is required';
  } else {
    // Validate each item
    const invalidItems = items.filter(item => 
      !item.id || !Number.isInteger(item.id) || 
      item.display_order === undefined || !Number.isInteger(item.display_order)
    );
    
    if (invalidItems.length > 0) {
      errors.items = 'Each item must have an id and display_order (integers)';
    }
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid reorder data',
      errors
    });
  }

  next();
};

/**
 * Validate merge tags request
 */
const validateMergeTags = (req, res, next) => {
  const { source_tag_id, target_tag_id } = req.body;
  const errors = {};

  if (!source_tag_id || !Number.isInteger(source_tag_id) || source_tag_id <= 0) {
    errors.source_tag_id = 'Source tag ID must be a positive integer';
  }

  if (!target_tag_id || !Number.isInteger(target_tag_id) || target_tag_id <= 0) {
    errors.target_tag_id = 'Target tag ID must be a positive integer';
  }

  if (source_tag_id === target_tag_id) {
    errors.source_tag_id = 'Source and target tags must be different';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid merge tags data',
      errors
    });
  }

  next();
};

/**
 * Check if at least one level will remain active
 */
const ensureActiveLevelExists = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    // Only check if we're deactivating a level
    if (is_active === false || is_active === 0) {
      const activeLevels = await db('course_levels')
        .where('is_active', true)
        .whereNot('id', id)
        .count('* as count');

      if (parseInt(activeLevels[0].count) === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot deactivate the last active level. At least one level must remain active.'
        });
      }
    }

    next();
  } catch (error) {
    console.error('Error checking active levels:', error);
    return res.status(500).json({
      success: false,
      message: 'Error validating level status'
    });
  }
};

module.exports = {
  validateCategory,
  validateLevel,
  validateDuration,
  validateTag,
  validateChapter,
  validateBulkAction,
  validateReorder,
  validateMergeTags,
  ensureActiveLevelExists
};
