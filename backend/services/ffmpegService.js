const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const execAsync = promisify(exec);

class FfmpegService {
  constructor() {
    this.ffmpegPath = this.getFfmpegPath();
    this.supportedFormats = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv', 'flv'];
    this.maxDuration = 6 * 60 * 60; // 6 hours max
  }

  getFfmpegPath() {
    // Try different possible locations
    const possiblePaths = [
      'ffmpeg',
      'ffmpeg.exe',
      '/usr/bin/ffmpeg',
      '/usr/local/bin/ffmpeg',
      'C:\\ffmpeg\\bin\\ffmpeg.exe'
    ];

    for (const ffmpegPath of possiblePaths) {
      try {
        // Test if FFmpeg is accessible
        execSync(`${ffmpegPath} -version`, { stdio: 'pipe' });
        return ffmpegPath;
      } catch (error) {
        continue;
      }
    }
    
    throw new Error('FFmpeg not found. Please install FFmpeg and ensure it is in your PATH');
  }

  // Get video metadata using FFprobe
  async getVideoMetadata(filePath) {
    try {
      const { stdout } = await execAsync(
        `"${this.ffmpegPath}" -v quiet -print_format json -show_format -show_streams "${filePath}"`
      );
      
      const metadata = JSON.parse(stdout);
      const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
      const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');

      if (!videoStream) {
        throw new Error('No video stream found in file');
      }

      return {
        duration: parseFloat(metadata.format.duration),
        size: parseInt(metadata.format.size),
        bitrate: parseInt(metadata.format.bit_rate) || 0,
        format: metadata.format.format_name,
        
        video: {
          codec: videoStream.codec_name,
          width: videoStream.width,
          height: videoStream.height,
          bitrate: parseInt(videoStream.bit_rate) || 0,
          fps: this.parseFps(videoStream.r_frame_rate),
          rotation: videoStream.rotation || 0
        },
        
        audio: audioStream ? {
          codec: audioStream.codec_name,
          channels: audioStream.channels,
          sampleRate: audioStream.sample_rate,
          bitrate: parseInt(audioStream.bit_rate) || 0
        } : null
      };
    } catch (error) {
      console.error('FFprobe error:', error);
      throw new Error(`Failed to get video metadata: ${error.message}`);
    }
  }

  parseFps(fpsString) {
    if (!fpsString) return 0;
    const [num, den] = fpsString.split('/').map(Number);
    return den ? num / den : num;
  }

  // Create HLS streams with multiple qualities
  async createHLSStreams(inputPath, outputDir, qualities = ['360p', '480p', '720p', '1080p']) {
    const jobId = uuidv4();
    const jobDir = path.join(outputDir, jobId);
    
    try {
      // Create job directory
      fs.mkdirSync(jobDir, { recursive: true });

      // Get source video metadata
      const metadata = await this.getVideoMetadata(inputPath);
      console.log('Source video metadata:', metadata);

      // Filter qualities based on source resolution
      const supportedQualities = this.getSupportedQualities(qualities, metadata.video.height);
      console.log('Supported qualities:', supportedQualities);

      // Generate master playlist
      const masterPlaylist = this.generateMasterPlaylist(supportedQualities);
      fs.writeFileSync(path.join(jobDir, 'master.m3u8'), masterPlaylist);

      // Transcode each quality
      const qualityResults = {};
      for (const quality of supportedQualities) {
        console.log(`Transcoding ${quality}...`);
        const result = await this.transcodeQuality(inputPath, jobDir, quality, metadata);
        qualityResults[quality] = result;
      }

      return {
        jobId,
        jobDir,
        masterPlaylist: path.join(jobDir, 'master.m3u8'),
        qualities: qualityResults,
        duration: metadata.duration
      };

    } catch (error) {
      // Cleanup on error
      this.cleanupDirectory(jobDir);
      throw error;
    }
  }

