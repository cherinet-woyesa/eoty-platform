const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

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
  const uploadParams = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: mimetype,
    ACL: 'public-read', // Adjust ACL as per your security requirements
  };

  await s3Client.send(new PutObjectCommand(uploadParams));
  return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};

const deleteFile = async (key) => {
  const deleteParams = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
  };

  await s3Client.send(new DeleteObjectCommand(deleteParams));
};

module.exports = { s3Client, cloudFrontConfig, uploadFile, deleteFile };