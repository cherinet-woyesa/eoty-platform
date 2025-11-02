const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const videoProcessingService = require('./videoProcessingService');

const execAsync = promisify(exec);

class VideoTranscodingService {
  constructor() {
    this.ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    this.tempDir = path.join(__dirname, '../../temp');
    this.outputDir = path.join(__dirname, '../../uploads/transcoded');
    
    // Ensure directories exist
    this.ensureDirectories();
    
    // Quality profiles for adaptive streaming
    this.qualityProfiles = {
      '1080p': {
        resolution: '1920x1080',
        videoBitrate: '5000k',
        audioBitrate: '192k',
        maxRate: '5350k',
        bufSize: '7500k'
      },
      '720p': {
        resolution: '1280x720', 
        videoBitrate: '2500k',
        audioBitrate: '128k',
        maxRate: '2675k',
        bufSize: '3750k'
      },
      '480p': {
        resolution: '854x480',
        videoBitrate: '1000k',
        audioBitrate: '96k',
        maxRate: '1070k',
        bufSize: '1500k'
      },
      '360p': {
        resolution: '640x360',
        videoBitrate: '600k',
        audioBitrate: '64k',
        maxRate: '642k',
        bufSize: '900k'
      }
    };
  }

  ensureDirectories() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  // Main transcoding function
  async transcodeVideo(inputBuffer, originalFilename, lessonId, userId) {
    const jobId = uuidv4();
    const tempInputPath = path.join(this.tempDir, `${jobId}_input${path.extname(originalFilename)}`);
    const outputBasePath = path.join(this.outputDir, jobId);
    
    try {
      console.log(`Starting video transcoding job: ${jobId} for lesson: ${lessonId}`);

      // Save input buffer to temporary file
      fs.writeFileSync(tempInputPath, inputBuffer);

      // Get video metadata
      const metadata = await this.getVideoMetadata(tempInputPath);
      console.log('Video metadata:', metadata);

      // Update video status to processing
      await this.updateVideoStatus(lessonId, 'processing', 'Transcoding video for adaptive streaming');

      // Create HLS streams for all quality levels
      const hlsResults = await this.createHLSStreams(tempInputPath, outputBasePath, metadata);
      
      // Upload HLS files to S3
      const uploadResults = await this.uploadHLSFiles(outputBasePath, lessonId, userId);
      
      // Generate master playlist
      const masterPlaylistUrl = await this.generateMasterPlaylist(uploadResults, lessonId, userId);
      
      // Update video record with HLS information
      await this.updateVideoWithHLS(lessonId, masterPlaylistUrl, uploadResults, metadata);

      console.log(`Transcoding completed successfully for job: ${jobId}`);
      
      return {
        jobId,
        masterPlaylistUrl,
        qualities: Object.keys(uploadResults),
        duration: metadata.duration,
        originalResolution: metadata.resolution
      };

    } catch (error) {
      console.error(`Transcoding failed for job: ${jobId}`, error);
      await this.updateVideoStatus(lessonId, 'failed', error.message);
      throw error;
    } finally {
      // Cleanup temporary files
      this.cleanupFiles([tempInputPath, outputBasePath]);
    }
  }

