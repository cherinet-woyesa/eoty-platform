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

  /**
   * Delete a file in GCS by its public URL
   * @param {string} publicUrl - Public URL like https://storage.googleapis.com/<bucket>/<key>
   * @returns {Promise<void>}
   */
  async deleteByPublicUrl(publicUrl) {
    if (!publicUrl || typeof publicUrl !== 'string') return;

    const prefix = 'https://storage.googleapis.com/';
    if (!publicUrl.startsWith(prefix)) return; // Not a GCS public URL

    const remainder = publicUrl.substring(prefix.length);
    const firstSlash = remainder.indexOf('/');
    if (firstSlash === -1) return;

    const bucketName = remainder.substring(0, firstSlash);
    const filePath = remainder.substring(firstSlash + 1);

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(filePath);
    try {
      await file.delete();
    } catch (e) {
      // Swallow not-found errors to keep delete idempotent
      if (e.code !== 404) {
        throw e;
      }
    }
  }
}

module.exports = new GCSService();
