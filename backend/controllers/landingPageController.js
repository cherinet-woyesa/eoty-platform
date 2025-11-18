const db = require('../config/database');

const landingPageController = {
  // Get all landing page content
  async getContent(req, res) {
    try {
      const content = await db('landing_page_content')
        .where({ is_active: true })
        .first();

      if (!content) {
        // Return default content if none exists
        return res.json({
          success: true,
          data: {
            hero: {
              badge: 'For Ethiopian Orthodox Youths',
              title: 'Transform Your',
              titleGradient: 'Learning Journey',
              description: 'Join our faith-centered learning community. Access courses, track progress, and grow in your spiritual journey.'
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
            }
          }
        });
      }

      res.json({
        success: true,
        data: JSON.parse(content.content_json)
      });
    } catch (error) {
      console.error('Error fetching landing page content:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch landing page content'
      });
    }
  },

  // Update landing page content (admin only)
  async updateContent(req, res) {
    try {
      const { section, content } = req.body;
      const userId = req.user.userId;

      // Verify admin permissions
      const user = await db('users').where({ id: userId }).first();
      if (!user || user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      // Get existing content
      let existingContent = await db('landing_page_content')
        .where({ is_active: true })
        .first();

      let contentData = existingContent 
        ? JSON.parse(existingContent.content_json)
        : {};

      // Update specific section
      contentData[section] = content;

      if (existingContent) {
        // Update existing
        await db('landing_page_content')
          .where({ id: existingContent.id })
          .update({
            content_json: JSON.stringify(contentData),
            updated_at: db.fn.now(),
            updated_by: userId
          });
      } else {
        // Create new
        await db('landing_page_content').insert({
          content_json: JSON.stringify(contentData),
          is_active: true,
          created_by: userId,
          updated_by: userId
        });
      }

      res.json({
        success: true,
        message: 'Landing page content updated successfully',
        data: contentData
      });
    } catch (error) {
      console.error('Error updating landing page content:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update landing page content'
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
      res.status(500).json({
        success: false,
        message: 'Failed to fetch testimonials'
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
  }
};

module.exports = landingPageController;