  // Transcode a single quality level
  async transcodeQuality(inputPath, jobDir, quality, sourceMetadata) {
    const qualityDir = path.join(jobDir, quality);
    fs.mkdirSync(qualityDir, { recursive: true });

    const qualityConfig = this.getQualityConfig(quality, sourceMetadata);
    const segmentPattern = path.join(qualityDir, 'segment_%03d.ts');
    const playlistPath = path.join(qualityDir, 'playlist.m3u8');

    const ffmpegCommand = this.buildHLSCommand(
      inputPath,
      segmentPattern,
      playlistPath,
      qualityConfig
    );

    try {
      console.log(`Executing FFmpeg command for ${quality}:`, ffmpegCommand);
      
      const { stdout, stderr } = await execAsync(ffmpegCommand, { 
        timeout: 3600000, // 1 hour timeout
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });

      // Verify output
      if (!fs.existsSync(playlistPath)) {
        throw new Error(`HLS playlist not generated for ${quality}`);
      }

      // Get output file info
      const segmentFiles = fs.readdirSync(qualityDir)
        .filter(file => file.endsWith('.ts'))
        .sort();

      return {
        playlistPath,
        segmentFiles,
        segmentCount: segmentFiles.length,
        qualityConfig,
        directory: qualityDir
      };

    } catch (error) {
      console.error(`FFmpeg error for ${quality}:`, error);
      this.cleanupDirectory(qualityDir);
      throw new Error(`Failed to transcode ${quality}: ${error.message}`);
    }
  }

