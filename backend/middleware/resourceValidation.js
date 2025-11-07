/**
 * Middleware for validating resource upload and management requests
 */

const resourceService = require('../services/resourceService');

/**
 * Middleware for validating resource upload requests
 */
const validateResourceUpload = (req, res, next) => {
  const { lessonId } = req.params;
  const { description } = req.body;
  const errors = {};

  // Validate lessonId parameter
  if (!lessonId || isNaN(parseInt(lessonId)) || parseInt(lessonId) <= 0) {
    errors.lessonId = 'Valid lesson ID is required';
  }

  // Validate description (optional, but if provided must be reasonable length)
  if (description && typeof description === 'string') {
    if (description.length > 500) {
      errors.description = 'Description must be less than 500 characters';
    }
  }

  // Validate file presence
  if (!req.file) {
    errors.file = 'Resource file is required';
  } else {
    // Validate file size (100MB max)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (req.file.size > maxSize) {
      errors.file = `File size exceeds maximum allowed size of 100MB`;
    }

    // Validate file format
    const allowedFormats = resourceService.allowedFileTypes;
    const fileExtension = req.file.originalname.split('.').pop()?.toLowerCase();
    
    if (!fileExtension || !allowedFormats.includes(fileExtension)) {
      errors.file = `Invalid file format. Allowed formats: ${allowedFormats.join(', ')}`;
    }
  }

  // If there are validation errors, return them
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid resource upload data',
        details: errors
      }
    });
  }

  next();
};

/**
 * Middleware for validating resource download requests
 */
const validateResourceDownload = (req, res, next) => {
  const { lessonId, resourceId } = req.params;
  const errors = {};

  // Validate lessonId
  if (!lessonId || isNaN(parseInt(lessonId)) || parseInt(lessonId) <= 0) {
    errors.lessonId = 'Valid lesson ID is required';
  }

  // Validate resourceId
  if (!resourceId || isNaN(parseInt(resourceId)) || parseInt(resourceId) <= 0) {
    errors.resourceId = 'Valid resource ID is required';
  }

  // If there are validation errors, return them
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid resource download request',
        details: errors
      }
    });
  }

  next();
};

/**
 * Middleware for validating resource deletion requests
 */
const validateResourceDelete = (req, res, next) => {
  const { lessonId, resourceId } = req.params;
  const errors = {};

  // Validate lessonId
  if (!lessonId || isNaN(parseInt(lessonId)) || parseInt(lessonId) <= 0) {
    errors.lessonId = 'Valid lesson ID is required';
  }

  // Validate resourceId
  if (!resourceId || isNaN(parseInt(resourceId)) || parseInt(resourceId) <= 0) {
    errors.resourceId = 'Valid resource ID is required';
  }

  // If there are validation errors, return them
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid resource deletion request',
        details: errors
      }
    });
  }

  next();
};

/**
 * Middleware for validating resource retrieval requests
 */
const validateResourceGet = (req, res, next) => {
  const { lessonId } = req.params;
  const errors = {};

  // Validate lessonId
  if (!lessonId || isNaN(parseInt(lessonId)) || parseInt(lessonId) <= 0) {
    errors.lessonId = 'Valid lesson ID is required';
  }

  // If there are validation errors, return them
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid resource retrieval request',
        details: errors
      }
    });
  }

  next();
};

module.exports = {
  validateResourceUpload,
  validateResourceDownload,
  validateResourceDelete,
  validateResourceGet
};
