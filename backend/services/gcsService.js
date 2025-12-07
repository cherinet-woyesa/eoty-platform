const { Storage } = require('@google-cloud/storage');
const path = require('path');

// Initialize storage
// When running on Cloud Run, it uses the default service account
const storage = new Storage();

class GCSService {
  constructor() {
    this.avatarBucketName = process.env.GCS_AVATAR_BUCKET || 'eoty-platform-avatars';
    this.documentBucketName = process.env.GCS_DOCUMENT_BUCKET || 'eoty-platform-documents';
    this.videoBucketName = process.env.GCS_VIDEO_BUCKET || 'eoty-platform-videos';
  }

  /**
   * Upload a file to GCS
   * @param {Object} file - Multer file object
   * @param {string} folder - Target folder in bucket
   * @param {string} bucketName - Target bucket name
   * @returns {Promise<string>} - Public URL of the uploaded file
   */
  async uploadFile(file, folder = 'profiles', bucketName = null) {
    if (!file) throw new Error('No file provided');

    const targetBucketName = bucketName || this.avatarBucketName;
    const bucket = storage.bucket(targetBucketName);
    
    // Sanitize filename
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    const filename = `${folder}/${Date.now()}-${sanitizedOriginalName}`;
    const blob = bucket.file(filename);

    return new Promise((resolve, reject) => {
      const blobStream = blob.createWriteStream({
        resumable: false,
        contentType: file.mimetype,
        // Try to make it public, but don't fail if it's not allowed (Uniform Bucket Level Access)
        metadata: {
          cacheControl: 'public, max-age=31536000',
        }
      });

      blobStream.on('error', (err) => {
        console.error('GCS Upload Error:', err);
        reject(err);
      });

      blobStream.on('finish', async () => {
        // Construct public URL
        const publicUrl = `https://storage.googleapis.com/${targetBucketName}/${filename}`;
        
        // Try to make the file public (legacy ACL)
        try {
            await blob.makePublic();
        } catch (e) {
            console.warn('Could not make file public (might be using Uniform Bucket Level Access):', e.message);
        }

        resolve(publicUrl);
      });

      blobStream.end(file.buffer);
    });
  }
}

module.exports = new GCSService();
