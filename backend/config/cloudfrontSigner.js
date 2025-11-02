// backend/config/cloudfrontSigner.js
// Utility to generate signed CloudFront URLs for private video streaming

const { getSignedUrl } = require('@aws-sdk/cloudfront-signer');

const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN;
const keyPairId = process.env.CLOUDFRONT_KEY_PAIR_ID;
const privateKey = process.env.CLOUDFRONT_PRIVATE_KEY?.replace(/\\n/g, '\n'); // handle env var newlines

if (!keyPairId || !privateKey || !cloudFrontDomain) {
  console.warn('CloudFront signing keys not set. Signed URLs will not be generated.');
}

function getSignedCloudFrontUrl(resourcePath, expiresInSeconds = 3600) {
  if (!keyPairId || !privateKey || !cloudFrontDomain) {
    // Fallback: return public URL
    return `https://${cloudFrontDomain}${resourcePath}`;
  }
  const url = `https://${cloudFrontDomain}${resourcePath}`;
  return getSignedUrl({
    url,
    keyPairId,
    privateKey,
    expires: Math.floor(Date.now() / 1000) + expiresInSeconds,
  });
}

module.exports = { getSignedCloudFrontUrl };
