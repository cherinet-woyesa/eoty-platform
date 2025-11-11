// backend/services/videoProcessingService.js
const db = require('../config/database');
const { transcodeToHLS } = require('../scripts/transcodeToHLS');
const { notifyVideoAvailable } = require('./notificationService');
const cloudStorageService = require('./cloudStorageService');
const websocketService = require('./websocketService');

class VideoProcessingService {
  constructor() {
    this.supportedFormats = ['mp4', 'webm', 'mov', 'avi', 'mpeg', 'mkv', 'wmv'];
    this.maxFileSize = 2 * 1024 * 1024 * 1024; // 2GB
    this.processingQueue = new Map();
    this.maxRetries = 3;
  }

  // Enhanced upload with transaction support and proper error handling
  async uploadVideo(fileBuffer, originalFilename, lessonId, userId, options = {}) {
    let transaction;
    
    try {
      console.log('Starting enhanced video upload for lesson:', lessonId);
      
      // Validate file
      await this.validateVideoFile(fileBuffer, originalFilename);
      
      // Start database transaction
      transaction = await db.transaction();
      
      // Verify lesson belongs to user
      const lesson = await transaction('lessons')
        .join('courses', 'lessons.course_id', 'courses.id')
        .where('lessons.id', lessonId)
        .where('courses.created_by', userId)
        .select('lessons.*')
        .first();

      if (!lesson) {
        throw new Error('Lesson not found or access denied');
      }

      // Generate unique filename
      const safeFileName = this.sanitizeFilename(`video_${lessonId}_${Date.now()}_${originalFilename}`);
      
      // Upload to cloud storage
      const uploadResult = await cloudStorageService.uploadVideo(
        fileBuffer,
        safeFileName,
        this.getMimeType(originalFilename)
      );


      // Insert video record and get the inserted ID (PostgreSQL compatible)
      const [videoRow] = await transaction('videos').insert({
        lesson_id: lessonId,
        uploader_id: userId,
        storage_url: uploadResult.storageUrl || uploadResult.cdnUrl || uploadResult.signedUrl,
        s3_key: uploadResult.s3Key,
        size_bytes: fileBuffer.length,
        status: 'processing',
        content_hash: this.generateContentHash(fileBuffer),
        created_at: new Date(),
        updated_at: new Date(),
      }).returning(['id']);

      const videoId = videoRow.id;

      // Update lesson with video reference and S3 key
      await transaction('lessons')
        .where({ id: lessonId })
        .update({
          video_id: videoId,
          s3_key: uploadResult.s3Key, // Store S3 key for generating signed URLs on-demand
          video_url: uploadResult.storageUrl || uploadResult.cdnUrl || uploadResult.signedUrl, // Temporary URL (will be replaced with signed URL on access)
          updated_at: new Date(),
        });

      // Commit transaction
      await transaction.commit();

      console.log('Original video uploaded successfully:', { 
        videoId, 
        s3Key: uploadResult.s3Key, 
        lessonId 
      });

      // Start background processing (HLS transcoding)
      if (options.enableTranscoding !== false) {
        this.processVideoUpload(videoId, uploadResult.s3Key, lessonId, userId)
          .catch(error => {
            console.error('Background processing failed:', error);
            this.handleProcessingFailure(videoId, error).catch(console.error);
          });
      }

      return {
        success: true,
        videoId,
        s3Key: uploadResult.s3Key,
        videoUrl: uploadResult.storageUrl || uploadResult.cdnUrl || uploadResult.signedUrl,
        fileSize: fileBuffer.length,
        contentType: this.getMimeType(originalFilename),
        processingStatus: 'processing',
        transcodingQueued: options.enableTranscoding !== false
      };

    } catch (error) {
      // Rollback transaction if it exists
      if (transaction) {
        await transaction.rollback();
      }
      
      console.error('Video upload service error:', error);
      throw error;
    }
  }

