const multer = require('multer');
const path = require('path');
const fs = require('fs');

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

// FR5: Content upload - allow images, documents, and other content types
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml'
];

const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'text/plain',
  'text/csv',
  'application/rtf'
];

// Enhanced file filter with better error messages
const createFileFilter = (allowedTypes, fileType) => {
  return (req, file, cb) => {
    try {
      // Check MIME type
      const baseMimeType = file.mimetype.split(';')[0];
      if (allowedTypes.includes(baseMimeType)) {
        cb(null, true);
      } else {
        cb(new Error(`Invalid ${fileType} format. Supported formats: ${allowedTypes.map(t => t.split('/')[1]).join(', ')}`), false);
      }
    } catch (error) {
      cb(new Error(`Error validating ${fileType} file`), false);
    }
  };
};

// Configure storage - use disk storage for content uploads
// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Disk storage for content uploads
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// Memory storage for videos/subtitles (original behavior)
const memoryStorage = multer.memoryStorage();

// Create upload middleware for videos/subtitles only (original behavior)
const upload = multer({
  storage: memoryStorage,
  fileFilter: (req, file, cb) => {
    // Check if file is video
    if (file.mimetype.startsWith('video/')) {
      // Use video filter
      createFileFilter(ALLOWED_VIDEO_TYPES, 'video')(req, file, cb);
    } else if (file.mimetype.startsWith('text/') || file.mimetype === 'application/x-subrip') {
      // Use subtitle filter
      createFileFilter(ALLOWED_SUBTITLE_TYPES, 'subtitle')(req, file, cb);
    } else if (file.mimetype.startsWith('image/')) {
      // Use image filter
      createFileFilter(ALLOWED_IMAGE_TYPES, 'image')(req, file, cb);
    } else if (ALLOWED_DOCUMENT_TYPES.includes(file.mimetype)) {
      // Use document filter
      createFileFilter(ALLOWED_DOCUMENT_TYPES, 'document')(req, file, cb);
    } else {
      cb(new Error('Invalid file type. Allowed: Video, Subtitle, Image, Document'), false);
    }
  },
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024, // 2GB limit
  },
});

// FR5: Content upload middleware - allows videos, images, documents
const contentUpload = multer({
  storage: diskStorage,
  fileFilter: (req, file, cb) => {
    const baseMimeType = file.mimetype.split(';')[0];
    
    // Allow videos
    if (file.mimetype.startsWith('video/')) {
      if (ALLOWED_VIDEO_TYPES.includes(baseMimeType)) {
        cb(null, true);
      } else {
        cb(new Error(`Invalid video format. Supported: ${ALLOWED_VIDEO_TYPES.map(t => t.split('/')[1]).join(', ')}`), false);
      }
    }
    // Allow images
    else if (file.mimetype.startsWith('image/')) {
      if (ALLOWED_IMAGE_TYPES.includes(baseMimeType)) {
        cb(null, true);
      } else {
        cb(new Error(`Invalid image format. Supported: ${ALLOWED_IMAGE_TYPES.map(t => t.split('/')[1]).join(', ')}`), false);
      }
    }
    // Allow documents
    else if (ALLOWED_DOCUMENT_TYPES.includes(baseMimeType)) {
      cb(null, true);
    }
    // Allow subtitles
    else if (file.mimetype.startsWith('text/') || file.mimetype === 'application/x-subrip') {
      if (ALLOWED_SUBTITLE_TYPES.includes(baseMimeType)) {
        cb(null, true);
      } else {
        cb(null, true); // Allow other text files
      }
    }
    else {
      cb(new Error(`File type not allowed. Allowed types: videos, images, documents (PDF, Word, Excel, PowerPoint), and text files.`), false);
    }
  },
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024, // 2GB limit
  },
});

module.exports = upload;
module.exports.contentUpload = contentUpload;