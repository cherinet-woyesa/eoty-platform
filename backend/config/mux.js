/**
 * Mux Configuration
 * Centralizes Mux SDK initialization and configuration
 */

require('dotenv').config();

const muxConfig = {
  // Mux API credentials
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
  webhookSecret: process.env.MUX_WEBHOOK_SECRET,
  
  // Environment
  environment: process.env.MUX_ENVIRONMENT || 'development',
  
  // CORS settings for direct uploads
  corsOrigins: [
    'http://localhost:3000',
    'http://localhost:5000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5000',
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [])
  ],
  
  // Default playback policy
  defaultPlaybackPolicy: process.env.MUX_ENVIRONMENT === 'production' ? 'signed' : 'public',
  
  // Asset settings
  assetSettings: {
    // MP4 support removed - 'standard' is deprecated for basic assets
    // Use 'none' or omit entirely for basic tier
    mp4_support: 'none',
    // Normalize audio
    normalize_audio: true,
    // Master access (for migration/backup)
    master_access: 'temporary'
  },
  
  // Signed URL expiration (in seconds)
  signedUrlExpiration: {
    playback: 24 * 60 * 60, // 24 hours
    thumbnail: 7 * 24 * 60 * 60, // 7 days
    storyboard: 7 * 24 * 60 * 60 // 7 days
  },
  
  // Webhook configuration
  webhook: {
    // Events to listen for
    events: [
      'video.asset.ready',
      'video.asset.errored',
      'video.asset.deleted',
      'video.upload.asset_created',
      'video.upload.cancelled',
      'video.upload.errored'
    ]
  }
};

// Validate required configuration
const validateConfig = () => {
  const required = ['tokenId', 'tokenSecret', 'webhookSecret'];
  const missing = required.filter(key => !muxConfig[key] || muxConfig[key].includes('your-mux'));
  
  if (missing.length > 0) {
    console.warn(`⚠️  Mux configuration incomplete. Missing or placeholder values for: ${missing.join(', ')}`);
    console.warn('   Please update your .env file with valid Mux credentials.');
    return false;
  }
  
  return true;
};

// Check configuration on load
const isConfigured = validateConfig();

module.exports = {
  ...muxConfig,
  isConfigured,
  validateConfig
};
