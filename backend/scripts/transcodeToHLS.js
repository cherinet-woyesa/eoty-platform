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
    ACL: 'public-read',
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
  const hlsDir = path.join(tmpDir, `${path.basename(s3Key, path.extname(s3Key))}_hls`);
  if (!fs.existsSync(hlsDir)) fs.mkdirSync(hlsDir);

  // Build FFmpeg command
  let ffmpegCmd = `ffmpeg -y -i "${inputFile}"`;
  selected.forEach(r => {
    ffmpegCmd += ` -vf scale=w=${r.width}:h=${r.height} -c:a aac -ar 48000 -c:v h264 -profile:v main -crf 20 -sc_threshold 0 -g 48 -keyint_min 48 -b:v ${r.bitrate}k -maxrate ${r.bitrate}k -bufsize ${r.bitrate*2}k -hls_time 4 -hls_playlist_type vod -hls_segment_filename '${hlsDir}/${r.name}_%03d.ts' ${hlsDir}/${r.name}.m3u8`;
  });

  // For adaptive streaming, create a master playlist
  ffmpegCmd += ` && echo '#EXTM3U' > ${hlsDir}/master.m3u8`;
  selected.forEach(r => {
    ffmpegCmd += ` && echo "#EXT-X-STREAM-INF:BANDWIDTH=${r.bitrate*1000},RESOLUTION=${r.width}x${r.height}" >> ${hlsDir}/master.m3u8`;
    ffmpegCmd += ` && echo "${r.name}.m3u8" >> ${hlsDir}/master.m3u8`;
  });

  // Run FFmpeg
  await new Promise((resolve, reject) => {
    exec(ffmpegCmd, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve();
    });
  });

  // Upload HLS files to S3
  const files = fs.readdirSync(hlsDir);
  for (const file of files) {
    const filePath = path.join(hlsDir, file);
    const key = `${outputPrefix}/${file}`;
    const contentType = file.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/MP2T';
    await uploadToS3(s3Bucket, key, filePath, contentType);
  }

  // Return CloudFront master playlist URL
  const cloudFrontDomain = cloudFrontConfig.domain.replace(/\/$/, '');
  const masterPlaylistUrl = `https://${cloudFrontDomain}/${outputPrefix}/master.m3u8`;
  return masterPlaylistUrl;
}

// Usage example (to be called from upload flow):
// await transcodeToHLS({
//   s3Bucket: process.env.AWS_S3_BUCKET,
//   s3Key: 'videos/video_12345.mp4',
//   outputPrefix: 'hls/video_12345',
// });

module.exports = { transcodeToHLS };
