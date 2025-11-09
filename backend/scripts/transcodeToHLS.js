// backend/scripts/transcodeToHLS.js
// Transcodes a video file from S3 to HLS (multiple qualities) and uploads HLS output to S3

const { s3Client, cloudFrontConfig } = require('../config/cloudStorage');
const { GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Helper to download file from S3
async function downloadFromS3(bucket, key, destPath) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const data = await s3Client.send(command);
  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(destPath);
    data.Body.pipe(writeStream);
    data.Body.on('error', reject);
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });
}

// Helper to upload file to S3
async function uploadToS3(bucket, key, filePath, contentType) {
  const fileStream = fs.createReadStream(filePath);
  await s3Client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fileStream,
    ContentType: contentType,
    // ACL: 'public-read', // REMOVED - Bucket doesn't allow ACLs
    CacheControl: 'max-age=31536000', // 1 year cache for HLS segments
  }));
}

// Main transcoding function
async function transcodeToHLS({ s3Bucket, s3Key, outputPrefix, resolutions = ['480', '720', '1080'] }) {
  const tmpDir = path.join(__dirname, '../../tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  const inputFile = path.join(tmpDir, path.basename(s3Key));

  // Download source video
  await downloadFromS3(s3Bucket, s3Key, inputFile);

  // Prepare FFmpeg command for HLS renditions
  const renditions = [
    { name: '480p', width: 854, height: 480, bitrate: 800 },
    { name: '720p', width: 1280, height: 720, bitrate: 2000 },
    { name: '1080p', width: 1920, height: 1080, bitrate: 4000 },
  ];
  const selected = renditions.filter(r => resolutions.includes(r.name.replace('p','')));
  const hlsBaseDir = path.join(tmpDir, `${path.basename(s3Key, path.extname(s3Key))}_hls`);
  if (!fs.existsSync(hlsBaseDir)) fs.mkdirSync(hlsBaseDir, { recursive: true });

  const masterPlaylistLines = ['#EXTM3U', '#EXT-X-VERSION:3'];

  for (const r of selected) {
    const qualitySubDir = path.join(hlsBaseDir, r.name);
    if (!fs.existsSync(qualitySubDir)) fs.mkdirSync(qualitySubDir, { recursive: true });

    const segmentFilename = path.join(qualitySubDir, `segment_%03d.ts`);
    const playlistFilename = path.join(qualitySubDir, `playlist.m3u8`);

    // Enhanced FFmpeg command with better WebM support and error recovery
    const ffmpegCmd = `ffmpeg -y -fflags +genpts -avoid_negative_ts make_zero -i "${inputFile}" -vf scale=w=${r.width}:h=${r.height} -c:a aac -ar 48000 -ac 2 -c:v h264 -profile:v main -crf 20 -sc_threshold 0 -g 48 -keyint_min 48 -b:v ${r.bitrate}k -maxrate ${r.bitrate*2}k -bufsize ${r.bitrate*2}k -hls_time 4 -hls_playlist_type vod -hls_segment_filename "${segmentFilename}" -f hls "${playlistFilename}"`;

    await new Promise((resolve, reject) => {
      exec(ffmpegCmd, (err, stdout, stderr) => {
        if (err) {
          console.error(`FFmpeg stdout for ${r.name}: ${stdout}`);
          console.error(`FFmpeg stderr for ${r.name}: ${stderr}`);
          
          // Try fallback command for problematic WebM files
          const fallbackCmd = `ffmpeg -y -err_detect ignore_err -i "${inputFile}" -vf scale=w=${r.width}:h=${r.height} -c:a aac -ar 48000 -ac 2 -c:v h264 -profile:v baseline -preset fast -crf 23 -b:v ${r.bitrate}k -hls_time 4 -hls_playlist_type vod -hls_segment_filename "${segmentFilename}" -f hls "${playlistFilename}"`;
          
          console.log(`Trying fallback FFmpeg command for ${r.name}`);
          exec(fallbackCmd, (fallbackErr, fallbackStdout, fallbackStderr) => {
            if (fallbackErr) {
              console.error(`Fallback FFmpeg stdout for ${r.name}: ${fallbackStdout}`);
              console.error(`Fallback FFmpeg stderr for ${r.name}: ${fallbackStderr}`);
              return reject(fallbackErr);
            }
            console.log(`Fallback FFmpeg succeeded for ${r.name}`);
            resolve();
          });
        } else {
          resolve();
        }
      });
    });

    masterPlaylistLines.push(
      `#EXT-X-STREAM-INF:BANDWIDTH=${r.bitrate*1000},RESOLUTION=${r.width}x${r.height}`,
      `${r.name}/playlist.m3u8`
    );
  }

  // Write master playlist
  const masterPlaylistPath = path.join(hlsBaseDir, 'master.m3u8');
  fs.writeFileSync(masterPlaylistPath, masterPlaylistLines.join('\n'));

  // Upload HLS files to S3
  const allHlsFiles = [];
  function collectFiles(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isDirectory()) {
        collectFiles(filePath);
      } else {
        allHlsFiles.push(filePath);
      }
    }
  }
  collectFiles(hlsBaseDir);

  for (const filePath of allHlsFiles) {
    const relativePath = path.relative(hlsBaseDir, filePath);
    const key = `${outputPrefix}/${relativePath.replace(/\\/g, '/')}`;
    const contentType = filePath.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/MP2T';
    await uploadToS3(s3Bucket, key, filePath, contentType);
  }

  // Return CloudFront or S3 master playlist URL
  let masterPlaylistUrl;
  if (cloudFrontConfig.domain) {
    const cloudFrontDomain = cloudFrontConfig.domain.replace(/\/$/, '');
    masterPlaylistUrl = `https://${cloudFrontDomain}/${outputPrefix}/master.m3u8`;
  } else {
    // Fallback to S3 URL if CloudFront not configured
    const region = process.env.AWS_REGION || 'us-east-1';
    masterPlaylistUrl = `https://${s3Bucket}.s3.${region}.amazonaws.com/${outputPrefix}/master.m3u8`;
  }
  return masterPlaylistUrl;
}

// Usage example (to be called from upload flow):
// await transcodeToHLS({
//   s3Bucket: process.env.AWS_S3_BUCKET,
//   s3Key: 'videos/video_12345.mp4',
//   outputPrefix: 'hls/video_12345',
// });

module.exports = { transcodeToHLS };
