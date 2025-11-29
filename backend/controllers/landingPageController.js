const db = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const muxService = require('../services/muxService');

// File filter for video files
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only video files are allowed!'), false);
  }
};

// Local file storage fallback
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/landing');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `landing-hero-${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const localUpload = multer({
  storage: localStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Configure multer for temporary video uploads (to Mux)
const storage = multer.memoryStorage();

// Configure multer upload
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit for Mux
  }
});

const landingPageController = {
  // Get all landing page content
  async getContent(req, res) {
    const defaultContent = {
      hero: {
        badge: 'For Ethiopian Orthodox Youths',
        title: 'Transform Your',
        titleGradient: 'Learning Journey',
        description: 'Join our faith-centered learning community. Access courses, track progress, and grow in your spiritual journey.',
        videoUrl: '',
        showVideo: false
      },
      about: {
        badge: 'Our Mission',
        title: 'Empowering Ethiopian Orthodox Youths',
        description: 'Empowering Ethiopian Orthodox youths through faith-centered education. Nurturing spiritual growth with quality learning that honors our traditions.',
        features: [
          {
            icon: 'BookOpen',
            title: 'Comprehensive Learning',
            description: 'Access courses covering theology, history, traditions, and more.'
          },
          {
            icon: 'Users',
            title: 'Community Support',
            description: 'Connect with fellow learners and experienced teachers.'
          },
          {
            icon: 'Award',
            title: 'Track Progress',
            description: 'Monitor your learning journey and celebrate achievements.'
          }
        ]
      },
      howItWorks: {
        badge: 'Simple Process',
        title: 'How It Works',
        description: 'Start your learning journey in minutes',
        steps: [
          {
            step: '01',
            icon: 'User',
            title: 'Create Account',
            description: 'Sign up for free and join our community of learners',
            features: ['Free forever', 'No credit card', 'Instant access']
          },
          {
            step: '02',
            icon: 'BookOpen',
            title: 'Browse Courses',
            description: 'Explore our comprehensive library of faith-based courses',
            features: ['500+ courses', 'Expert teachers', 'Self-paced']
          },
          {
            step: '03',
            icon: 'PlayCircle',
            title: 'Start Learning',
            description: 'Watch videos, complete lessons, and track your progress',
            features: ['HD videos', 'Interactive quizzes', 'Progress tracking']
          },
          {
            step: '04',
            icon: 'Award',
            title: 'Earn Achievements',
            description: 'Complete courses, earn badges, and grow in your faith journey',
            features: ['Certificates', 'Badges', 'Leaderboards']
          }
        ]
      },
      resources: {
        badge: 'Resources',
        title: 'Helpful Resources',
        description: 'Access a library of spiritual and educational materials.'
      },
      videos: [
        {
          title: 'Introduction to EOTY',
          description: 'Learn about our mission and values.',
          thumbnail: 'https://source.unsplash.com/random/800x600?church',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
        },
        {
          title: 'Spiritual Growth',
          description: 'Guidance for your daily walk with God.',
          thumbnail: 'https://source.unsplash.com/random/800x600?prayer',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
        },
        {
          title: 'Community Life',
          description: 'Experience the joy of fellowship.',
          thumbnail: 'https://source.unsplash.com/random/800x600?community',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
        }
      ],
      blogs: {
        badge: 'Latest Updates',
        title: 'From Our Blog',
        description: 'Read the latest news and articles.',
        count: 3
      }
    };

    try {
      // Check if table exists
      const tableExists = await db.schema.hasTable('landing_page_content');
      if (!tableExists) {
        // Return default content if table doesn't exist
        console.warn('landing_page_content table does not exist. Returning default content.');
        return res.json({
          success: true,
          data: defaultContent
        });
      }

      const content = await db('landing_page_content')
        .where({ is_active: true })
        .first();

      if (!content) {
        // Return default content if none exists
        return res.json({
          success: true,
          data: defaultContent
        });
      }

      // Merge existing content with default structure to ensure all sections exist
      const existingContent = JSON.parse(content.content_json);
      
      const mergedContent = {
        ...defaultContent,
        ...existingContent,
        // Ensure each section exists and has default values if missing
        hero: { ...defaultContent.hero, ...(existingContent.hero || {}) },
        about: { ...defaultContent.about, ...(existingContent.about || {}) },
        howItWorks: { ...defaultContent.howItWorks, ...(existingContent.howItWorks || {}) },
        resources: { ...defaultContent.resources, ...(existingContent.resources || {}) },
        videos: existingContent.videos || defaultContent.videos,
        blogs: { ...defaultContent.blogs, ...(existingContent.blogs || {}) }
      };

      res.json({
        success: true,
        data: mergedContent
      });
    } catch (error) {
      console.error('Error fetching landing page content:', error);
      // Return default content on error to prevent UI breakage
      res.json({
        success: true,
        data: defaultContent
      });
    }
  },

  // Update landing page content (admin only)
  async updateContent(req, res) {
    try {
      
      const { section, content } = req.body;
      const userId = req.user.userId;

      // Validate input
      if (!section || !content) {
        console.log('❌ Validation failed: section or content missing');
        return res.status(400).json({
          success: false,
          message: 'Section and content are required'
        });
      }

      // Verify admin permissions
      const user = await db('users').where({ id: userId }).first();
      if (!user || user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      // Check if table exists, if not return helpful error
      const tableExists = await db.schema.hasTable('landing_page_content');
      if (!tableExists) {
        console.error('landing_page_content table does not exist. Please run migrations.');
        return res.status(500).json({
          success: false,
          message: 'Database table not found. Please run migrations: npm run migrate'
        });
      }

      // Get existing content
      console.log('📖 Fetching existing content...');
      let existingContent = await db('landing_page_content')
        .where({ is_active: true })
        .first();

      let contentData = existingContent 
        ? JSON.parse(existingContent.content_json)
        : {};

      console.log('📝 Existing content found:', !!existingContent);

      // Update specific section
      contentData[section] = content;
      console.log(`✅ Updated section "${section}" in content data`);

      if (existingContent) {
        // Update existing
        console.log('💾 Updating existing record...');
        await db('landing_page_content')
          .where({ id: existingContent.id })
          .update({
            content_json: JSON.stringify(contentData),
            updated_at: new Date(),
            updated_by: userId.toString()
          });
        console.log('✅ Record updated successfully');
      } else {
        // Create new
        console.log('➕ Creating new record...');
        await db('landing_page_content').insert({
          content_json: JSON.stringify(contentData),
          is_active: true,
          created_by: userId.toString(),
          updated_by: userId.toString()
        });
        console.log('✅ New record created successfully');
      }

      console.log('📤 Sending success response');
      res.json({
        success: true,
        message: 'Landing page content updated successfully',
        data: contentData
      });
    } catch (error) {
      console.error('❌ Error updating landing page content:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update landing page content',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  },

  // Get testimonials
  async getTestimonials(req, res) {
    try {
      const testimonials = await db('testimonials')
        .where({ is_active: true })
        .orderBy('display_order', 'asc')
        .select('id', 'name', 'role', 'content', 'rating', 'image_url');

      res.json({
        success: true,
        data: { testimonials }
      });
    } catch (error) {
      console.error('Error fetching testimonials:', error);
      // Return empty list on error
      res.json({
        success: true,
        data: { testimonials: [] }
      });
    }
  },

  // Add/Update testimonial (admin only)
  async saveTestimonial(req, res) {
    try {
      const { id, name, role, content, rating, imageUrl, displayOrder } = req.body;
      const userId = req.user.userId;

      // Verify admin permissions
      const user = await db('users').where({ id: userId }).first();
      if (!user || user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      if (id) {
        // Update existing
        await db('testimonials')
          .where({ id })
          .update({
            name,
            role,
            content,
            rating,
            image_url: imageUrl,
            display_order: displayOrder,
            updated_at: db.fn.now()
          });
      } else {
        // Create new
        await db('testimonials').insert({
          name,
          role,
          content,
          rating,
          image_url: imageUrl,
          display_order: displayOrder || 0,
          is_active: true,
          created_by: userId
        });
      }

      res.json({
        success: true,
        message: 'Testimonial saved successfully'
      });
    } catch (error) {
      console.error('Error saving testimonial:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save testimonial'
      });
    }
  },

  // Delete testimonial (admin only)
  async deleteTestimonial(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      // Verify admin permissions
      const user = await db('users').where({ id: userId }).first();
      if (!user || user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      await db('testimonials')
        .where({ id })
        .update({ is_active: false, updated_at: db.fn.now() });

      res.json({
        success: true,
        message: 'Testimonial deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting testimonial:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete testimonial'
      });
    }
  },

  // Upload video for landing page
  uploadVideo: [
    upload.single('video'),
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({
            success: false,
            message: 'No video file provided'
          });
        }

        console.log('🎬 Starting video upload for landing page...');

        // Try Mux upload first
        try {
          console.log('🎬 Attempting Mux upload...');
          const muxResult = await muxService.uploadVideoBuffer({
            buffer: req.file.buffer,
            filename: req.file.originalname,
            contentType: req.file.mimetype,
            metadata: {
              title: 'Landing Page Hero Video',
              description: 'Hero video for the landing page'
            }
          });

          console.log('✅ Mux upload successful:', muxResult);

          // Return Mux playback URL
          const videoUrl = muxResult.playbackUrl;

          return res.json({
            success: true,
            message: 'Video uploaded to Mux successfully',
            data: {
              videoUrl: videoUrl,
              muxAssetId: muxResult.assetId,
              muxPlaybackId: muxResult.playbackId,
              filename: req.file.originalname,
              size: req.file.size,
              storage: 'mux'
            }
          });

        } catch (muxError) {
          console.log('⚠️  Mux upload failed, trying local storage fallback...');

          // Check if this is a limit error - if so, use local storage
          if (muxError.message && muxError.message.includes('10 assets') && muxError.message.includes('exceeding this limit')) {
            console.log('📁 Using local storage due to Mux limit...');

            // Save to local storage as fallback
            const uploadDir = path.join(__dirname, '../uploads/landing');
            if (!fs.existsSync(uploadDir)) {
              fs.mkdirSync(uploadDir, { recursive: true });
            }

            const filename = `landing-hero-${Date.now()}-${req.file.originalname}`;
            const filePath = path.join(uploadDir, filename);

            fs.writeFileSync(filePath, req.file.buffer);

            // Create a URL for the local file
            const videoUrl = `/uploads/landing/${filename}`;

            return res.json({
              success: true,
              message: 'Video uploaded to local storage (Mux limit reached)',
              data: {
                videoUrl: videoUrl,
                filename: filename,
                size: req.file.size,
                storage: 'local'
              }
            });
          }

          // Re-throw other Mux errors
          throw muxError;
        }

      } catch (error) {
        console.error('❌ Error uploading video to Mux:', error);

        // Check if this is a Mux free tier limit error
        if (error.message && error.message.includes('10 assets') && error.message.includes('exceeding this limit')) {
          return res.status(402).json({
            success: false,
            message: 'Mux free tier limit exceeded',
            error: 'Your Mux account has reached the free tier limit of 10 video assets. Please upgrade your Mux plan or delete existing videos to upload new ones.',
            userMessage: 'Video upload limit reached. Please contact support to upgrade your video storage plan.'
          });
        }

        // Check for other Mux API errors
        if (error.message && error.message.includes('Failed to create Mux direct upload')) {
          return res.status(500).json({
            success: false,
            message: 'Video upload service temporarily unavailable',
            error: 'Mux video service is currently unavailable. Please try again later.',
            userMessage: 'Video upload service is currently unavailable. Please try again later.'
          });
        }

        res.status(500).json({
          success: false,
          message: 'Failed to upload video to Mux',
          error: error.message
        });
      }
    }
  ]
};

module.exports = landingPageController;

