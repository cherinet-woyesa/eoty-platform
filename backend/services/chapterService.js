/**
 * FR7: Chapter Service
 * REQUIREMENT: Multi-city/chapter membership, location/topic based
 */

const db = require('../config/database');

class ChapterService {
  /**
   * Get all active chapters with location/topic info
   * @param {Object} filters - Filter options (country, city, region, topic)
   */
  async getChapters(filters = {}) {
    let query = db('chapters')
      .where('is_active', true);
    
    // Check if display_order column exists, if not, just order by name
    try {
      const hasDisplayOrder = await db.schema.hasColumn('chapters', 'display_order');
      if (hasDisplayOrder) {
        query = query.orderBy('display_order', 'asc');
      }
    } catch (err) {
      // Column doesn't exist, continue without it
    }
    
    query = query.orderBy('name', 'asc');

    if (filters.country) {
      query = query.where('country', filters.country);
    }

    if (filters.city) {
      query = query.where('city', filters.city);
    }

    if (filters.region) {
      query = query.where('region', filters.region);
    }

    if (filters.topic) {
      // Search in topics JSON array
      query = query.whereRaw("topics::text LIKE ?", [`%${filters.topic}%`]);
    }

    return await query;
  }

  /**
   * Get user's chapters (REQUIREMENT: Supports multiple chapters)
   * @param {number} userId - User ID
   */
  async getUserChapters(userId) {
    return await db('user_chapters as uc')
      .join('chapters as c', 'uc.chapter_id', 'c.id')
      .where('uc.user_id', userId)
      .select(
        'uc.*',
        'c.name as chapter_name',
        'c.location',
        'c.country',
        'c.city',
        'c.description',
        'c.timezone',
        'c.language',
        'c.topics'
      )
      .orderBy('uc.is_primary', 'desc')
      .orderBy('uc.joined_at', 'asc');
  }

  /**
   * Get user's primary chapter
   * @param {number} userId - User ID
   */
  async getUserPrimaryChapter(userId) {
    const userChapter = await db('user_chapters as uc')
      .join('chapters as c', 'uc.chapter_id', 'c.id')
      .where('uc.user_id', userId)
      .where('uc.is_primary', true)
      .select(
        'uc.*',
        'c.name as chapter_name',
        'c.location',
        'c.country',
        'c.city',
        'c.description',
        'c.timezone',
        'c.language',
        'c.topics'
      )
      .first();

    return userChapter;
  }

  /**
   * Join a chapter (REQUIREMENT: Multi-chapter membership)
   * @param {number} userId - User ID
   * @param {number} chapterId - Chapter ID
   * @param {string} role - Role in chapter (member, moderator, admin)
   * @param {boolean} setAsPrimary - Whether to set as primary chapter
   */
  async joinChapter(userId, chapterId, role = 'member', setAsPrimary = false) {
    // Check if chapter exists and is active
    const chapter = await db('chapters')
      .where('id', chapterId)
      .where('is_active', true)
      .first();

    if (!chapter) {
      throw new Error('Chapter not found or inactive');
    }

    // Check if user is already a member
    const existing = await db('user_chapters')
      .where('user_id', userId)
      .where('chapter_id', chapterId)
      .first();

    if (existing) {
      throw new Error('User is already a member of this chapter');
    }

    // If setting as primary, unset other primary chapters
    if (setAsPrimary) {
      await db('user_chapters')
        .where('user_id', userId)
        .update({ is_primary: false });
    }

    // If this is user's first chapter, set as primary
    const userChapters = await db('user_chapters')
      .where('user_id', userId)
      .count('* as count')
      .first();

    if (userChapters.count === 0) {
      setAsPrimary = true;
    }

    // Join chapter
    const [userChapter] = await db('user_chapters').insert({
      user_id: userId,
      chapter_id: chapterId,
      role: role,
      is_primary: setAsPrimary,
      joined_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    }).returning('*');

    return userChapter;
  }

  /**
   * Leave a chapter
   * @param {number} userId - User ID
   * @param {number} chapterId - Chapter ID
   */
  async leaveChapter(userId, chapterId) {
    const userChapter = await db('user_chapters')
      .where('user_id', userId)
      .where('chapter_id', chapterId)
      .first();

    if (!userChapter) {
      throw new Error('User is not a member of this chapter');
    }

    // If leaving primary chapter, set another as primary
    if (userChapter.is_primary) {
      const otherChapter = await db('user_chapters')
        .where('user_id', userId)
        .where('chapter_id', '!=', chapterId)
        .first();

      if (otherChapter) {
        await db('user_chapters')
          .where('id', otherChapter.id)
          .update({ is_primary: true });
      }
    }

    // Remove membership
    await db('user_chapters')
      .where('user_id', userId)
      .where('chapter_id', chapterId)
      .delete();

    return { success: true };
  }

  /**
   * Set primary chapter
   * @param {number} userId - User ID
   * @param {number} chapterId - Chapter ID
   */
  async setPrimaryChapter(userId, chapterId) {
    // Verify user is a member
    const userChapter = await db('user_chapters')
      .where('user_id', userId)
      .where('chapter_id', chapterId)
      .first();

    if (!userChapter) {
      throw new Error('User is not a member of this chapter');
    }

    // Unset all primary chapters
    await db('user_chapters')
      .where('user_id', userId)
      .update({ is_primary: false });

    // Set new primary
    await db('user_chapters')
      .where('user_id', userId)
      .where('chapter_id', chapterId)
      .update({ is_primary: true, updated_at: new Date() });

    return { success: true };
  }

  /**
   * Update user's role in a chapter
   * @param {number} userId - User ID
   * @param {number} chapterId - Chapter ID
   * @param {string} role - New role
   */
  async updateChapterRole(userId, chapterId, role) {
    const userChapter = await db('user_chapters')
      .where('user_id', userId)
      .where('chapter_id', chapterId)
      .first();

    if (!userChapter) {
      throw new Error('User is not a member of this chapter');
    }

    await db('user_chapters')
      .where('user_id', userId)
      .where('chapter_id', chapterId)
      .update({ role, updated_at: new Date() });

    return { success: true };
  }

  /**
   * Get chapters by location (REQUIREMENT: Location/topic based)
   * @param {string} country - Country code
   * @param {string} city - City name
   */
  async getChaptersByLocation(country = null, city = null) {
    let query = db('chapters')
      .where('is_active', true);

    if (country) {
      query = query.where('country', country);
    }

    if (city) {
      query = query.where('city', city);
    }

    return await query.orderBy('name', 'asc');
  }

  /**
   * Get chapters by topic (REQUIREMENT: Topic based)
   * @param {string} topic - Topic keyword
   */
  async getChaptersByTopic(topic) {
    return await db('chapters')
      .where('is_active', true)
      .whereRaw("topics::text LIKE ?", [`%${topic}%`])
      .orderBy('name', 'asc');
  }

  /**
   * Search chapters (REQUIREMENT: Location/topic based)
   * @param {string} searchTerm - Search term
   */
  async searchChapters(searchTerm) {
    const term = `%${searchTerm}%`;
    
    return await db('chapters')
      .where('is_active', true)
      .where(function() {
        this.where('name', 'ilike', term)
          .orWhere('description', 'ilike', term)
          .orWhere('city', 'ilike', term)
          .orWhere('country', 'ilike', term)
          .orWhere('region', 'ilike', term)
          .orWhereRaw("topics::text LIKE ?", [term]);
      })
      .orderBy('name', 'asc');
  }
}

module.exports = new ChapterService();

