const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const cloudFrontConfig = {
  domain: process.env.CLOUDFRONT_DOMAIN,
  distributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID,
};

const uploadFile = async (fileBuffer, key, mimetype) => {
  try {
    const uploadParams = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: mimetype,
      ACL: 'public-read', // Adjust ACL as per your security requirements
    };

    await s3Client.send(new PutObjectCommand(uploadParams));
    return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  } catch (error) {
    console.warn('S3 Upload failed, falling back to local storage:', error.message);
    
    // Local storage fallback
    const uploadsDir = path.join(__dirname, '../uploads');
    const filePath = path.join(uploadsDir, key);
    const fileDir = path.dirname(filePath);

    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }

    fs.writeFileSync(filePath, fileBuffer);
    
    // Return local URL
    return `/uploads/${key}`;
  }
};

const deleteFile = async (key) => {
  try {
    const deleteParams = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
    };

    await s3Client.send(new DeleteObjectCommand(deleteParams));
  } catch (error) {
    console.warn('S3 Delete failed, checking local storage:', error.message);
    const uploadsDir = path.join(__dirname, '../uploads');
    const filePath = path.join(uploadsDir, key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
};

module.exports = { s3Client, cloudFrontConfig, uploadFile, deleteFile };