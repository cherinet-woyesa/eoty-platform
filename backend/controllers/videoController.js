const db = require('../config/database');
const { upload } = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

const videoController = {
  // Upload video for a lesson
  async uploadVideo(req, res) {
    try {
      const teacherId = req.user.userId;
      const { lessonId } = req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No video file provided'
        });
      }

      if (!lessonId) {
        return res.status(400).json({
          success: false,
          message: 'Lesson ID is required'
        });
      }

      // Verify the lesson belongs to the teacher
      const lesson = await db('lessons')
        .join('courses', 'lessons.course_id', 'courses.id')
        .where('lessons.id', lessonId)
        .where('courses.teacher_id', teacherId)
        .select('lessons.*')
        .first();

      if (!lesson) {
        return res.status(404).json({
          success: false,
          message: 'Lesson not found or access denied'
        });
      }

      // Generate unique filename
      const fileExtension = path.extname(req.file.originalname);
      const fileName = `video_${lessonId}_${Date.now()}${fileExtension}`;
      const filePath = path.join('uploads/videos', fileName);

      // Ensure uploads directory exists
      const uploadsDir = path.join('uploads', 'videos');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Save file (in production, this would upload to S3)
      fs.writeFileSync(filePath, req.file.buffer);

      // Update lesson with video URL
      const videoUrl = `/api/videos/stream/${fileName}`;
      await db('lessons')
        .where({ id: lessonId })
        .update({
          video_url: videoUrl,
          updated_at: new Date()
        });

      res.json({
        success: true,
        message: 'Video uploaded successfully',
        data: {
          videoUrl,
          lesson: {
            ...lesson,
            video_url: videoUrl
          }
        }
      });
    } catch (error) {
      console.error('Video upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload video'
      });
    }
  },

  // Stream video file
  async streamVideo(req, res) {
    try {
      const { filename } = req.params;
      const filePath = path.join('uploads/videos', filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'Video not found'
        });
      }

      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        // Handle range requests for video streaming
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(filePath, { start, end });
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/mp4',
        };
        res.writeHead(206, head);
        file.pipe(res);
      } else {
        const head = {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
        };
        res.writeHead(200, head);
        fs.createReadStream(filePath).pipe(res);
      }
    } catch (error) {
      console.error('Video stream error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to stream video'
      });
    }
  },

  // Get lessons for a course
  async getCourseLessons(req, res) {
    try {
      const teacherId = req.user.userId;
      const { courseId } = req.params;

      // Verify course belongs to teacher
      const course = await db('courses')
        .where({ id: courseId, teacher_id: teacherId })
        .first();

      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      const lessons = await db('lessons')
        .where({ course_id: courseId })
        .select('*')
        .orderBy('order_number', 'asc');

      res.json({
        success: true,
        data: { lessons }
      });
    } catch (error) {
      console.error('Get lessons error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch lessons'
      });
    }
  }
};

module.exports = videoController;