  // Create HLS streams for multiple qualities
  async createHLSStreams(inputPath, outputBasePath, metadata) {
    const results = {};
    const qualities = this.getSupportedQualities(metadata.resolution);

    // Create output directory for this job
    if (!fs.existsSync(outputBasePath)) {
      fs.mkdirSync(outputBasePath, { recursive: true });
    }

    // Transcode each quality level
    for (const quality of qualities) {
      try {
        console.log(`Transcoding ${quality} stream...`);
        
        const profile = this.qualityProfiles[quality];
        const qualityOutputPath = path.join(outputBasePath, quality);
        
        if (!fs.existsSync(qualityOutputPath)) {
          fs.mkdirSync(qualityOutputPath, { recursive: true });
        }

        const outputPattern = path.join(qualityOutputPath, 'stream_%03d.ts');
        const playlistPath = path.join(qualityOutputPath, 'playlist.m3u8');

        // FFmpeg command for HLS transcoding
        const ffmpegCommand = [
          this.ffmpegPath,
          '-i', inputPath,
          '-preset', 'medium',
          '-g', '48',
          '-keyint_min', '48',
          '-sc_threshold', '0',
          '-profile:v', 'high',
          '-level', '4.0',
          '-c:v', 'libx264',
          '-b:v', profile.videoBitrate,
          '-maxrate', profile.maxRate,
          '-bufsize', profile.bufSize,
          '-vf', `scale=${profile.resolution}:force_original_aspect_ratio=decrease`,
          '-c:a', 'aac',
          '-b:a', profile.audioBitrate,
          '-ac', '2',
          '-ar', '48000',
          '-f', 'hls',
          '-hls_time', '6',
          '-hls_list_size', '0',
          '-hls_segment_filename', outputPattern,
          '-hls_playlist_type', 'vod',
          playlistPath
        ].join(' ');

        await execAsync(ffmpegCommand, { timeout: 3600000 }); // 1 hour timeout

        // Verify the output
        if (fs.existsSync(playlistPath)) {
          results[quality] = {
            playlistPath,
            segmentDir: qualityOutputPath,
            resolution: profile.resolution,
            bitrate: profile.videoBitrate
          };
          console.log(`✅ ${quality} transcoding completed`);
        } else {
          throw new Error(`HLS playlist not generated for ${quality}`);
        }

      } catch (error) {
        console.error(`❌ ${quality} transcoding failed:`, error);
        throw new Error(`Failed to transcode ${quality} stream: ${error.message}`);
      }
    }

    return results;
  }

  // Upload HLS files to S3
  async uploadHLSFiles(outputBasePath, lessonId, userId) {
    const uploadResults = {};
    const qualities = fs.readdirSync(outputBasePath).filter(item => 
      fs.statSync(path.join(outputBasePath, item)).isDirectory()
    );

    for (const quality of qualities) {
      const qualityPath = path.join(outputBasePath, quality);
      const files = fs.readdirSync(qualityPath);
      
      const uploadedFiles = [];

      for (const file of files) {
        const filePath = path.join(qualityPath, file);
        const fileBuffer = fs.readFileSync(filePath);
        
        const s3Key = `hls/${lessonId}/${quality}/${file}`;
        
        try {
          await videoProcessingService.uploadToS3(
            fileBuffer,
            s3Key,
            file.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/MP2T',
            {
              lessonId: lessonId.toString(),
              userId: userId.toString(),
              quality: quality,
              fileType: file.endsWith('.m3u8') ? 'playlist' : 'segment'
            }
          );

          uploadedFiles.push({
            filename: file,
            s3Key: s3Key,
            url: videoProcessingService.generateSignedUrl(s3Key, 24 * 3600) // 24 hours
          });

        } catch (error) {
          console.error(`Failed to upload ${file} for quality ${quality}:`, error);
          throw error;
        }
      }

      uploadResults[quality] = uploadedFiles;
    }

    return uploadResults;
  }

  // Generate master HLS playlist
  async generateMasterPlaylist(uploadResults, lessonId, userId) {
    const masterPlaylist = ['#EXTM3U', '#EXT-X-VERSION:3'];
    
    // Add quality variants to master playlist
    for (const [quality, files] of Object.entries(uploadResults)) {
      const playlistFile = files.find(f => f.filename === 'playlist.m3u8');
      if (!playlistFile) continue;

      const profile = this.qualityProfiles[quality];
      const bandwidth = this.getBandwidthForQuality(quality);
      
      masterPlaylist.push(
        `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${profile.resolution},CODECS="avc1.640028,mp4a.40.2"`,
        `${quality}/playlist.m3u8`
      );
    }

    const masterPlaylistContent = masterPlaylist.join('\n');
    const masterPlaylistBuffer = Buffer.from(masterPlaylistContent, 'utf8');
    
    const s3Key = `hls/${lessonId}/master.m3u8`;
    
    await videoProcessingService.uploadToS3(
      masterPlaylistBuffer,
      s3Key,
      'application/vnd.apple.mpegurl',
      {
        lessonId: lessonId.toString(),
        userId: userId.toString(),
        fileType: 'master_playlist'
      }
    );

    return videoProcessingService.generateSignedUrl(s3Key, 24 * 3600);
  }

