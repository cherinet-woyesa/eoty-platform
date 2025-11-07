/**
 * Middleware for validating subtitle upload requests
 */
const validateSubtitleUpload = (req, res, next) => {
  const { language, languageCode } = req.body;
  const errors = {};

  // Validate language field
  if (!language || typeof language !== 'string' || language.trim().length === 0) {
    errors.language = 'Language name is required';
  } else if (language.length < 2) {
    errors.language = 'Language name must be at least 2 characters';
  } else if (language.length > 100) {
    errors.language = 'Language name must be less than 100 characters';
  }

  // Validate language code (ISO 639-1 format)
  if (!languageCode || typeof languageCode !== 'string') {
    errors.languageCode = 'Language code is required';
  } else {
    const iso639Pattern = /^[a-z]{2}$/;
    if (!iso639Pattern.test(languageCode.toLowerCase())) {
      errors.languageCode = 'Language code must be ISO 639-1 format (2 lowercase letters, e.g., "en", "es")';
    }
  }

  // Validate file presence
  if (!req.file) {
    errors.file = 'Subtitle file is required';
  } else {
    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (req.file.size > maxSize) {
      errors.file = `File size exceeds maximum allowed size of 5MB`;
    }

    // Validate file format
    const allowedFormats = ['vtt', 'srt'];
    const fileExtension = req.file.originalname.split('.').pop()?.toLowerCase();
    
    if (!fileExtension || !allowedFormats.includes(fileExtension)) {
      errors.file = `Invalid file format. Allowed formats: ${allowedFormats.join(', ')}`;
    }

    // Validate VTT file content
    if (fileExtension === 'vtt' && req.file.buffer) {
      const content = req.file.buffer.toString('utf8');
      if (!content.trim().startsWith('WEBVTT')) {
        errors.file = 'Invalid VTT file: must start with WEBVTT header';
      }
    }

    // Validate SRT file content
    if (fileExtension === 'srt' && req.file.buffer) {
      const content = req.file.buffer.toString('utf8');
      const srtPattern = /\d+\s+\d{2}:\d{2}:\d{2},\d{3}\s+-->\s+\d{2}:\d{2}:\d{2},\d{3}/;
      if (!srtPattern.test(content)) {
        errors.file = 'Invalid SRT file: missing proper timestamp format';
      }
    }
  }

  // Validate lessonId parameter
  const { lessonId } = req.params;
  if (!lessonId || isNaN(parseInt(lessonId)) || parseInt(lessonId) <= 0) {
    errors.lessonId = 'Valid lesson ID is required';
  }

  // If there are validation errors, return them
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid subtitle upload data',
        details: errors
      }
    });
  }

  next();
};

/**
 * Middleware for validating subtitle deletion requests
 */
const validateSubtitleDelete = (req, res, next) => {
  const { lessonId, subtitleId } = req.params;
  const errors = {};

  // Validate lessonId
  if (!lessonId || isNaN(parseInt(lessonId)) || parseInt(lessonId) <= 0) {
    errors.lessonId = 'Valid lesson ID is required';
  }

  // Validate subtitleId
  if (!subtitleId || isNaN(parseInt(subtitleId)) || parseInt(subtitleId) <= 0) {
    errors.subtitleId = 'Valid subtitle ID is required';
  }

  // If there are validation errors, return them
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid subtitle deletion request',
        details: errors
      }
    });
  }

  next();
};

/**
 * Middleware for validating subtitle retrieval requests
 */
const validateSubtitleGet = (req, res, next) => {
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
        message: 'Invalid subtitle retrieval request',
        details: errors
      }
    });
  }

  next();
};

module.exports = {
  validateSubtitleUpload,
  validateSubtitleDelete,
  validateSubtitleGet
};