  // Main video processing with HLS transcoding
  async processVideoUpload(videoId, s3Key, lessonId, userId) {
    try {
      console.log('Starting video processing for video:', videoId);
      websocketService.sendProgress(lessonId, { type: 'progress', progress: 10, currentStep: 'Starting HLS transcoding' });

      // Update status to processing
      await this.updateVideoStatus(videoId, 'processing', 'Starting HLS transcoding');

      // Pre-validate video file before processing (skip for WebM files from MediaRecorder)
      // WebM files from browser MediaRecorder often have non-standard structures that FFprobe can't parse
      // but are still valid for playback in browsers
      if (!s3Key.toLowerCase().endsWith('.webm')) {
        try {
          const validationResult = await this.validateVideoStreams(s3Key);
          if (!validationResult.isValid) {
            throw new Error(`Video validation failed: ${validationResult.error}`);
          }
          console.log('Video validation passed:', validationResult);
        } catch (error) {
          console.error('Video validation failed:', error.message);
          throw error;
        }
      } else {
        console.log('Skipping FFprobe validation for WebM file (browser-generated files often have non-standard structures)');
      }

      const outputPrefix = `hls/${s3Key.replace('videos/', '').split('.')[0]}`;
      
      websocketService.sendProgress(lessonId, { type: 'progress', progress: 30, currentStep: 'Transcoding video' });

      // Handle different video formats appropriately
      let hlsUrl;
      let transcodingSkipped = false;
      
      // Check if FFmpeg is available before attempting transcoding
      const { exec } = require('child_process');
      const ffmpegAvailable = await new Promise((resolve) => {
        exec('which ffmpeg || command -v ffmpeg', (error) => {
          resolve(!error);
        });
      });

      if (!ffmpegAvailable) {
        console.warn('⚠️ FFmpeg not available - skipping HLS transcoding, using direct video URL');
        transcodingSkipped = true;
        websocketService.sendProgress(lessonId, { type: 'progress', progress: 50, currentStep: 'FFmpeg not available - using direct video' });
        // Use signed URL directly - video will work but without adaptive streaming
        hlsUrl = await cloudStorageService.getSignedStreamUrl(s3Key, 86400 * 7); // 7 days
      } else {
        // WebM files need transcoding for browser compatibility (Safari doesn't support WebM well)
        // Convert WebM to MP4/HLS for better cross-browser support
        if (s3Key.toLowerCase().endsWith('.webm')) {
          console.log('WebM file detected - transcoding to HLS for browser compatibility');
          try {
            websocketService.sendProgress(lessonId, { type: 'progress', progress: 40, currentStep: 'Transcoding WebM to HLS' });
            // Start HLS transcoding for WebM files to ensure browser compatibility
            hlsUrl = await transcodeToHLS({
              s3Bucket: cloudStorageService.bucket,
              s3Key: s3Key,
              outputPrefix: outputPrefix,
            });
            console.log('WebM HLS transcoding completed, URL:', hlsUrl);
            websocketService.sendProgress(lessonId, { type: 'progress', progress: 60, currentStep: 'HLS transcoding complete' });
          } catch (transcodeError) {
            console.error('WebM transcoding failed, falling back to direct URL:', transcodeError);
            websocketService.sendProgress(lessonId, { type: 'progress', progress: 50, currentStep: 'Transcoding failed - using direct video' });
            // Fallback: Use signed URL but warn about compatibility
            hlsUrl = await cloudStorageService.getSignedStreamUrl(s3Key, 86400 * 7); // 7 days
            transcodingSkipped = true;
            console.warn('Using WebM file directly - may not work in all browsers (especially Safari)');
          }
        } else {
          console.log('Starting HLS transcoding for', s3Key);
          try {
            websocketService.sendProgress(lessonId, { type: 'progress', progress: 40, currentStep: 'Transcoding to HLS format' });
            // Start HLS transcoding for MP4 and other formats
            hlsUrl = await transcodeToHLS({
              s3Bucket: cloudStorageService.bucket, // Pass the S3 bucket name
              s3Key: s3Key,
              outputPrefix: outputPrefix,
            });
            console.log('HLS transcoding completed, URL:', hlsUrl);
            websocketService.sendProgress(lessonId, { type: 'progress', progress: 60, currentStep: 'HLS transcoding complete' });
          } catch (transcodeError) {
            console.error('HLS transcoding failed, falling back to direct URL:', transcodeError);
            websocketService.sendProgress(lessonId, { type: 'progress', progress: 50, currentStep: 'Transcoding failed - using direct video' });
            // Fallback: Use signed URL if transcoding fails
            hlsUrl = await cloudStorageService.getSignedStreamUrl(s3Key, 86400 * 7); // 7 days
            transcodingSkipped = true;
            console.warn('Using direct video URL - adaptive streaming not available');
          }
        }
      }

      websocketService.sendProgress(lessonId, { type: 'progress', progress: 70, currentStep: 'Finalizing video' });

      // Update video record with video URL and set to ready
      await db('videos')
        .where({ id: videoId })
        .update({
          video_url: hlsUrl, // Use video_url instead of hls_url
          status: 'ready',
          processing_completed_at: new Date(),
          updated_at: new Date(),
        });

      // Update lesson with video URL (s3_key already set during upload)
      await db('lessons')
        .where({ id: lessonId })
        .update({
          video_url: hlsUrl,
          updated_at: new Date(),
        });

      // Notify users that video is available
      await notifyVideoAvailable(lessonId);

      console.log('Video processing completed successfully:', { videoId, videoUrl: hlsUrl });
      
      // Send completion message with a small delay to ensure WebSocket is ready
      setTimeout(() => {
        console.log('Sending completion notification for lesson:', lessonId);
        websocketService.sendProgress(lessonId, { type: 'complete', videoUrl: hlsUrl });
      }, 100);

      return {
        success: true,
        videoId,
        videoUrl: hlsUrl,
        status: 'ready'
      };

    } catch (error) {
      console.error('Video processing failed:', error);
      await this.handleProcessingFailure(videoId, error);
      websocketService.sendProgress(lessonId, { type: 'failed', error: error.message });
      throw error;
    }
  }

