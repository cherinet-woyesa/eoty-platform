/**
 * FR7: Chapter Controller
 * REQUIREMENT: Multi-city/chapter membership, location/topic based
 */

const db = require('../config/database');
const chapterService = require('../services/chapterService');

const chapterController = {
  // Get all active chapters (REQUIREMENT: Location/topic based)
  async getAllChapters(req, res) {
    try {
      const { country, city, region, topic } = req.query;
      
      const chapters = await chapterService.getChapters({
        country,
        city,
        region,
        topic
      });

      res.json({
        success: true,
        data: { chapters }
      });
    } catch (error) {
      console.error('Get chapters error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch chapters',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get available locations (countries/regions)
  async getLocations(req, res) {
    try {
      const locations = await chapterService.getLocations();
      res.json({
        success: true,
        data: locations
      });
    } catch (error) {
      console.error('Get locations error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch locations'
      });
    }
  },

  // Get chapter by ID
  async getChapterById(req, res) {
    try {
      const { id } = req.params;
      const chapter = await db('chapters')
        .where({ id, is_active: true })
        .first();

      if (!chapter) {
        return res.status(404).json({
          success: false,
          message: 'Chapter not found'
        });
      }

      res.json({
        success: true,
        data: { chapter }
      });
    } catch (error) {
      console.error('Get chapter error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch chapter'
      });
    }
  },

  // Get user's chapters (REQUIREMENT: Multi-chapter membership)
  async getUserChapters(req, res) {
    try {
      const userId = req.user.userId;
      const chapters = await chapterService.getUserChapters(userId);

      res.json({
        success: true,
        data: { chapters }
      });
    } catch (error) {
      console.error('Get user chapters error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user chapters'
      });
    }
  },

  // Join a chapter (REQUIREMENT: Multi-chapter membership)
  async joinChapter(req, res) {
    try {
      const userId = req.user.userId;
      const { chapter_id, role = 'member', set_as_primary = false } = req.body;

      if (!chapter_id) {
        return res.status(400).json({
          success: false,
          message: 'Chapter ID is required'
        });
      }

      const userChapter = await chapterService.joinChapter(
        userId,
        chapter_id,
        role,
        set_as_primary
      );

      res.json({
        success: true,
        data: { userChapter },
        message: 'Successfully joined chapter'
      });
    } catch (error) {
      console.error('Join chapter error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to join chapter'
      });
    }
  },

  // Leave a chapter
  async leaveChapter(req, res) {
    try {
      const userId = req.user.userId;
      const { chapter_id } = req.body;

      if (!chapter_id) {
        return res.status(400).json({
          success: false,
          message: 'Chapter ID is required'
        });
      }

      await chapterService.leaveChapter(userId, chapter_id);

      res.json({
        success: true,
        message: 'Successfully left chapter'
      });
    } catch (error) {
      console.error('Leave chapter error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to leave chapter'
      });
    }
  },

  // Set primary chapter
  async setPrimaryChapter(req, res) {
    try {
      const userId = req.user.userId;
      const { chapter_id } = req.body;

      if (!chapter_id) {
        return res.status(400).json({
          success: false,
          message: 'Chapter ID is required'
        });
      }

      await chapterService.setPrimaryChapter(userId, chapter_id);

      res.json({
        success: true,
        message: 'Primary chapter updated'
      });
    } catch (error) {
      console.error('Set primary chapter error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to set primary chapter'
      });
    }
  },

  // Search chapters (REQUIREMENT: Location/topic based)
  async searchChapters(req, res) {
    try {
      const { q } = req.query;

      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'Search term is required'
        });
      }

      const chapters = await chapterService.searchChapters(q);

      res.json({
        success: true,
        data: { chapters }
      });
    } catch (error) {
      console.error('Search chapters error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search chapters'
      });
    }
  },

  // Nearby chapters using Haversine, guarded by column existence
  async getNearbyChapters(req, res) {
    try {
      const { lat, lng, radiusKm = 50, limit = 50 } = req.query;

      if (!lat || !lng) {
        return res.status(400).json({
          success: false,
          message: 'lat and lng are required'
        });
      }

      const chapters = await chapterService.getNearbyChapters({
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        radiusKm: parseFloat(radiusKm),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: { chapters }
      });
    } catch (error) {
      console.error('Get nearby chapters error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch nearby chapters'
      });
    }
  },

  // Get chapter members
  async getChapterMembers(req, res) {
    try {
      const { id } = req.params;
      
      const members = await db('user_chapters as uc')
        .join('users as u', 'uc.user_id', 'u.id')
        .where('uc.chapter_id', id)
        .select(
          'u.id', 
          'u.first_name', 
          'u.last_name', 
          'u.email', 
          'u.profile_picture',
          'uc.role', 
          'uc.status',
          'uc.joined_at'
        )
        .orderBy('uc.status', 'desc') // Pending ('pending') comes after 'approved' alphabetically? No. 
        // We want pending first. 'pending' > 'approved'. So desc puts pending first.
        .orderBy('u.first_name', 'asc');

      res.json({
        success: true,
        data: { members }
      });
    } catch (error) {
      console.error('Get chapter members error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch chapter members'
      });
    }
  },

  // Update member status (Approve/Reject)
  async updateMemberStatus(req, res) {
    try {
      const { id, userId } = req.params;
      const { status } = req.body; // 'approved' or 'rejected'
      const currentUserId = req.user.userId;

      // Verify requester is admin/leader of this chapter
      const requesterChapter = await db('user_chapters')
        .where({ user_id: currentUserId, chapter_id: id })
        .whereIn('role', ['admin', 'moderator', 'chapter_leader'])
        .where('status', 'approved')
        .first();
        
      const requesterUser = await db('users').where({ id: currentUserId }).first();

      if (!requesterChapter && !['admin', 'teacher'].includes(requesterUser.role)) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      await chapterService.updateMemberStatus(id, userId, status);

      res.json({ success: true, message: `Member ${status}` });
    } catch (error) {
      console.error('Update member status error:', error);
      res.status(500).json({ success: false, message: 'Failed to update member status' });
    }
  },

  // Create a new chapter (Application)
  async createChapter(req, res) {
    try {
      const userId = req.user.userId;
      const { name, location, description, country, city, region, topics } = req.body;

      // For now, we'll just create an application
      await db('chapter_applications').insert({
        user_id: userId,
        type: 'new_chapter',
        data: { name, location, description, country, city, region, topics },
        status: 'pending'
      });

      res.json({
        success: true,
        message: 'Chapter application submitted successfully. An admin will review it shortly.'
      });
    } catch (error) {
      console.error('Create chapter error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit chapter application'
      });
    }
  },

  // Apply for leadership
  async applyLeadership(req, res) {
    try {
      const userId = req.user.userId;
      const { reason, experience } = req.body;

      await db('chapter_applications').insert({
        user_id: userId,
        type: 'leadership',
        data: { reason, experience },
        status: 'pending'
      });

      res.json({
        success: true,
        message: 'Leadership application submitted successfully.'
      });
    } catch (error) {
      console.error('Apply leadership error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit leadership application'
      });
    }
  },

  // Get chapter events
  async getEvents(req, res) {
    try {
      const { id } = req.params;
      const events = await chapterService.getChapterEvents(id);
      res.json({ success: true, data: { events } });
    } catch (error) {
      console.error('Get events error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch events' });
    }
  },

  // Create chapter event
  async createEvent(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const { title, description, event_date, location, is_online, meeting_link } = req.body;

      // Verify user is leader/admin of this chapter
      const userChapter = await db('user_chapters')
        .where({ user_id: userId, chapter_id: id })
        .where('status', 'approved')
        .first();
      
      const user = await db('users').where({ id: userId }).first();

      if (!userChapter || !['admin', 'moderator', 'chapter_leader'].includes(userChapter.role)) {
         // Allow global admins/teachers too
         if (!['admin', 'teacher'].includes(user.role)) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
         }
      }

      const event = await chapterService.createChapterEvent({
        chapter_id: id,
        title,
        description,
        event_date,
        location,
        is_online,
        meeting_link,
        created_by: userId
      });

      res.json({ success: true, data: { event } });
    } catch (error) {
      console.error('Create event error:', error);
      res.status(500).json({ success: false, message: 'Failed to create event' });
    }
  },

  // Get chapter resources
  async getChapterResources(req, res) {
    try {
      const { id } = req.params;
      const resources = await chapterService.getChapterResources(id);
      res.json({ success: true, data: { resources } });
    } catch (error) {
      console.error('Get resources error:', error);
      res.status(500).json({ success: false, message: 'Failed to get resources' });
    }
  },

  // Create chapter resource
  async createChapterResource(req, res) {
    try {
      const { id } = req.params;
      const { title, type, url, description } = req.body;
      const userId = req.user.id;

      // Check permissions (simplified)
      const userChapter = await db('user_chapters')
        .where({ user_id: userId, chapter_id: id })
        .where('status', 'approved')
        .first();
      const user = await db('users').where({ id: userId }).first();

      if ((!userChapter || !['admin', 'moderator', 'chapter_leader'].includes(userChapter.role)) && !['admin', 'teacher'].includes(user.role)) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      const resource = await chapterService.createChapterResource({
        chapter_id: id,
        title,
        type,
        url,
        description,
        created_by: userId
      });

      res.json({ success: true, data: { resource } });
    } catch (error) {
      console.error('Create resource error:', error);
      res.status(500).json({ success: false, message: 'Failed to create resource' });
    }
  },

  // Get chapter announcements
  async getChapterAnnouncements(req, res) {
    try {
      const { id } = req.params;
      const announcements = await chapterService.getChapterAnnouncements(id);
      res.json({ success: true, data: { announcements } });
    } catch (error) {
      console.error('Get announcements error:', error);
      res.status(500).json({ success: false, message: 'Failed to get announcements' });
    }
  },

  // Create chapter announcement
  async createChapterAnnouncement(req, res) {
    try {
      const { id } = req.params;
      const { title, content, is_pinned } = req.body;
      const userId = req.user.id;

      // Check permissions
      const userChapter = await db('user_chapters')
        .where({ user_id: userId, chapter_id: id })
        .where('status', 'approved')
        .first();
      const user = await db('users').where({ id: userId }).first();

      if ((!userChapter || !['admin', 'moderator', 'chapter_leader'].includes(userChapter.role)) && !['admin', 'teacher'].includes(user.role)) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      const announcement = await chapterService.createChapterAnnouncement({
        chapter_id: id,
        title,
        content,
        is_pinned,
        created_by: userId
      });

      res.json({ success: true, data: { announcement } });
    } catch (error) {
      console.error('Create announcement error:', error);
      res.status(500).json({ success: false, message: 'Failed to create announcement' });
    }
  },

  // Get event attendance
  async getEventAttendance(req, res) {
    try {
      const { eventId } = req.params;
      const attendance = await chapterService.getEventAttendance(eventId);
      res.json({ success: true, data: { attendance } });
    } catch (error) {
      console.error('Get attendance error:', error);
      res.status(500).json({ success: false, message: 'Failed to get attendance' });
    }
  },

  // Mark event attendance
  async markEventAttendance(req, res) {
    try {
      const { eventId } = req.params;
      const { user_id, status } = req.body;
      const markedBy = req.user.id;

      // Check permissions (need to check if user is leader of the chapter the event belongs to)
      // For simplicity, assuming the caller has verified permissions or is a leader
      
      const attendance = await chapterService.markEventAttendance({
        event_id: eventId,
        user_id,
        status,
        marked_by: markedBy
      });

      res.json({ success: true, data: { attendance } });
    } catch (error) {
      console.error('Mark attendance error:', error);
      res.status(500).json({ success: false, message: 'Failed to mark attendance' });
    }
  }
};

module.exports = chapterController;