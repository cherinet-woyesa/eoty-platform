const db = require('../config/database');

/**
 * Toggle a bookmark for an entity (course, lesson, etc.)
 * If the bookmark exists, it removes it. If not, it creates it.
 */
exports.toggleBookmark = async (req, res) => {
  try {
    const { entityType, entityId } = req.body;
    const userId = req.user.userId;

    if (!entityType || !entityId) {
      return res.status(400).json({ message: 'Entity type and ID are required' });
    }

    // Check if bookmark already exists
    const existingBookmark = await db('bookmarks')
      .where({
        user_id: userId,
        entity_type: entityType,
        entity_id: entityId
      })
      .first();

    if (existingBookmark) {
      // Remove bookmark
      await db('bookmarks')
        .where({ id: existingBookmark.id })
        .del();
      
      return res.json({ 
        bookmarked: false, 
        message: 'Bookmark removed' 
      });
    } else {
      // Add bookmark
      await db('bookmarks').insert({
        user_id: userId,
        entity_type: entityType,
        entity_id: entityId
      });
      
      return res.json({ 
        bookmarked: true, 
        message: 'Bookmark added' 
      });
    }
  } catch (error) {
    console.error('Error toggling bookmark:', error);
    res.status(500).json({ message: 'Error toggling bookmark' });
  }
};

/**
 * Get all bookmarks for the current user
 * Optionally filter by entity type
 */
exports.getBookmarks = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type } = req.query;

    let query = db('bookmarks')
      .where('user_id', userId)
      .orderBy('created_at', 'desc');

    if (type) {
      query = query.where('entity_type', type);
    }

    const bookmarks = await query;

    // Enrich bookmarks with entity details if needed
    // For now, we'll just return the bookmarks and let the frontend fetch details
    // or we can join with other tables if we want to be more efficient
    
    // Let's fetch course details for course bookmarks
    const enrichedBookmarks = await Promise.all(bookmarks.map(async (bookmark) => {
      if (bookmark.entity_type === 'course') {
        const course = await db('courses')
          .where('id', bookmark.entity_id)
          .select('id', 'title', 'cover_image', 'description', 'level')
          .first();
        return { ...bookmark, entity: course };
      } else if (bookmark.entity_type === 'lesson') {
        const lesson = await db('lessons')
          .where('id', bookmark.entity_id)
          .select('id', 'title', 'description', 'thumbnail_url', 'duration')
          .first();
        return { ...bookmark, entity: lesson };
      } else if (bookmark.entity_type === 'resource') {
        const resource = await db('resources')
          .where('id', bookmark.entity_id)
          .select('id', 'title', 'description', 'file_type')
          .first();
        return { ...bookmark, entity: resource };
      }
      return bookmark;
    }));

    // Filter out bookmarks where the entity no longer exists (if we tried to fetch it)
    const validBookmarks = enrichedBookmarks.filter(b => {
      if (['course', 'lesson', 'resource'].includes(b.entity_type)) {
        return !!b.entity;
      }
      return true;
    });

    res.json(validBookmarks);
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    res.status(500).json({ message: 'Error fetching bookmarks' });
  }
};

/**
 * Check if a specific entity is bookmarked by the user
 */
exports.checkBookmark = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { entityType, entityId } = req.query;

    if (!entityType || !entityId) {
      return res.status(400).json({ message: 'Entity type and ID are required' });
    }

    const bookmark = await db('bookmarks')
      .where({
        user_id: userId,
        entity_type: entityType,
        entity_id: entityId
      })
      .first();

    res.json({ bookmarked: !!bookmark });
  } catch (error) {
    console.error('Error checking bookmark:', error);
    res.status(500).json({ message: 'Error checking bookmark' });
  }
};
