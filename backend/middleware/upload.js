const multer = require('multer');
const path = require('path');

// Security: Enhanced file type validation
const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm', 
  'video/ogg',
  'video/quicktime',
  'video/x-msvideo',
  'video/mpeg'
];

const ALLOWED_SUBTITLE_TYPES = [
  'text/plain',
  'text/vtt',
  'application/x-subrip'
];

// Enhanced file filter with better error messages
const createFileFilter = (allowedTypes, fileType) => {
  return (req, file, cb) => {
    try {
      // Check MIME type
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Invalid ${fileType} format. Supported formats: ${allowedTypes.map(t => t.split('/')[1]).join(', ')}`), false);
      }
    } catch (error) {
      cb(new Error(`Error validating ${fileType} file`), false);
    }
  };
};

// Configure storage with enhanced security
const storage = multer.memoryStorage();

// Create upload middleware
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Check if file is video
    if (file.mimetype.startsWith('video/')) {
      // Use video filter
      createFileFilter(ALLOWED_VIDEO_TYPES, 'video')(req, file, cb);
    } else if (file.mimetype.startsWith('text/') || file.mimetype === 'application/x-subrip') {
      // Use subtitle filter
      createFileFilter(ALLOWED_SUBTITLE_TYPES, 'subtitle')(req, file, cb);
    } else {
      cb(new Error('Only video and subtitle files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024, // 2GB limit
  },
});

module.exports = upload;