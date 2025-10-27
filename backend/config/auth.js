const authConfig = {
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
  jwtExpiresIn: '7d',
  bcryptRounds: 12,
  
  // For future OAuth/social login
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
    // Add other OAuth providers as needed
  }
};

module.exports = authConfig;