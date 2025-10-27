const { S3Client } = require('@aws-sdk/client-s3');

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

module.exports = { s3Client, cloudFrontConfig };