  // Get video metadata using FFprobe
  async getVideoMetadata(filePath) {
    try {
      const ffprobeCommand = [
        'ffprobe',
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        filePath
      ].join(' ');

      const { stdout } = await execAsync(ffprobeCommand);
      const metadata = JSON.parse(stdout);

      const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
      const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');

      return {
        duration: parseFloat(metadata.format.duration),
        resolution: `${videoStream.width}x${videoStream.height}`,
        videoCodec: videoStream.codec_name,
        audioCodec: audioStream?.codec_name,
        bitrate: parseInt(metadata.format.bitrate) || 0,
        size: parseInt(metadata.format.size)
      };
    } catch (error) {
      console.error('Failed to get video metadata:', error);
      throw new Error('Could not read video metadata');
    }
  }

  // Determine supported qualities based on original resolution
  getSupportedQualities(originalResolution) {
    const [width, height] = originalResolution.split('x').map(Number);
    const originalHeight = height;

    const supported = [];

    if (originalHeight >= 1080) supported.push('1080p');
    if (originalHeight >= 720) supported.push('720p');
    if (originalHeight >= 480) supported.push('480p');
    supported.push('360p'); // Always include 360p as fallback

    return supported;
  }

  // Get bandwidth for quality profile
  getBandwidthForQuality(quality) {
    const bitrates = {
      '1080p': 5000000,
      '720p': 2500000,
      '480p': 1000000,
      '360p': 600000
    };
    return bitrates[quality] || 1000000;
  }

  // Update video status in database
  async updateVideoStatus(lessonId, status, message = '') {
    await db('videos')
      .where({ lesson_id: lessonId })
      .update({
        status: status,
        processing_error: status === 'failed' ? message : null,
        processing_completed_at: status === 'ready' ? new Date() : null,
        updated_at: new Date()
      });
  }

  // Update video record with HLS information
  async updateVideoWithHLS(lessonId, masterPlaylistUrl, qualityUrls, metadata) {
    await db('videos')
      .where({ lesson_id: lessonId })
      .update({
        storage_url: masterPlaylistUrl,
        hls_playlist_url: masterPlaylistUrl,
        status: 'ready',
        duration_seconds: Math.round(metadata.duration),
        width: parseInt(metadata.resolution.split('x')[0]),
        height: parseInt(metadata.resolution.split('x')[1]),
        codec: metadata.videoCodec,
        processing_completed_at: new Date(),
        updated_at: new Date()
      });

    // Store quality information
    for (const [quality, files] of Object.entries(qualityUrls)) {
      await db('video_qualities').insert({
        video_id: await this.getVideoIdByLessonId(lessonId),
        quality: quality,
        playlist_url: files.find(f => f.filename === 'playlist.m3u8')?.url,
        resolution: this.qualityProfiles[quality].resolution,
        bitrate: this.qualityProfiles[quality].videoBitrate,
        created_at: new Date()
      }).onConflict(['video_id', 'quality']).merge();
    }
  }

  async getVideoIdByLessonId(lessonId) {
    const video = await db('videos')
      .where({ lesson_id: lessonId })
      .select('id')
      .first();
    return video?.id;
  }

  // Cleanup temporary files
  cleanupFiles(filePaths) {
    filePaths.forEach(filePath => {
      try {
        if (fs.existsSync(filePath)) {
          if (fs.statSync(filePath).isDirectory()) {
            fs.rmSync(filePath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(filePath);
          }
        }
      } catch (error) {
        console.warn('Could not cleanup file:', filePath, error.message);
      }
    });
  }

  // Check if FFmpeg is available
  async checkFFmpegAvailability() {
    try {
      await execAsync(`${this.ffmpegPath} -version`);
      return true;
    } catch (error) {
      console.error('FFmpeg not available:', error);
      return false;
    }
  }
}

module.exports = new VideoTranscodingService();