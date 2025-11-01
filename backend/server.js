const app = require('./app');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Ensure upload directories exist
const ensureUploadDirs = () => {
  const dirs = [
    'uploads/videos',
    'uploads/subtitles',
    'uploads/thumbnails'
  ];
  
  dirs.forEach(dir => {
    const fullPath = path.join(__dirname, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`Created directory: ${fullPath}`);
    }
  });
};

const PORT = process.env.PORT || 5000;

// Ensure upload directories exist before starting server
ensureUploadDirs();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n=== EOTY Server Running ===`);
  console.log(`Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Port: ${PORT}`);
  console.log(`URL: http://localhost:${PORT}`);
  console.log(`Health Check: http://localhost:${PORT}/api/health`);
  console.log(`CORS Enabled: Yes`);
  console.log(`Video Streaming: Enabled`);
  console.log(`Upload Directories: Ready`);
  console.log(`===========================\n`);
});