const Queue = require('bull');
const videoTranscodingService = require('./videoTranscodingService');
const db = require('../config/database');

class QueueService {
  constructor() {
    this.transcodingQueue = new Queue('video transcoding', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD
      },
      defaultJobOptions: {
        removeOnComplete: 100, // Keep last 100 jobs
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000
        }
      }
    });

    this.setupQueueProcessors();
  }

  setupQueueProcessors() {
    // Process transcoding jobs
    this.transcodingQueue.process('transcode-video', 2, async (job) => {
      const { fileBuffer, originalFilename, lessonId, userId, s3Key } = job.data;
      
      try {
        console.log(`Processing transcoding job for lesson: ${lessonId}`);
        
        const result = await videoTranscodingService.transcodeVideo(
          fileBuffer,
          originalFilename,
          lessonId,
          userId
        );

        // Update job progress
        job.progress(100);

        return result;
      } catch (error) {
        console.error(`Transcoding job failed for lesson ${lessonId}:`, error);
        
        // Update video status to failed
        await db('videos')
          .where({ lesson_id: lessonId })
          .update({
            status: 'failed',
            processing_error: error.message,
            updated_at: new Date()
          });

        throw error;
      }
    });

    // Queue event handlers
    this.transcodingQueue.on('completed', (job, result) => {
      console.log(`Transcoding job completed for lesson: ${job.data.lessonId}`);
    });

    this.transcodingQueue.on('failed', (job, error) => {
      console.error(`Transcoding job failed for lesson: ${job.data.lessonId}`, error);
    });

    this.transcodingQueue.on('stalled', (job) => {
      console.warn(`Transcoding job stalled for lesson: ${job.data.lessonId}`);
    });
  }

  // Add transcoding job to queue
  async queueVideoTranscoding(fileBuffer, originalFilename, lessonId, userId, s3Key) {
    const job = await this.transcodingQueue.add('transcode-video', {
      fileBuffer,
      originalFilename,
      lessonId,
      userId,
      s3Key
    }, {
      jobId: `transcode-${lessonId}-${Date.now()}`
    });

    console.log(`Queued transcoding job: ${job.id} for lesson: ${lessonId}`);
    return job;
  }

  // Get job progress
  async getJobProgress(jobId) {
    const job = await this.transcodingQueue.getJob(jobId);
    if (!job) return null;

    return {
      id: job.id,
      progress: job.progress(),
      state: await job.getState(),
      data: job.data,
      failedReason: job.failedReason
    };
  }

  // Clean old jobs
  async cleanOldJobs() {
    await this.transcodingQueue.clean(1000, 'completed');
    await this.transcodingQueue.clean(1000, 'failed');
  }

  // Get queue stats
  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.transcodingQueue.getWaiting(),
      this.transcodingQueue.getActive(),
      this.transcodingQueue.getCompleted(),
      this.transcodingQueue.getFailed(),
      this.transcodingQueue.getDelayed()
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length
    };
  }
}

module.exports = new QueueService();