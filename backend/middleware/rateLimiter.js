const rateLimit = require('express-rate-limit');

// Rate limiter for video uploads
const videoUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many video uploads from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for course creation
const courseCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // limit each IP to 20 course creations per hour
  message: 'Too many courses created from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for bulk operations
const bulkOperationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 bulk operations per 15 minutes
  message: 'Too many bulk operations from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  videoUploadLimiter,
  courseCreationLimiter,
  bulkOperationLimiter,
};
