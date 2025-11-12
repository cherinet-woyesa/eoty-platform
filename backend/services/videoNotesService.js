// backend/services/videoNotesService.js
const db = require('../config/database');

class VideoNotesService {
  /**
   * Create a new video note or bookmark
   * @param {string} userId - User ID
   * @param {number} lessonId - Lesson ID
   * @param {string} content - Note content
   * @param {number} timestamp - Video timestamp in seconds
   * @param {string} type - 'note' or 'bookmark'
   * @param {string} color - Optional color
   * @param {string} title - Optional title (for bookmarks)
   * @param {string} visibility - 'private' or 'public'
   * @returns {Promise<Object>} Created note
   */
  async createNote(userId, lessonId, content, timestamp, type = 'note', color = 'default', title = null, visibility = 'private') {
    try {
      // Validate lesson exists
      const lesson = await db('lessons')
        .where('id', lessonId)
        .first();

      if (!lesson) {
        throw new Error('Lesson not found');
      }

      // Validate timestamp is positive
      if (timestamp < 0) {
        throw new Error('Timestamp must be positive');
      }

      // Insert note
      const [note] = await db('video_notes').insert({
        user_id: userId,
        lesson_id: lessonId,
        content: content.trim(),
        timestamp: parseFloat(timestamp),
        type: type,
        color: color,
        title: title ? title.trim() : null,
        visibility: visibility,
        created_at: new Date(),
        updated_at: new Date()
      }).returning('*');

      return note;
    } catch (error) {
      console.error('Create note error:', error);
      throw error;
    }
  }

  /**
   * Get all notes for a lesson (user's own notes + public notes)
   * @param {string} userId - User ID
   * @param {number} lessonId - Lesson ID
   * @returns {Promise<Array>} Array of notes
   */
  async getNotes(userId, lessonId) {
    try {
      const notes = await db('video_notes')
        .where('lesson_id', lessonId)
        .where(function() {
          this.where('user_id', userId)
            .orWhere('visibility', 'public');
        })
        .orderBy('timestamp', 'asc')
        .orderBy('created_at', 'asc');

      return notes;
    } catch (error) {
      console.error('Get notes error:', error);
      throw error;
    }
  }

  /**
   * Get user's notes for a lesson
   * @param {string} userId - User ID
   * @param {number} lessonId - Lesson ID
   * @returns {Promise<Array>} Array of user's notes
   */
  async getUserNotes(userId, lessonId) {
    try {
      const notes = await db('video_notes')
        .where({
          user_id: userId,
          lesson_id: lessonId
        })
        .orderBy('timestamp', 'asc')
        .orderBy('created_at', 'asc');

      return notes;
    } catch (error) {
      console.error('Get user notes error:', error);
      throw error;
    }
  }

  /**
   * Update a note
   * @param {number} noteId - Note ID
   * @param {string} userId - User ID (for authorization)
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated note
   */
  async updateNote(noteId, userId, updates) {
    try {
      // Verify ownership
      const note = await db('video_notes')
        .where({ id: noteId, user_id: userId })
        .first();

      if (!note) {
        throw new Error('Note not found or access denied');
      }

      // Prepare update object
      const updateData = {
        updated_at: new Date()
      };

      if (updates.content !== undefined) {
        updateData.content = updates.content.trim();
      }
      if (updates.timestamp !== undefined) {
        updateData.timestamp = parseFloat(updates.timestamp);
      }
      if (updates.type !== undefined) {
        updateData.type = updates.type;
      }
      if (updates.color !== undefined) {
        updateData.color = updates.color;
      }
      if (updates.title !== undefined) {
        updateData.title = updates.title ? updates.title.trim() : null;
      }
      if (updates.visibility !== undefined) {
        updateData.visibility = updates.visibility;
      }

      const [updatedNote] = await db('video_notes')
        .where({ id: noteId, user_id: userId })
        .update(updateData)
        .returning('*');

      return updatedNote;
    } catch (error) {
      console.error('Update note error:', error);
      throw error;
    }
  }

  /**
   * Delete a note
   * @param {number} noteId - Note ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Promise<boolean>} Success status
   */
  async deleteNote(noteId, userId) {
    try {
      // Verify ownership
      const note = await db('video_notes')
        .where({ id: noteId, user_id: userId })
        .first();

      if (!note) {
        throw new Error('Note not found or access denied');
      }

      await db('video_notes')
        .where({ id: noteId, user_id: userId })
        .delete();

      return true;
    } catch (error) {
      console.error('Delete note error:', error);
      throw error;
    }
  }

  /**
   * Get note statistics for a lesson
   * @param {number} lessonId - Lesson ID
   * @returns {Promise<Object>} Statistics
   */
  async getNoteStatistics(lessonId) {
    try {
      const stats = await db('video_notes')
        .where('lesson_id', lessonId)
        .select(
          db.raw('COUNT(*) as total_notes'),
          db.raw('COUNT(DISTINCT user_id) as unique_users'),
          db.raw('COUNT(CASE WHEN type = \'bookmark\' THEN 1 END) as bookmarks'),
          db.raw('COUNT(CASE WHEN type = \'note\' THEN 1 END) as notes')
        )
        .first();

      return stats;
    } catch (error) {
      console.error('Get note statistics error:', error);
      throw error;
    }
  }
}

module.exports = new VideoNotesService();


