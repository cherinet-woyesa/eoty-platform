const db = require('../config/database');

class VideoChaptersService {
  /**
   * Get all chapters for a lesson
   * @param {number} lessonId
   * @returns {Promise<Array>}
   */
  async getChaptersByLesson(lessonId) {
    return db('video_chapters')
      .where({ lesson_id: lessonId, is_active: true })
      .orderBy('order', 'asc')
      .orderBy('start_time', 'asc');
  }

  /**
   * Get a single chapter by ID
   * @param {number} chapterId
   * @returns {Promise<Object>}
   */
  async getChapterById(chapterId) {
    return db('video_chapters')
      .where({ id: chapterId })
      .first();
  }

  /**
   * Create a new chapter
   * @param {number} lessonId
   * @param {Object} chapterData
   * @returns {Promise<Object>}
   */
  async createChapter(lessonId, chapterData) {
    const { title, start_time, end_time, description, thumbnail_url, order } = chapterData;
    
    // Get max order if not provided
    let chapterOrder = order;
    if (chapterOrder === undefined || chapterOrder === null) {
      const maxOrder = await db('video_chapters')
        .where({ lesson_id: lessonId })
        .max('order as max_order')
        .first();
      chapterOrder = (maxOrder?.max_order || 0) + 1;
    }

    const [newChapter] = await db('video_chapters').insert({
      lesson_id: lessonId,
      title: title.trim(),
      start_time: parseFloat(start_time),
      end_time: end_time ? parseFloat(end_time) : null,
      description: description ? description.trim() : null,
      thumbnail_url: thumbnail_url || null,
      order: chapterOrder,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }).returning('*');
    
    return newChapter;
  }

  /**
   * Update an existing chapter
   * @param {number} chapterId
   * @param {Object} updates
   * @returns {Promise<Object>}
   */
  async updateChapter(chapterId, updates) {
    const updateData = {
      updated_at: new Date()
    };

    if (updates.title !== undefined) updateData.title = updates.title.trim();
    if (updates.start_time !== undefined) updateData.start_time = parseFloat(updates.start_time);
    if (updates.end_time !== undefined) updateData.end_time = updates.end_time ? parseFloat(updates.end_time) : null;
    if (updates.description !== undefined) updateData.description = updates.description ? updates.description.trim() : null;
    if (updates.thumbnail_url !== undefined) updateData.thumbnail_url = updates.thumbnail_url || null;
    if (updates.order !== undefined) updateData.order = parseInt(updates.order);
    if (updates.is_active !== undefined) updateData.is_active = updates.is_active;

    const [updatedChapter] = await db('video_chapters')
      .where({ id: chapterId })
      .update(updateData)
      .returning('*');
    
    return updatedChapter;
  }

  /**
   * Delete a chapter
   * @param {number} chapterId
   * @returns {Promise<number>} Number of deleted rows
   */
  async deleteChapter(chapterId) {
    return db('video_chapters')
      .where({ id: chapterId })
      .del();
  }

  /**
   * Reorder chapters for a lesson
   * @param {number} lessonId
   * @param {Array<number>} chapterIds - Array of chapter IDs in new order
   * @returns {Promise<void>}
   */
  async reorderChapters(lessonId, chapterIds) {
    const updates = chapterIds.map((chapterId, index) => ({
      id: chapterId,
      order: index + 1
    }));

    for (const update of updates) {
      await db('video_chapters')
        .where({ id: update.id, lesson_id: lessonId })
        .update({ order: update.order, updated_at: new Date() });
    }
  }
}

module.exports = new VideoChaptersService();