  // Build FFmpeg command for HLS transcoding
  buildHLSCommand(inputPath, segmentPattern, playlistPath, qualityConfig) {
    const args = [
      `"${this.ffmpegPath}"`,
      '-i', `"${inputPath}"`,
      
      // Video encoding settings
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '23',
      '-maxrate', qualityConfig.videoBitrate,
      '-bufsize', qualityConfig.bufSize,
      '-r', '30', // Force 30fps for consistency
      '-g', '60', // GOP size
      '-keyint_min', '60',
      '-sc_threshold', '0',
      
      // Video filters
      '-vf', `scale=${qualityConfig.resolution}:force_original_aspect_ratio=decrease:flags=lanczos`,
      
      // Audio encoding
      '-c:a', 'aac',
      '-b:a', qualityConfig.audioBitrate,
      '-ac', '2',
      '-ar', '48000',
      
      // HLS settings
      '-f', 'hls',
      '-hls_time', '6',
      '-hls_list_size', '0',
      '-hls_segment_filename', `"${segmentPattern}"`,
      '-hls_playlist_type', 'vod',
      '-hls_flags', 'independent_segments',
      
      // Output
      `"${playlistPath}"'
    ];

    return args.join(' ');
  }

  // Get quality configuration
  getQualityConfig(quality, sourceMetadata) {
    const baseConfigs = {
      '360p': {
        resolution: '640x360',
        videoBitrate: '600k',
        audioBitrate: '64k',
        bufSize: '900k'
      },
      '480p': {
        resolution: '854x480',
        videoBitrate: '1000k',
        audioBitrate: '96k',
        bufSize: '1500k'
      },
      '720p': {
        resolution: '1280x720',
        videoBitrate: '2500k',
        audioBitrate: '128k',
        bufSize: '3750k'
      },
      '1080p': {
        resolution: '1920x1080',
        videoBitrate: '5000k',
        audioBitrate: '192k',
        bufSize: '7500k'
      }
    };

    const config = baseConfigs[quality];
    if (!config) {
      throw new Error(`Unsupported quality: ${quality}`);
    }

    // Adjust based on source if needed
    if (sourceMetadata.video.height < parseInt(config.resolution.split('x')[1])) {
      console.log(`Source resolution too low for ${quality}, adjusting...`);
      // In practice, you might skip this quality or adjust parameters
    }

    return config;
  }

  // Determine supported qualities based on source resolution
  getSupportedQualities(requestedQualities, sourceHeight) {
    const qualityOrder = ['360p', '480p', '720p', '1080p'];
    const maxQualityHeight = {
      '360p': 360,
      '480p': 480,
      '720p': 720,
      '1080p': 1080
    };

    return requestedQualities.filter(quality => {
      const qualityHeight = maxQualityHeight[quality];
      return qualityHeight && sourceHeight >= qualityHeight * 0.8; // Allow some downscaling
    }).sort((a, b) => {
      return qualityOrder.indexOf(a) - qualityOrder.indexOf(b);
    });
  }

  // Generate HLS master playlist
  generateMasterPlaylist(qualities) {
    const lines = [
      '#EXTM3U',
      '#EXT-X-VERSION:3'
    ];

    qualities.forEach(quality => {
      const config = this.getQualityConfig(quality, { video: { height: 1080 } });
      const bandwidth = this.calculateBandwidth(config.videoBitrate, config.audioBitrate);
      
      lines.push(
        `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${config.resolution},CODECS="avc1.640028,mp4a.40.2"`,
        `${quality}/playlist.m3u8`
      );
    });

    return lines.join('\n');
  }

  calculateBandwidth(videoBitrate, audioBitrate) {
    const video = parseInt(videoBitrate) * 1000;
    const audio = parseInt(audioBitrate) * 1000;
    return Math.round((video + audio) * 1.1); // Add 10% overhead
  }

  // Generate thumbnail from video
  async generateThumbnail(inputPath, outputPath, timeInSeconds = 10) {
    try {
      const command = [
        `"${this.ffmpegPath}"`,
        '-i', `"${inputPath}"`,
        '-ss', timeInSeconds.toString(),
        '-vframes', '1',
        '-q:v', '2',
        '-y', // Overwrite output file
        `"${outputPath}"`
      ].join(' ');

      await execAsync(command);
      
      if (!fs.existsSync(outputPath)) {
        throw new Error('Thumbnail not generated');
      }

      return outputPath;
    } catch (error) {
      console.error('Thumbnail generation error:', error);
      throw new Error(`Failed to generate thumbnail: ${error.message}`);
    }
  }

  // Get FFmpeg version and capabilities
  async getCapabilities() {
    try {
      const { stdout } = await execAsync(`"${this.ffmpegPath}" -version`);
      const versionLine = stdout.split('\n')[0];
      
      // Check codec support
      const { stdout: codecsStdout } = await execAsync(`"${this.ffmpegPath}" -codecs`);
      const supportedCodecs = {
        h264: codecsStdout.includes('libx264'),
        h265: codecsStdout.includes('libx265'),
        vp9: codecsStdout.includes('libvpx-vp9'),
        aac: codecsStdout.includes('aac')
      };

      return {
        version: versionLine,
        supportedCodecs,
        available: true
      };
    } catch (error) {
      return {
        available: false,
        error: error.message
      };
    }
  }

  // Cleanup temporary directory
  cleanupDirectory(dirPath) {
    try {
      if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
        console.log('Cleaned up directory:', dirPath);
      }
    } catch (error) {
      console.warn('Could not cleanup directory:', dirPath, error.message);
    }
  }

  // Validate if file can be processed
  async validateVideoFile(filePath) {
    try {
      const metadata = await this.getVideoMetadata(filePath);
      
      // Check duration
      if (metadata.duration > this.maxDuration) {
        throw new Error(`Video duration ${metadata.duration}s exceeds maximum allowed ${this.maxDuration}s`);
      }

      // Check format
      if (!this.supportedFormats.some(format => metadata.format.includes(format))) {
        throw new Error(`Unsupported video format: ${metadata.format}. Supported: ${this.supportedFormats.join(', ')}`);
      }

      return metadata;
    } catch (error) {
      throw new Error(`Video validation failed: ${error.message}`);
    }
  }
}

module.exports = new FfmpegService();