  // Validate video streams using FFprobe
  async validateVideoStreams(s3Key) {
    const { exec } = require('child_process');
    const path = require('path');
    const fs = require('fs');
    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    
    try {
      // Download file temporarily for validation
      const tmpDir = path.join(__dirname, '../../tmp');
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
      
      const tempFile = path.join(tmpDir, `validate_${Date.now()}_${path.basename(s3Key)}`);
      
      // Download from S3 using S3 client directly
      const command = new GetObjectCommand({ 
        Bucket: cloudStorageService.bucket, 
        Key: s3Key 
      });
      const data = await cloudStorageService.s3Client.send(command);
      
      // Write to temp file
      await new Promise((resolve, reject) => {
        const writeStream = fs.createWriteStream(tempFile);
        data.Body.pipe(writeStream);
        data.Body.on('error', reject);
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
      
      // Use FFprobe to analyze the video
      // Check if ffprobe is available first
      const checkFfprobe = await new Promise((resolve) => {
        exec('which ffprobe || command -v ffprobe', (error) => {
          resolve(!error);
        });
      });

      if (!checkFfprobe) {
        console.warn('⚠️ FFprobe not found - skipping video validation. Install FFmpeg for full validation.');
        // Clean up temp file
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
        // Return basic validation - file exists and was uploaded
        return {
          valid: true,
          format: path.extname(s3Key).slice(1) || 'unknown',
          warning: 'FFprobe not available - advanced validation skipped'
        };
      }

      const ffprobeCmd = `ffprobe -v quiet -print_format json -show_format -show_streams "${tempFile}"`;
      
      const probeResult = await new Promise((resolve, reject) => {
        exec(ffprobeCmd, (error, stdout, stderr) => {
          if (error) {
            console.error('FFprobe error:', error);
            console.error('FFprobe stderr:', stderr);
            // If ffprobe fails but file exists, return basic validation
            if (error.code === 127 || stderr.includes('not found')) {
              console.warn('⚠️ FFprobe command not found - skipping advanced validation');
              return resolve(null); // Signal to skip validation
            }
            return reject(error);
          }
          resolve(stdout);
        });
      });

      // If probeResult is null, ffprobe wasn't available
      if (!probeResult) {
        // Clean up temp file
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
        return {
          valid: true,
          format: path.extname(s3Key).slice(1) || 'unknown',
          warning: 'FFprobe not available - advanced validation skipped'
        };
      }
      
      // Clean up temp file
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
      
      const probeData = JSON.parse(probeResult);
      console.log('Video probe data:', {
        format: probeData.format?.format_name,
        duration: probeData.format?.duration,
        size: probeData.format?.size,
        streams: probeData.streams?.length
      });
      
      // Validation checks
      if (!probeData.streams || probeData.streams.length === 0) {
        return { isValid: false, error: 'No streams found in video file' };
      }
      
      const videoStreams = probeData.streams.filter(s => s.codec_type === 'video');
      const audioStreams = probeData.streams.filter(s => s.codec_type === 'audio');
      
      if (videoStreams.length === 0) {
        return { isValid: false, error: 'No video stream found' };
      }
      
      const duration = parseFloat(probeData.format?.duration || '0');
      if (duration < 0.1) {
        return { isValid: false, error: `Video too short: ${duration}s (minimum 0.1s required)` };
      }
      
      const fileSize = parseInt(probeData.format?.size || '0');
      if (fileSize < 1000) {
        return { isValid: false, error: `Video file too small: ${fileSize} bytes` };
      }
      
      return { 
        isValid: true, 
        duration,
        videoStreams: videoStreams.length,
        audioStreams: audioStreams.length,
        format: probeData.format?.format_name
      };
      
    } catch (error) {
      console.error('Video validation error:', error);
      return { isValid: false, error: `Validation failed: ${error.message}` };
    }
  }

  // Handle processing failures with retry logic
  async handleProcessingFailure(videoId, error) {
    try {
      const video = await db('videos')
        .where({ id: videoId })
        .select('processing_attempts')
        .first();

      const attempts = (video?.processing_attempts || 0) + 1;
      
      if (attempts <= this.maxRetries) {
        // Update with retry information
        await db('videos')
          .where({ id: videoId })
          .update({
            status: 'retrying',
            processing_error: error.message,
            processing_attempts: attempts,
            updated_at: new Date(),
          });

        console.log(`Scheduled retry ${attempts}/${this.maxRetries} for video:`, videoId);
        
        // In production, you'd add to a job queue here
        // For now, we'll log the retry
        return { shouldRetry: true, attempts };
      } else {
        // Max retries exceeded, mark as failed
        await db('videos')
          .where({ id: videoId })
          .update({
            status: 'failed',
            processing_error: `Max retries exceeded: ${error.message}`,
            processing_attempts: attempts,
            processing_completed_at: new Date(),
            updated_at: new Date(),
          });

        console.error(`Video processing failed after ${attempts} attempts:`, videoId);
        return { shouldRetry: false, attempts };
      }
    } catch (dbError) {
      console.error('Error handling processing failure:', dbError);
      throw dbError;
    }
  }

  // Retry failed processing
  async retryFailedProcessing(videoId) {
    try {
      const video = await db('videos')
        .where({ id: videoId, status: 'failed' })
        .select('*')
        .first();

      if (!video) {
        throw new Error('Video not found or not in failed state');
      }

      const s3Key = video.s3_key;
      
      return this.processVideoUpload(videoId, s3Key, video.lesson_id, video.uploader_id);
    } catch (error) {
      console.error('Retry failed:', error);
      throw error;
    }
  }

  // Enhanced file validation
  async validateVideoFile(fileBuffer, filename) {
    // Size validation
    if (fileBuffer.length > this.maxFileSize) {
      throw new Error(`File size ${this.formatFileSize(fileBuffer.length)} exceeds maximum allowed size ${this.formatFileSize(this.maxFileSize)}`);
    }

    // Format validation
    const fileExtension = filename.split('.').pop()?.toLowerCase();
    console.log('File validation:', { filename, fileExtension, supportedFormats: this.supportedFormats });
    
    if (!fileExtension || !this.supportedFormats.includes(fileExtension)) {
      throw new Error(`Unsupported video format: ${fileExtension}. Supported formats: ${this.supportedFormats.join(', ')}`);
    }

    // Magic number validation with smart detection
    const detectedFormat = this.detectActualFormat(fileBuffer);
    console.log('Format detection:', { 
      fileExtension, 
      detectedFormat, 
      headerMatch: fileExtension === detectedFormat 
    });
    
    // If extension doesn't match detected format, use detected format for validation
    const formatToValidate = detectedFormat || fileExtension;
    
    if (!this.validateMagicNumbers(fileBuffer, formatToValidate)) {
      throw new Error(`Invalid video file: file signature does not match expected format. Expected: ${fileExtension}, Detected: ${detectedFormat}`);
    }

    return true;
  }

  // Detect actual video format based on file signature
  detectActualFormat(buffer) {
    if (buffer.length < 8) return null;
    
    // Check for MP4 signature (ftyp at offset 4)
    if (buffer.length >= 8) {
      const ftyp = [0x66, 0x74, 0x79, 0x70]; // 'ftyp'
      let matches = true;
      for (let i = 0; i < 4; i++) {
        if (buffer[4 + i] !== ftyp[i]) {
          matches = false;
          break;
        }
      }
      if (matches) return 'mp4';
    }
    
    // Check for WebM/EBML signatures
    const webmSignatures = [
      [0x1A, 0x45, 0xDF, 0xA3], // Standard EBML
      [0x43, 0xC3, 0x82, 0x03], // Chrome/Edge MediaRecorder
      [0x43, 0xB6, 0x75, 0x01], // Alternative MediaRecorder
      [0x42, 0x82, 0x84, 0x77], // Firefox MediaRecorder
    ];
    
    for (const signature of webmSignatures) {
      let matches = true;
      for (let i = 0; i < signature.length && i < buffer.length; i++) {
        if (buffer[i] !== signature[i]) {
          matches = false;
          break;
        }
      }
      if (matches) return 'webm';
    }
    
    // Check for AVI signature
    const aviSignature = [0x52, 0x49, 0x46, 0x46]; // 'RIFF'
    if (buffer.length >= 4) {
      let matches = true;
      for (let i = 0; i < 4; i++) {
        if (buffer[i] !== aviSignature[i]) {
          matches = false;
          break;
        }
      }
      if (matches) return 'avi';
    }
    
    return null; // Unknown format
  }

  // Magic number validation for common video formats
  validateMagicNumbers(buffer, extension) {
    // Ensure buffer is long enough for basic validation
    if (buffer.length < 8) {
      console.log('Buffer too short for validation:', buffer.length);
      return false;
    }

    console.log('Validating file format:', extension);
    console.log('File header (first 12 bytes):', Array.from(buffer.slice(0, 12))
      .map(b => b.toString(16).padStart(2, '0')).join(' '));

    // MP4 validation - supports both regular and fragmented MP4
    if (extension === 'mp4') {
      console.log('Validating MP4 file...');
      // MP4 files can start with various box types:
      // - 'ftyp' at offset 4: standard MP4 file
      // - 'moof' at offset 4 or 0: fragmented MP4 (fMP4) - movie fragment box
      // - 'mdat' at offset 4 or 0: media data box (can be first in fragmented MP4)
      
      // Check for 'ftyp' at offset 4 (standard MP4)
      if (buffer.length >= 8) {
        const ftyp = [0x66, 0x74, 0x79, 0x70]; // 'ftyp'
        let matches = true;
        for (let i = 0; i < 4; i++) {
          if (buffer[4 + i] !== ftyp[i]) {
            matches = false;
            break;
          }
        }
        if (matches) {
          console.log('MP4 validation successful: found ftyp at offset 4');
          return true;
        }
      }
      
      // Check for 'moof' at offset 4 or 0 (fragmented MP4)
      const moof = [0x6D, 0x6F, 0x6F, 0x66]; // 'moof'
      for (let offset of [0, 4]) {
        if (buffer.length >= offset + 4) {
          let matches = true;
          for (let i = 0; i < 4; i++) {
            if (buffer[offset + i] !== moof[i]) {
              matches = false;
              break;
            }
          }
          if (matches) {
            return true;
          }
        }
      }
      
      // Check for 'mdat' at offset 4 or 0 (media data box, can be first in fragmented MP4)
      const mdat = [0x6D, 0x64, 0x61, 0x74]; // 'mdat'
      for (let offset of [0, 4]) {
        if (buffer.length >= offset + 4) {
          let matches = true;
          for (let i = 0; i < 4; i++) {
            if (buffer[offset + i] !== mdat[i]) {
              matches = false;
              break;
            }
          }
          if (matches) {
            return true;
          }
        }
      }
      
      console.log('MP4 file does not have expected magic numbers. Rejecting for processing.');
      console.log('Expected ftyp (66 74 79 70) at offset 4, got:', 
        Array.from(buffer.slice(4, 8)).map(b => b.toString(16).padStart(2, '0')).join(' '));
      return false;
    }

    // WebM validation - Enhanced to support browser-generated WebM files
    if (extension === 'webm') {
      if (buffer.length < 4) {
        return false;
      }
      
      // Standard EBML header
      const standardEBML = [0x1A, 0x45, 0xDF, 0xA3];
      
      // Common browser-generated WebM headers (MediaRecorder API variations)
      const browserWebMHeaders = [
        [0x43, 0xC3, 0x82, 0x03], // Chrome/Edge MediaRecorder common header
        [0x43, 0xB6, 0x75, 0x01], // Alternative MediaRecorder header
        [0x42, 0x82, 0x84, 0x77], // Firefox MediaRecorder header
        [0x42, 0x86, 0x81, 0x01], // Safari MediaRecorder header (if supported)
      ];
      
      // Check for standard EBML header first
      let isStandardWebM = true;
      for (let i = 0; i < 4; i++) {
        if (buffer[i] !== standardEBML[i]) {
          isStandardWebM = false;
          break;
        }
      }
      if (isStandardWebM) {
        console.log('Standard WebM EBML header detected');
        return true;
      }
      
      // Check for browser-generated WebM headers
      for (const header of browserWebMHeaders) {
        let matches = true;
        for (let i = 0; i < 4; i++) {
          if (buffer[i] !== header[i]) {
            matches = false;
            break;
          }
        }
        if (matches) {
          console.log(`Browser-generated WebM header detected: ${header.map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
          return true;
        }
      }
      
      // Additional validation: Check if it contains WebM-specific elements deeper in the file
      // Look for DocType "webm" or "matroska" in the first 100 bytes
      if (buffer.length >= 20) {
        const bufferStr = buffer.toString('ascii', 0, Math.min(100, buffer.length));
        if (bufferStr.includes('webm') || bufferStr.includes('matroska')) {
          console.log('WebM file detected by DocType signature');
          return true;
        }
      }
      
      // Log the actual header for debugging
      const actualHeader = Array.from(buffer.slice(0, 12))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ');
      console.log(`WebM validation failed. Actual header: ${actualHeader}`);
      console.log('WebM file does not have a recognized header. Rejecting for processing.');
      return false;
    }

    // AVI validation
    if (extension === 'avi') {
      const aviSignature = [0x52, 0x49, 0x46, 0x46]; // 'RIFF'
      if (buffer.length < 4) {
        return false;
      }
      for (let i = 0; i < 4; i++) {
        if (buffer[i] !== aviSignature[i]) {
          return false;
        }
      }
      return true;
    }

    // MOV validation
    if (extension === 'mov') {
      const movSignature = [0x6d, 0x6f, 0x6f, 0x76]; // 'moov'
      if (buffer.length < 8) {
        return false;
      }
      // Check for 'moov' at offset 4
      for (let i = 0; i < 4; i++) {
        if (buffer[4 + i] !== movSignature[i]) {
          return false;
        }
      }
      return true;
    }

    // MKV validation
    if (extension === 'mkv') {
      const mkvSignature = [0x1A, 0x45, 0xDF, 0xA3]; // EBML header
      if (buffer.length < 4) {
        return false;
      }
      for (let i = 0; i < 4; i++) {
        if (buffer[i] !== mkvSignature[i]) {
          return false;
        }
      }
      return true;
    }

    // MPEG validation
    if (extension === 'mpeg') {
      const mpegSignature1 = [0x00, 0x00, 0x01, 0xBA];
      const mpegSignature2 = [0x00, 0x00, 0x01, 0xB3];
      if (buffer.length < 4) {
        return false;
      }
      let matches1 = true;
      for (let i = 0; i < 4; i++) {
        if (buffer[i] !== mpegSignature1[i]) {
          matches1 = false;
          break;
        }
      }
      if (matches1) {
        return true;
      }
      let matches2 = true;
      for (let i = 0; i < 4; i++) {
        if (buffer[i] !== mpegSignature2[i]) {
          matches2 = false;
          break;
        }
      }
      return matches2;
    }

    // For other formats, return true if extension is in supported list
    // More specific validation can be added later if needed
    return true;
  }

  // Upload subtitle with transaction support
  async uploadSubtitle(fileBuffer, originalFilename, lessonId, languageCode, languageName = null, userId) {
    let transaction;
    
    try {
      // Start transaction
      transaction = await db.transaction();

      // Verify lesson belongs to user
      const lesson = await transaction('lessons')
        .join('courses', 'lessons.course_id', 'courses.id')
        .where('lessons.id', lessonId)
        .where('courses.created_by', userId)
        .select('lessons.*')
        .first();

      if (!lesson) {
        throw new Error('Lesson not found or access denied');
      }

      // Validate subtitle
      if (!this.validateSubtitleFile(fileBuffer, originalFilename)) {
        throw new Error('Invalid subtitle file format');
      }

      // Generate safe filename
      const safeFileName = this.sanitizeFilename(`subtitle_${lessonId}_${languageCode}_${Date.now()}_${originalFilename}`);
      
      // Upload to cloud storage
      const uploadResult = await cloudStorageService.uploadVideo(
        fileBuffer,
        safeFileName,
        this.getSubtitleContentType(originalFilename)
      );

      // Store subtitle info in database - FIXED INSERT OPERATION
      const subtitleInsertResult = await transaction('video_subtitles').insert({
        lesson_id: lessonId,
        language_code: languageCode,
        language_name: languageName || languageCode,
        subtitle_url: uploadResult.storageUrl || uploadResult.cdnUrl || uploadResult.signedUrl,
        file_size: fileBuffer.length,
        created_by: userId,
        created_at: new Date()
      });

      // Handle different database responses
      const subtitleId = Array.isArray(subtitleInsertResult) ? subtitleInsertResult[0] : subtitleInsertResult;

      await transaction.commit();

      console.log('Subtitle uploaded successfully:', { subtitleId, lessonId, languageCode });

      return {
        success: true,
        subtitleId,
        subtitleUrl: uploadResult.storageUrl || uploadResult.cdnUrl || uploadResult.signedUrl,
        fileSize: fileBuffer.length,
        languageCode,
        languageName: languageName || languageCode
      };

    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }
      console.error('Subtitle upload service error:', error);
      throw error;
    }
  }

  // Validate subtitle file
  validateSubtitleFile(fileBuffer, filename) {
    const extension = filename.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['vtt', 'srt', 'txt'];
    
    if (!extension || !allowedExtensions.includes(extension)) {
      return false;
    }

    // Basic validation for VTT files
    if (extension === 'vtt') {
      const content = fileBuffer.toString('utf8');
      return content.includes('WEBVTT');
    }

    return true;
  }

  // Delete video with transaction and cleanup
  async deleteVideo(lessonId, userId) {
    let transaction;
    
    try {
      transaction = await db.transaction();

      // Verify lesson belongs to user and get video info
      const lesson = await transaction('lessons')
        .join('courses', 'lessons.course_id', 'courses.id')
        .where('lessons.id', lessonId)
        .where('courses.created_by', userId)
        .select('lessons.video_id', 'videos.s3_key', 'videos.hls_url')
        .leftJoin('videos', 'lessons.video_id', 'videos.id')
        .first();

      if (!lesson) {
        throw new Error('Lesson not found or access denied');
      }

      if (lesson.video_id) {
        // Delete from cloud storage
        if (lesson.s3_key) {
          await cloudStorageService.deleteVideo(lesson.s3_key);
        }

        // Delete HLS files if they exist
        if (lesson.hls_url) {
          await this.cleanupHLSFiles(lesson.hls_url);
        }

        // Delete video record
        await transaction('videos').where({ id: lesson.video_id }).delete();
      }

      // Update lesson to remove video reference
      await transaction('lessons')
        .where({ id: lessonId })
        .update({
          video_id: null,
          video_url: null,
          updated_at: new Date()
        });

      await transaction.commit();

      console.log('Video deleted successfully:', lessonId);

      return { success: true, lessonId };

    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }
      console.error('Video deletion service error:', error);
      throw error;
    }
  }

  // Cleanup HLS files
  async cleanupHLSFiles(hlsUrl) {
    try {
      // Extract the HLS prefix from the URL
      const url = new URL(hlsUrl);
      const pathParts = url.pathname.split('/');
      const hlsPrefix = pathParts.slice(0, -1).join('/') + '/';
      
      // Delete the entire HLS directory
      // Note: This would require S3 list and delete operations
      // For now, we'll log the cleanup
      console.log('HLS cleanup required for prefix:', hlsPrefix);
      
    } catch (error) {
      console.error('HLS cleanup error:', error);
      // Don't throw - cleanup failures shouldn't block main operation
    }
  }

  // Update video status
  async updateVideoStatus(videoId, status, message = '') {
    try {
      const updateData = {
        status: status,
        updated_at: new Date()
      };

      if (status === 'processing') {
        updateData.processing_started_at = new Date();
        updateData.processing_error = null;
      } else if (status === 'ready') {
        updateData.processing_completed_at = new Date();
        updateData.processing_error = null;
      } else if (status === 'failed' || status === 'retrying') {
        updateData.processing_error = message;
      }

      await db('videos')
        .where({ id: videoId })
        .update(updateData);

      console.log(`Video ${videoId} status updated to: ${status}`);
    } catch (error) {
      console.error('Status update error:', error);
      throw error;
    }
  }

  // Get video processing status
  async getProcessingStatus(videoId) {
    try {
      const video = await db('videos')
        .where({ id: videoId })
        .select(
          'status',
          'processing_error',
          'processing_started_at',
          'processing_completed_at',
          'processing_attempts'
        )
        .first();

      if (!video) {
        throw new Error('Video not found');
      }

      return {
        videoId,
        status: video.status,
        error: video.processing_error,
        startedAt: video.processing_started_at,
        completedAt: video.processing_completed_at,
        attempts: video.processing_attempts || 0
      };
    } catch (error) {
      console.error('Get processing status error:', error);
      throw error;
    }
  }

  // Utility methods
  sanitizeFilename(filename) {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.{2,}/g, '.')
      .substring(0, 255);
  }

  getMimeType(filename) {
    const extension = filename.split('.').pop()?.toLowerCase();
    const mimeTypes = {
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'mov': 'video/quicktime',
      'avi': 'video/x-msvideo',
      'mpeg': 'video/mpeg',
      'mkv': 'video/x-matroska',
      'wmv': 'video/x-ms-wmv'
    };
    return mimeTypes[extension] || 'video/mp4';
  }

  getSubtitleContentType(filename) {
    const extension = filename.split('.').pop()?.toLowerCase();
    const types = {
      'vtt': 'text/vtt',
      'srt': 'application/x-subrip',
      'txt': 'text/plain'
    };
    return types[extension] || 'text/plain';
  }

  generateContentHash(buffer) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  formatFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  // Health check
  async healthCheck() {
    try {
      // Test database connection
      await db.raw('SELECT 1');
      
      // Test cloud storage (basic check)
      const storageHealth = await cloudStorageService.healthCheck();
      
      return {
        service: 'VideoProcessingService',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
        cloudStorage: storageHealth,
        supportedFormats: this.supportedFormats,
        maxFileSize: this.formatFileSize(this.maxFileSize)
      };
    } catch (error) {
      return {
        service: 'VideoProcessingService',
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  // Get service statistics
  async getStatistics() {
    try {
      const stats = await db('videos')
        .select('status')
        .count('* as count')
        .groupBy('status');

      const totalSize = await db('videos')
        .sum('size_bytes as total_bytes')
        .first();

      return {
        totalVideos: stats.reduce((sum, item) => sum + parseInt(item.count), 0),
        byStatus: stats.reduce((acc, item) => {
          acc[item.status] = parseInt(item.count);
          return acc;
        }, {}),
        totalStorage: this.formatFileSize(parseInt(totalSize?.total_bytes || 0)),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Get statistics error:', error);
      throw error;
    }
  }
}

module.exports = new VideoProcessingService();