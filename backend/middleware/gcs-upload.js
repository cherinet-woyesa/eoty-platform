const { Storage } = require('@google-cloud/storage');
const multer = require('multer');
const path = require('path');

// Initialize Google Cloud Storage with fallback for development
let storage = null;
try {
  storage = new Storage({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
    keyFilename: process.env.GOOGLE_CLOUD_KEYFILE || '/secrets/service-account-key.json'
  });
  console.log('✅ Google Cloud Storage initialized successfully');
} catch (error) {
  console.warn('⚠️ Google Cloud Storage not available, falling back to local storage:', error.message);
  console.warn('📁 Files will be stored locally in ./backend/uploads/');
  storage = null; // Will use local storage fallback
}

// Bucket names
const VIDEO_BUCKET = process.env.GCS_VIDEO_BUCKET || 'edu-platform-videos';
const DOCUMENT_BUCKET = process.env.GCS_DOCUMENT_BUCKET || 'edu-platform-documents';
const AVATAR_BUCKET = process.env.GCS_AVATAR_BUCKET || 'edu-platform-avatars';

// File type validation
const ALLOWED_VIDEO_TYPES = [
  'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime',
  'video/x-msvideo', 'video/mpeg'
];

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
  'image/webp', 'image/svg+xml'
];

const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv', 'application/rtf'
];

// Memory storage for multer (files will be uploaded to GCS)
const memoryStorage = multer.memoryStorage();

// Enhanced file filter
const createFileFilter = (allowedTypes, fileType) => {
  return (req, file, cb) => {
    try {
      const baseMimeType = file.mimetype.split(';')[0];
      if (allowedTypes.includes(baseMimeType)) {
        cb(null, true);
      } else {
        cb(new Error(`Invalid ${fileType} format. Supported: ${allowedTypes.map(t => t.split('/')[1]).join(', ')}`), false);
      }
    } catch (error) {
      cb(new Error(`File validation error: ${error.message}`), false);
    }
  };
};

// Upload file to Google Cloud Storage
// Local storage fallback function
const uploadToLocal = async (file, folder = '') => {
  const fs = require('fs');
  const uploadsDir = path.join(__dirname, '../uploads');

  // Ensure uploads directory exists
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const fileName = `${folder}${Date.now()}-${Math.random().toString(36).substring(2)}${path.extname(file.originalname)}`;
  const filePath = path.join(uploadsDir, fileName);

  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, file.buffer, (err) => {
      if (err) {
        console.error('Local upload error:', err);
        reject(err);
      } else {
        const publicUrl = `/uploads/${fileName}`; // Relative URL for local access
        resolve({
          bucket: 'local',
          fileName: fileName,
          filePath: filePath,
          publicUrl: publicUrl,
          size: file.size,
          mimeType: file.mimetype
        });
      }
    });
  });
};

const uploadToGCS = async (file, bucketName, folder = '') => {
  // Check if GCS storage is available
  if (!storage) {
    console.log('📁 GCS not available, using local storage fallback');
    return uploadToLocal(file, folder);
  }

  const bucket = storage.bucket(bucketName);
  const fileName = `${folder}${Date.now()}-${Math.random().toString(36).substring(2)}${path.extname(file.originalname)}`;
  const fileUpload = bucket.file(fileName);

  const stream = fileUpload.createWriteStream({
    metadata: {
      contentType: file.mimetype,
      metadata: {
        originalName: file.originalname,
        uploadDate: new Date().toISOString()
      }
    },
    resumable: false
  });

  return new Promise((resolve, reject) => {
    stream.on('error', (err) => {
      console.error('GCS upload error:', err);
      reject(err);
    });

    stream.on('finish', () => {
      // Make the file publicly accessible
      fileUpload.makePublic().then(() => {
        const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
        resolve({
          bucket: bucketName,
          fileName: fileName,
          publicUrl: publicUrl,
          size: file.size,
          mimeType: file.mimetype
        });
      }).catch(reject);
    });

    stream.end(file.buffer);
  });
};

// Multer configuration for different file types
const videoUpload = multer({
  storage: memoryStorage,
  fileFilter: createFileFilter(ALLOWED_VIDEO_TYPES, 'video'),
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024, // 2GB
  }
});

const documentUpload = multer({
  storage: memoryStorage,
  fileFilter: createFileFilter(ALLOWED_DOCUMENT_TYPES, 'document'),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  }
});

const imageUpload = multer({
  storage: memoryStorage,
  fileFilter: createFileFilter(ALLOWED_IMAGE_TYPES, 'image'),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  }
});

// Generic content upload (allows all types)
const contentUpload = multer({
  storage: memoryStorage,
  fileFilter: (req, file, cb) => {
    const baseMimeType = file.mimetype.split(';')[0];
    const allAllowedTypes = [
      ...ALLOWED_VIDEO_TYPES,
      ...ALLOWED_DOCUMENT_TYPES,
      ...ALLOWED_IMAGE_TYPES
    ];

    if (allAllowedTypes.includes(baseMimeType)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${baseMimeType}`), false);
    }
  },
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024, // 2GB
  }
});

// Middleware to handle GCS/Local upload after multer
const handleGCSUpload = (bucketName, folder = '') => {
  return async (req, res, next) => {
    if (!req.file) {
      return next();
    }

    try {
      const uploadResult = await uploadToGCS(req.file, bucketName, folder);
      req.file.gcs = uploadResult;
      req.file.storage = storage ? 'gcs' : 'local';
      next();
    } catch (error) {
      console.error('GCS upload failed, falling back to local storage:', error.message);

      // Fallback to local storage
      try {
        const localResult = await uploadToLocal(req.file, folder);
        req.file.gcs = localResult;
        req.file.storage = 'local';
        req.file.uploadError = null; // Clear the GCS error since local worked
        console.log('✅ Local storage fallback successful');
        next();
      } catch (localError) {
        console.error('Both GCS and local storage failed:', localError);
        req.file.uploadError = `${error.message}; Local fallback also failed: ${localError.message}`;
        req.file.storage = 'error';
        next(); // Continue anyway, let the controller handle the error
      }
    }
  };
};

// Export configurations
module.exports = {
  videoUpload,
  documentUpload,
  imageUpload,
  contentUpload,
  handleGCSUpload,
  VIDEO_BUCKET,
  DOCUMENT_BUCKET,
  AVATAR_BUCKET
};
