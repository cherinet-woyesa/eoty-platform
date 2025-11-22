const db = require('../config/database');

class Resource {
  static async create(resourceData) {
    const [resourceId] = await db('resources').insert(resourceData).returning('id');
    return await this.findById(resourceId.id || resourceId);
  }

  static async findById(id) {
    return await db('resources').where({ id }).first();
  }

  static async findByChapter(chapterId, filters = {}) {
    let query = db('resources')
      .where({ chapter_id: chapterId })
      .where('published_at', '<=', new Date());

    // Apply filters
    if (filters.category) {
      query = query.where({ category: filters.category });
    }
    if (filters.language) {
      query = query.where({ language: filters.language });
    }
    if (filters.tags && filters.tags.length > 0) {
      query = query.whereRaw('tags @> ?', [JSON.stringify(filters.tags)]);
    }
    if (filters.search) {
      query = query.where(function() {
        this.where('title', 'ilike', `%${filters.search}%`)
          .orWhere('description', 'ilike', `%${filters.search}%`)
          .orWhere('author', 'ilike', `%${filters.search}%`);
      });
    }

    return await query.orderBy('created_at', 'desc');
  }

  static async checkPermission(resourceId, userId, action = 'view') {
    const resource = await this.findById(resourceId);
    if (!resource) return false;

    // Get user role
    const user = await db('users').where({ id: userId }).select('role', 'chapter_id').first();
    if (!user) return false;

    // Check if user is in same chapter or resource is public
    if (resource.chapter_id !== user.chapter_id && !resource.is_public) {
      return false;
    }

    // For public resources, allow view access without specific permissions
    if (resource.is_public && action === 'view') {
      return true;
    }

    // Check specific permissions (only for non-public resources or non-view actions)
    try {
      const permission = await db('resource_permissions')
        .where({ resource_id: resourceId })
        .andWhere(function() {
          this.where({ role: user.role }).orWhere({ role: 'all' });
        })
        .andWhere({ permission_type: action })
        .first();

      return !!permission;
    } catch (error) {
      // If resource_permissions table doesn't exist, allow access for backward compatibility
      console.warn('Resource permissions table not found, allowing access for backward compatibility');
      return resource.is_public || (resource.chapter_id === user.chapter_id);
    }
  }

  static async getCategories() {
    const result = await db('resources')
      .distinct('category')
      .whereNotNull('category')
      .pluck('category');
    return result;
  }

  static async getTags() {
    const result = await db('resources')
      .distinct('tags')
      .whereNotNull('tags');
    
    const allTags = new Set();
    result.forEach(row => {
      if (row.tags && Array.isArray(row.tags)) {
        row.tags.forEach(tag => allTags.add(tag));
      }
    });
    
    return Array.from(allTags);
  }
}

class UserNote {
  static async create(noteData) {
    const [noteId] = await db('user_notes').insert(noteData).returning('id');
    return await db('user_notes').where({ id: noteId.id || noteId }).first();
  }

  static async findByResourceAndUser(resourceId, userId) {
    return await db('user_notes')
      .where({ resource_id: resourceId, user_id: userId })
      .orderBy('created_at', 'desc');
  }

  static async findPublicByResource(resourceId) {
    return await db('user_notes')
      .where({ resource_id: resourceId, is_public: true })
      .join('users', 'user_notes.user_id', 'users.id')
      .select(
        'user_notes.*',
        'users.first_name',
        'users.last_name'
      )
      .orderBy('user_notes.created_at', 'desc');
  }
}

class AISummary {
  static async createOrUpdate(summaryData) {
    const existing = await db('ai_summaries')
      .where({
        resource_id: summaryData.resource_id,
        summary_type: summaryData.summary_type
      })
      .first();

    if (existing) {
      await db('ai_summaries')
        .where({ id: existing.id })
        .update(summaryData);
      return await db('ai_summaries').where({ id: existing.id }).first();
    } else {
      const [summaryId] = await db('ai_summaries').insert(summaryData).returning('id');
      return await db('ai_summaries').where({ id: summaryId.id || summaryId }).first();
    }
  }

  static async findByResource(resourceId, type = 'brief') {
    return await db('ai_summaries')
      .where({ resource_id: resourceId, summary_type: type })
      .first();
  }
}

module.exports = { Resource, UserNote, AISummary };