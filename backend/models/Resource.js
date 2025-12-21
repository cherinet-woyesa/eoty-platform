const db = require('../config/database');

class Resource {
  static async create(resourceData) {
    const [resourceId] = await db('resources').insert(resourceData).returning('id');
    return await this.findById(resourceId.id || resourceId);
  }

  static async findById(id) {
    return await db('resources').where({ id }).first();
  }

  static async findByLesson(lessonId, userId = null) {
    let query = db('resources')
      .where({ lesson_id: lessonId })
      .where('published_at', '<=', new Date())
      .orderBy('created_at', 'desc');
    
    return await query;
  }

  static async attachToLesson(resourceId, lessonId) {
    await db('resources')
      .where({ id: resourceId })
      .update({
        lesson_id: lessonId,
        updated_at: new Date()
      });
    
    return await this.findById(resourceId);
  }

  static async detachFromLesson(resourceId) {
    await db('resources')
      .where({ id: resourceId })
      .update({
        lesson_id: null,
        updated_at: new Date()
      });
    
    return await this.findById(resourceId);
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

  // Get resources by scope and user access
  static async findByScope(userId, scope, options = {}) {
    const { chapterId, courseId, lessonId, filters = {} } = options;

    let query = db('resources')
      .where('published_at', '<=', new Date());

    // Apply scope filtering
    switch (scope) {
      case 'course_specific':
        if (!courseId) throw new Error('courseId required for course_specific scope');
        query = query.where({ resource_scope: 'course_specific', course_id: courseId });
        break;

      case 'chapter_wide':
        if (!chapterId) throw new Error('chapterId required for chapter_wide scope');
        query = query.where({ resource_scope: 'chapter_wide', chapter_id: chapterId });
        break;

      case 'platform_wide':
        query = query.where({ resource_scope: 'platform_wide' });
        break;

      default:
        throw new Error('Invalid resource scope');
    }

    // Apply additional filters
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

  // Get all resources accessible to a user across different scopes
  static async findAllAccessible(userId, userRole, options = {}) {
    const { filters = {} } = options;

    // Get user info for access control
    const user = await db('users').where({ id: userId }).select('chapter_id').first();
    if (!user) throw new Error('User not found');

    let query = db('resources')
      .where('published_at', '<=', new Date())
      .where(function() {
        this.where({ resource_scope: 'platform_wide' }) // Platform-wide resources
          .orWhere(function() {
            this.where({ resource_scope: 'chapter_wide', chapter_id: user.chapter_id }); // Chapter-wide resources
          });
      });

    // Apply additional filters
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

    return await query.orderBy('resource_scope', 'desc').orderBy('created_at', 'desc');
  }

  static async checkPermission(resourceId, userId, action = 'view') {
    const resource = await this.findById(resourceId);
    if (!resource) return false;

    // Allow author to always access their own resource
    if (resource.author == userId) return true;

    // Get user role
    const user = await db('users').where({ id: userId }).select('role', 'chapter_id').first();
    if (!user) return false;

    // Admin always has access
    if (user.role === 'admin') return true;

    // Handle course-specific resources
    if (resource.resource_scope === 'course_specific') {
      // Check if user is the teacher of the course
      const course = await db('courses').where({ id: resource.course_id }).select('created_by').first();
      if (course && course.created_by == userId) return true;

      // Check if user is enrolled in the course
      const enrollment = await db('user_course_enrollments')
        .where({ user_id: userId, course_id: resource.course_id })
        .first();
      
      if (enrollment) return true;
      
      return false;
    }

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
      .where('user_notes.resource_id', resourceId)
      .where('user_notes.is_public', true)
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