// backend/controllers/journeyController.js
// Spiritual Journeys (curated learning paths)

const db = require('../config/database');

async function getUserChapterAndRole(userId) {
  const user = await db('users')
    .where({ id: userId })
    .select('role', 'chapter_id')
    .first();
  // Default to base user role if none found
  return user || { role: 'user', chapter_id: null };
}

// Map user role to default audience
function getAudienceForRole(role) {
  if (!role) return 'user';
  if (role === 'admin') return 'admin';
  if (role === 'teacher') return 'teacher';
  if (role === 'user' || role === 'student') return 'user';
  return 'user';
}

// Compute item progress for a single journey item
async function getItemProgress(userId, item) {
  if (item.item_type === 'course') {
    // Progress based on completed lessons in course
    const totalLessonsRow = await db('lessons')
      .where({ course_id: item.item_id })
      .count('id as count')
      .first();

    const totalLessons = parseInt(totalLessonsRow?.count || 0, 10);
    if (totalLessons === 0) return 0;

    const completedRow = await db('user_lesson_progress as ulp')
      .join('lessons as l', 'ulp.lesson_id', 'l.id')
      .where('ulp.user_id', userId)
      .where('l.course_id', item.item_id)
      .where('ulp.is_completed', true)
      .countDistinct('ulp.lesson_id as count')
      .first();

    const completedLessons = parseInt(completedRow?.count || 0, 10);
    return Math.min(completedLessons / totalLessons, 1);
  }

  if (item.item_type === 'resource') {
    // Consider resource "done" if user has viewed it at least once
    const viewed = await db('resource_usage')
      .where({
        user_id: userId,
        resource_id: item.item_id,
        action: 'view',
      })
      .first();
    return viewed ? 1 : 0;
  }

  return 0;
}

// Compute overall journey progress for a user
async function computeJourneyProgress(userId, journeyId) {
  const items = await db('journey_items')
    .where({ journey_id: journeyId })
    .orderBy('order_index', 'asc');

  if (!items.length) {
    return { progress: 0, itemProgress: [] };
  }

  const itemProgress = [];
  let sum = 0;

  for (const item of items) {
    const p = await getItemProgress(userId, item);
    itemProgress.push({
      id: item.id,
      item_type: item.item_type,
      item_id: item.item_id,
      order_index: item.order_index,
      progress: p,
    });
    sum += p;
  }

  const overall = sum / items.length;
  return {
    progress: Number((overall * 100).toFixed(1)),
    itemProgress,
  };
}

const journeyController = {
  // List journeys visible to the current user (student/teacher/admin)
  async listJourneys(req, res) {
    try {
      const userId = req.user.userId;
      const { role, chapter_id } = await getUserChapterAndRole(userId);
      const audience = getAudienceForRole(role);

      let query = db('journeys')
        .where({ is_active: true });

      // Audience filter: journey audience must match user audience or be 'all'
      query = query.where((builder) => {
        builder
          .where('audience', audience)
          .orWhere('audience', 'all');
      });

      // Chapter filter: global (null) or user's chapter
      query = query.where((builder) => {
        builder
          .whereNull('chapter_id')
          .orWhere('chapter_id', chapter_id);
      });

      const journeys = await query
        .select('id', 'title', 'description', 'audience', 'chapter_id', 'created_at')
        .orderBy('created_at', 'asc');

      // Compute progress per journey
      const journeysWithProgress = [];
      for (const journey of journeys) {
        const { progress } = await computeJourneyProgress(userId, journey.id);
        journeysWithProgress.push({
          ...journey,
          progress,
        });
      }

      res.json({
        success: true,
        data: {
          journeys: journeysWithProgress,
        },
      });
    } catch (error) {
      console.error('List journeys error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch journeys',
      });
    }
  },

  // Get single journey with items and per-item progress
  async getJourney(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const journey = await db('journeys').where({ id }).first();

      if (!journey || !journey.is_active) {
        return res.status(404).json({
          success: false,
          message: 'Journey not found',
        });
      }

      const items = await db('journey_items')
        .where({ journey_id: id })
        .orderBy('order_index', 'asc');

      const { progress, itemProgress } = await computeJourneyProgress(userId, id);

      res.json({
        success: true,
        data: {
          journey,
          items: itemProgress,
          progress,
        },
      });
    } catch (error) {
      console.error('Get journey error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch journey',
      });
    }
  },

  // Admin/Teacher: create journey
  async createJourney(req, res) {
    try {
      const userId = req.user.userId;
      const { role, chapter_id } = await getUserChapterAndRole(userId);

      if (role !== 'admin' && role !== 'teacher') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
        });
      }

      const {
        title,
        description,
        audience = getAudienceForRole(role),
        chapterId,
        items = [],
      } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Title is required',
        });
      }

      const resolvedChapterId = chapterId || chapter_id || null;

      const [journeyIdRow] = await db('journeys')
        .insert({
          title: title.trim(),
          description: description || null,
          audience,
          chapter_id: resolvedChapterId,
          is_active: true,
          created_by: userId,
        })
        .returning('id');

      const journeyId = journeyIdRow.id || journeyIdRow;

      // Insert items
      for (const [index, item] of items.entries()) {
        if (!item.itemType || !item.itemId) continue;
        await db('journey_items').insert({
          journey_id: journeyId,
          item_type: item.itemType,
          item_id: item.itemId,
          order_index: item.orderIndex ?? index,
        });
      }

      res.status(201).json({
        success: true,
        message: 'Journey created successfully',
        data: { id: journeyId },
      });
    } catch (error) {
      console.error('Create journey error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create journey',
      });
    }
  },

  // Admin/Teacher: update journey (replace items)
  async updateJourney(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const { role } = await getUserChapterAndRole(userId);

      if (role !== 'admin' && role !== 'teacher') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
        });
      }

      const {
        title,
        description,
        audience,
        chapterId,
        isActive,
        items = [],
      } = req.body;

      const journey = await db('journeys').where({ id }).first();
      if (!journey) {
        return res.status(404).json({
          success: false,
          message: 'Journey not found',
        });
      }

      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (audience !== undefined) updateData.audience = audience;
      if (chapterId !== undefined) updateData.chapter_id = chapterId || null;
      if (isActive !== undefined) updateData.is_active = !!isActive;

      if (Object.keys(updateData).length > 0) {
        await db('journeys').where({ id }).update(updateData);
      }

      // Replace items
      await db('journey_items').where({ journey_id: id }).delete();
      for (const [index, item] of items.entries()) {
        if (!item.itemType || !item.itemId) continue;
        await db('journey_items').insert({
          journey_id: id,
          item_type: item.itemType,
          item_id: item.itemId,
          order_index: item.orderIndex ?? index,
        });
      }

      res.json({
        success: true,
        message: 'Journey updated successfully',
      });
    } catch (error) {
      console.error('Update journey error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update journey',
      });
    }
  },

  // Admin/Teacher: delete journey
  async deleteJourney(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const { role } = await getUserChapterAndRole(userId);

      if (role !== 'admin' && role !== 'teacher') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
        });
      }

      const journey = await db('journeys').where({ id }).first();
      if (!journey) {
        return res.status(404).json({
          success: false,
          message: 'Journey not found',
        });
      }

      await db('journey_items').where({ journey_id: id }).delete();
      await db('journeys').where({ id }).delete();

      res.json({
        success: true,
        message: 'Journey deleted successfully',
      });
    } catch (error) {
      console.error('Delete journey error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete journey',
      });
    }
  },
};

module.exports = journeyController;



