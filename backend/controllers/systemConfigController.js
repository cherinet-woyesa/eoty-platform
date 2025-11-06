const db = require('../config/database');
const auditLogService = require('../services/auditLogService');
const usageAnalyticsService = require('../services/usageAnalyticsService');

/**
 * System Configuration Controller
 * 
 * Handles all CRUD operations for system configuration entities:
 * - Categories
 * - Levels
 * - Durations
 * - Tags (enhanced)
 * - Chapters (enhanced)
 */

// ============================================================================
// DASHBOARD & METRICS
// ============================================================================

/**
 * Get system configuration metrics for dashboard
 */
async function getMetrics(req, res) {
  try {
    // Get counts for each entity type
    const [categories, levels, durations, tags, chapters] = await Promise.all([
      db('course_categories')
        .select(
          db.raw('COUNT(*) as total'),
          db.raw('SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active'),
          db.raw('SUM(CASE WHEN is_active = false THEN 1 ELSE 0 END) as inactive')
        )
        .first(),
      db('course_levels')
        .select(
          db.raw('COUNT(*) as total'),
          db.raw('SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active'),
          db.raw('SUM(CASE WHEN is_active = false THEN 1 ELSE 0 END) as inactive')
        )
        .first(),
      db('course_durations')
        .select(
          db.raw('COUNT(*) as total'),
          db.raw('SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active'),
          db.raw('SUM(CASE WHEN is_active = false THEN 1 ELSE 0 END) as inactive')
        )
        .first(),
      db('content_tags')
        .select(
          db.raw('COUNT(*) as total'),
          db.raw('SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active'),
          db.raw('SUM(CASE WHEN is_active = false THEN 1 ELSE 0 END) as inactive')
        )
        .first(),
      db('chapters')
        .select(
          db.raw('COUNT(*) as total'),
          db.raw('SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active'),
          db.raw('SUM(CASE WHEN is_active = false THEN 1 ELSE 0 END) as inactive')
        )
        .first()
    ]);

    // Get recent changes
    const recent_changes = await auditLogService.getRecentChanges(10);

    res.json({
      success: true,
      data: {
        categories: {
          total: parseInt(categories.total),
          active: parseInt(categories.active),
          inactive: parseInt(categories.inactive)
        },
        levels: {
          total: parseInt(levels.total),
          active: parseInt(levels.active),
          inactive: parseInt(levels.inactive)
        },
        durations: {
          total: parseInt(durations.total),
          active: parseInt(durations.active),
          inactive: parseInt(durations.inactive)
        },
        tags: {
          total: parseInt(tags.total),
          active: parseInt(tags.active),
          inactive: parseInt(tags.inactive)
        },
        chapters: {
          total: parseInt(chapters.total),
          active: parseInt(chapters.active),
          inactive: parseInt(chapters.inactive)
        },
        recent_changes
      }
    });
  } catch (error) {
    console.error('Error fetching system config metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system configuration metrics'
    });
  }
}

// ============================================================================
// CATEGORIES
// ============================================================================

/**
 * Get all categories
 */
async function getCategories(req, res) {
  try {
    const { active_only } = req.query;

    let query = db('course_categories')
      .select('*')
      .orderBy('display_order', 'asc');

    if (active_only === 'true') {
      query = query.where('is_active', true);
    }

    const categories = await query;

    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
}

/**
 * Create a new category
 */
async function createCategory(req, res) {
  try {
    const { name, icon, description } = req.body;
    const userId = req.user.userId;

    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    // Check if slug already exists
    const existing = await db('course_categories').where('slug', slug).first();
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A category with the name "${existing.name}" already exists (similar names are not allowed)`,
        errors: { name: 'Category name must be unique' }
      });
    }

    // Get max display_order
    const maxOrder = await db('course_categories').max('display_order as max').first();
    const display_order = (maxOrder.max || 0) + 1;

    // Insert category
    const [result] = await db('course_categories').insert({
      name,
      slug,
      icon,
      description,
      display_order,
      is_active: true,
      usage_count: 0,
      created_by: userId,
      created_at: new Date(),
      updated_at: new Date()
    }).returning('id');

    const categoryId = result.id || result;
    const category = await db('course_categories').where('id', categoryId).first();

    // Log audit
    await auditLogService.logConfigChange({
      admin_id: userId,
      entity_type: 'category',
      entity_id: categoryId,
      action_type: 'create',
      after_state: category,
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      data: { category },
      message: 'Category created successfully'
    });
  } catch (error) {
    console.error('Error creating category:', error);
    
    // Check if it's a unique constraint violation
    if (error.code === '23505' || error.message?.includes('unique')) {
      return res.status(400).json({
        success: false,
        message: 'A category with this name already exists',
        errors: { name: 'Category name must be unique' }
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create category'
    });
  }
}

/**
 * Update a category
 */
async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const { name, icon, description, is_active } = req.body;
    const userId = req.user.userId;

    // Get current state
    const before_state = await db('course_categories').where('id', id).first();
    if (!before_state) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const updates = { updated_at: new Date() };

    // Update name and slug if name changed
    if (name && name !== before_state.name) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      
      // Check if new slug already exists
      const existing = await db('course_categories')
        .where('slug', slug)
        .whereNot('id', id)
        .first();
      
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'A category with this name already exists',
          errors: { name: 'Category name must be unique' }
        });
      }

      updates.name = name;
      updates.slug = slug;

      // Update courses that use this category
      await db('courses')
        .where('category', before_state.slug)
        .update({ category: slug });
    }

    if (icon !== undefined) updates.icon = icon;
    if (description !== undefined) updates.description = description;
    if (is_active !== undefined) updates.is_active = is_active;

    // Update category
    await db('course_categories').where('id', id).update(updates);

    const after_state = await db('course_categories').where('id', id).first();

    // Log audit
    await auditLogService.logConfigChange({
      admin_id: userId,
      entity_type: 'category',
      entity_id: parseInt(id),
      action_type: 'update',
      before_state,
      after_state,
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.json({
      success: true,
      data: { category: after_state },
      message: 'Category updated successfully'
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update category'
    });
  }
}

/**
 * Delete a category
 */
async function deleteCategory(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Get current state
    const before_state = await db('course_categories').where('id', id).first();
    if (!before_state) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if category is in use
    const { can_delete, usage_count } = await usageAnalyticsService.canDeleteEntity('category', parseInt(id));
    if (!can_delete) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category because it is used by ${usage_count} course(s)`
      });
    }

    // Delete category
    await db('course_categories').where('id', id).del();

    // Log audit
    await auditLogService.logConfigChange({
      admin_id: userId,
      entity_type: 'category',
      entity_id: parseInt(id),
      action_type: 'delete',
      before_state,
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete category'
    });
  }
}

// ============================================================================
// LEVELS
// ============================================================================

/**
 * Get all levels
 */
async function getLevels(req, res) {
  try {
    const { active_only } = req.query;

    let query = db('course_levels')
      .select('*')
      .orderBy('display_order', 'asc');

    if (active_only === 'true') {
      query = query.where('is_active', true);
    }

    const levels = await query;

    res.json({
      success: true,
      data: { levels }
    });
  } catch (error) {
    console.error('Error fetching levels:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch levels'
    });
  }
}

/**
 * Create a new level
 */
async function createLevel(req, res) {
  try {
    const { name, description } = req.body;
    const userId = req.user.userId;

    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    // Check if slug already exists
    const existing = await db('course_levels').where('slug', slug).first();
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A level with this name already exists',
        errors: { name: 'Level name must be unique' }
      });
    }

    // Get max display_order
    const maxOrder = await db('course_levels').max('display_order as max').first();
    const display_order = (maxOrder.max || 0) + 1;

    // Insert level
    const [result] = await db('course_levels').insert({
      name,
      slug,
      description,
      display_order,
      is_active: true,
      usage_count: 0,
      created_by: userId,
      created_at: new Date(),
      updated_at: new Date()
    }).returning('id');

    const levelId = result.id || result;
    const level = await db('course_levels').where('id', levelId).first();

    // Log audit
    await auditLogService.logConfigChange({
      admin_id: userId,
      entity_type: 'level',
      entity_id: levelId,
      action_type: 'create',
      after_state: level,
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      data: { level },
      message: 'Level created successfully'
    });
  } catch (error) {
    console.error('Error creating level:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create level'
    });
  }
}

/**
 * Update a level
 */
async function updateLevel(req, res) {
  try {
    const { id } = req.params;
    const { name, description, is_active } = req.body;
    const userId = req.user.userId;

    // Get current state
    const before_state = await db('course_levels').where('id', id).first();
    if (!before_state) {
      return res.status(404).json({
        success: false,
        message: 'Level not found'
      });
    }

    const updates = { updated_at: new Date() };

    // Update name and slug if name changed
    if (name && name !== before_state.name) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      
      // Check if new slug already exists
      const existing = await db('course_levels')
        .where('slug', slug)
        .whereNot('id', id)
        .first();
      
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'A level with this name already exists',
          errors: { name: 'Level name must be unique' }
        });
      }

      updates.name = name;
      updates.slug = slug;

      // Update courses that use this level
      await db('courses')
        .where('level', before_state.slug)
        .update({ level: slug });
    }

    if (description !== undefined) updates.description = description;
    if (is_active !== undefined) updates.is_active = is_active;

    // Update level
    await db('course_levels').where('id', id).update(updates);

    const after_state = await db('course_levels').where('id', id).first();

    // Log audit
    await auditLogService.logConfigChange({
      admin_id: userId,
      entity_type: 'level',
      entity_id: parseInt(id),
      action_type: 'update',
      before_state,
      after_state,
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.json({
      success: true,
      data: { level: after_state },
      message: 'Level updated successfully'
    });
  } catch (error) {
    console.error('Error updating level:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update level'
    });
  }
}

/**
 * Delete a level
 */
async function deleteLevel(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Get current state
    const before_state = await db('course_levels').where('id', id).first();
    if (!before_state) {
      return res.status(404).json({
        success: false,
        message: 'Level not found'
      });
    }

    // Check if level is in use
    const { can_delete, usage_count } = await usageAnalyticsService.canDeleteEntity('level', parseInt(id));
    if (!can_delete) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete level because it is used by ${usage_count} course(s)`
      });
    }

    // Delete level
    await db('course_levels').where('id', id).del();

    // Log audit
    await auditLogService.logConfigChange({
      admin_id: userId,
      entity_type: 'level',
      entity_id: parseInt(id),
      action_type: 'delete',
      before_state,
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: 'Level deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting level:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete level'
    });
  }
}

// ============================================================================
// DURATIONS
// ============================================================================

/**
 * Get all durations
 */
async function getDurations(req, res) {
  try {
    const { active_only } = req.query;

    let query = db('course_durations')
      .select('*')
      .orderBy('display_order', 'asc');

    if (active_only === 'true') {
      query = query.where('is_active', true);
    }

    const durations = await query;

    res.json({
      success: true,
      data: { durations }
    });
  } catch (error) {
    console.error('Error fetching durations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch durations'
    });
  }
}

/**
 * Create a new duration
 */
async function createDuration(req, res) {
  try {
    const { value, label, weeks_min, weeks_max } = req.body;
    const userId = req.user.userId;

    // Check if value already exists
    const existing = await db('course_durations').where('value', value).first();
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A duration with this value already exists',
        errors: { value: 'Duration value must be unique' }
      });
    }

    // Get max display_order
    const maxOrder = await db('course_durations').max('display_order as max').first();
    const display_order = (maxOrder.max || 0) + 1;

    // Insert duration
    const [result] = await db('course_durations').insert({
      value,
      label,
      weeks_min,
      weeks_max,
      display_order,
      is_active: true,
      usage_count: 0,
      created_by: userId,
      created_at: new Date(),
      updated_at: new Date()
    }).returning('id');

    const durationId = result.id || result;
    const duration = await db('course_durations').where('id', durationId).first();

    // Log audit
    await auditLogService.logConfigChange({
      admin_id: userId,
      entity_type: 'duration',
      entity_id: durationId,
      action_type: 'create',
      after_state: duration,
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      data: { duration },
      message: 'Duration created successfully'
    });
  } catch (error) {
    console.error('Error creating duration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create duration'
    });
  }
}

/**
 * Update a duration
 */
async function updateDuration(req, res) {
  try {
    const { id } = req.params;
    const { value, label, weeks_min, weeks_max, is_active } = req.body;
    const userId = req.user.userId;

    // Get current state
    const before_state = await db('course_durations').where('id', id).first();
    if (!before_state) {
      return res.status(404).json({
        success: false,
        message: 'Duration not found'
      });
    }

    const updates = { updated_at: new Date() };

    // Update value if changed
    if (value && value !== before_state.value) {
      // Check if new value already exists
      const existing = await db('course_durations')
        .where('value', value)
        .whereNot('id', id)
        .first();
      
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'A duration with this value already exists',
          errors: { value: 'Duration value must be unique' }
        });
      }

      updates.value = value;

      // Update courses that use this duration
      await db('courses')
        .where('estimated_duration', before_state.value)
        .update({ estimated_duration: value });
    }

    if (label !== undefined) updates.label = label;
    if (weeks_min !== undefined) updates.weeks_min = weeks_min;
    if (weeks_max !== undefined) updates.weeks_max = weeks_max;
    if (is_active !== undefined) updates.is_active = is_active;

    // Update duration
    await db('course_durations').where('id', id).update(updates);

    const after_state = await db('course_durations').where('id', id).first();

    // Log audit
    await auditLogService.logConfigChange({
      admin_id: userId,
      entity_type: 'duration',
      entity_id: parseInt(id),
      action_type: 'update',
      before_state,
      after_state,
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.json({
      success: true,
      data: { duration: after_state },
      message: 'Duration updated successfully'
    });
  } catch (error) {
    console.error('Error updating duration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update duration'
    });
  }
}

/**
 * Delete a duration
 */
async function deleteDuration(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Get current state
    const before_state = await db('course_durations').where('id', id).first();
    if (!before_state) {
      return res.status(404).json({
        success: false,
        message: 'Duration not found'
      });
    }

    // Check if duration is in use
    const { can_delete, usage_count } = await usageAnalyticsService.canDeleteEntity('duration', parseInt(id));
    if (!can_delete) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete duration because it is used by ${usage_count} course(s)`
      });
    }

    // Delete duration
    await db('course_durations').where('id', id).del();

    // Log audit
    await auditLogService.logConfigChange({
      admin_id: userId,
      entity_type: 'duration',
      entity_id: parseInt(id),
      action_type: 'delete',
      before_state,
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: 'Duration deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting duration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete duration'
    });
  }
}

module.exports = {
  getMetrics,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getLevels,
  createLevel,
  updateLevel,
  deleteLevel,
  getDurations,
  createDuration,
  updateDuration,
  deleteDuration
};

// ============================================================================
// TAGS (Enhanced)
// ============================================================================

/**
 * Get all tags
 */
async function getTags(req, res) {
  try {
    const { active_only, sort_by } = req.query;

    let query = db('content_tags').select('*');

    if (active_only === 'true') {
      query = query.where('is_active', true);
    }

    // Sort by usage count (descending) or display order
    if (sort_by === 'usage') {
      query = query.orderBy('usage_count', 'desc');
    } else {
      query = query.orderBy('display_order', 'asc');
    }

    const tags = await query;

    res.json({
      success: true,
      data: { tags }
    });
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tags'
    });
  }
}

/**
 * Create a new tag
 */
async function createTag(req, res) {
  try {
    const { name, category, color } = req.body;
    const userId = req.user.userId;

    // Check if tag name already exists
    const existing = await db('content_tags').where('name', name).first();
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A tag with this name already exists',
        errors: { name: 'Tag name must be unique' }
      });
    }

    // Get max display_order
    const maxOrder = await db('content_tags').max('display_order as max').first();
    const display_order = (maxOrder.max || 0) + 1;

    // Insert tag
    const [result] = await db('content_tags').insert({
      name,
      category: category || null,
      color: color || '#3B82F6',
      display_order,
      is_active: true,
      usage_count: 0,
      created_by: userId,
      created_at: new Date(),
      updated_at: new Date()
    }).returning('id');

    const tagId = result.id || result;
    const tag = await db('content_tags').where('id', tagId).first();

    // Log audit
    await auditLogService.logConfigChange({
      admin_id: userId,
      entity_type: 'tag',
      entity_id: tagId,
      action_type: 'create',
      after_state: tag,
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      data: { tag },
      message: 'Tag created successfully'
    });
  } catch (error) {
    console.error('Error creating tag:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create tag'
    });
  }
}

/**
 * Update a tag
 */
async function updateTag(req, res) {
  try {
    const { id } = req.params;
    const { name, category, color, is_active } = req.body;
    const userId = req.user.userId;

    // Get current state
    const before_state = await db('content_tags').where('id', id).first();
    if (!before_state) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found'
      });
    }

    const updates = { updated_at: new Date() };

    // Update name if changed
    if (name && name !== before_state.name) {
      // Check if new name already exists
      const existing = await db('content_tags')
        .where('name', name)
        .whereNot('id', id)
        .first();
      
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'A tag with this name already exists',
          errors: { name: 'Tag name must be unique' }
        });
      }

      updates.name = name;
    }

    if (category !== undefined) updates.category = category;
    if (color !== undefined) updates.color = color;
    if (is_active !== undefined) updates.is_active = is_active;

    // Update tag
    await db('content_tags').where('id', id).update(updates);

    const after_state = await db('content_tags').where('id', id).first();

    // Log audit
    await auditLogService.logConfigChange({
      admin_id: userId,
      entity_type: 'tag',
      entity_id: parseInt(id),
      action_type: 'update',
      before_state,
      after_state,
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.json({
      success: true,
      data: { tag: after_state },
      message: 'Tag updated successfully'
    });
  } catch (error) {
    console.error('Error updating tag:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update tag'
    });
  }
}

/**
 * Delete a tag
 */
async function deleteTag(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Get current state
    const before_state = await db('content_tags').where('id', id).first();
    if (!before_state) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found'
      });
    }

    // Check if tag is in use
    const { can_delete, usage_count } = await usageAnalyticsService.canDeleteEntity('tag', parseInt(id));
    if (!can_delete) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete tag because it is used by ${usage_count} course(s)`
      });
    }

    // Delete tag
    await db('content_tags').where('id', id).del();

    // Log audit
    await auditLogService.logConfigChange({
      admin_id: userId,
      entity_type: 'tag',
      entity_id: parseInt(id),
      action_type: 'delete',
      before_state,
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: 'Tag deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting tag:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete tag'
    });
  }
}

/**
 * Merge two tags
 */
async function mergeTags(req, res) {
  try {
    const { source_tag_id, target_tag_id } = req.body;
    const userId = req.user.userId;

    // Verify both tags exist
    const [sourceTag, targetTag] = await Promise.all([
      db('content_tags').where('id', source_tag_id).first(),
      db('content_tags').where('id', target_tag_id).first()
    ]);

    if (!sourceTag || !targetTag) {
      return res.status(404).json({
        success: false,
        message: 'One or both tags not found'
      });
    }

    // Get all courses using the source tag
    const courseTags = await db('course_tags').where('tag_id', source_tag_id);

    // Update course_tags to use target tag
    for (const courseTag of courseTags) {
      // Check if course already has target tag
      const existing = await db('course_tags')
        .where({
          course_id: courseTag.course_id,
          tag_id: target_tag_id
        })
        .first();

      if (!existing) {
        // Add target tag to course
        await db('course_tags')
          .where({
            course_id: courseTag.course_id,
            tag_id: source_tag_id
          })
          .update({ tag_id: target_tag_id });
      } else {
        // Remove duplicate source tag
        await db('course_tags')
          .where({
            course_id: courseTag.course_id,
            tag_id: source_tag_id
          })
          .del();
      }
    }

    // Update usage counts
    await usageAnalyticsService.updateEntityUsageCount('tag', target_tag_id);

    // Delete source tag
    await db('content_tags').where('id', source_tag_id).del();

    // Log audit
    await auditLogService.logConfigChange({
      admin_id: userId,
      entity_type: 'tag',
      entity_id: source_tag_id,
      action_type: 'delete',
      before_state: { ...sourceTag, merged_into: target_tag_id },
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: `Tag "${sourceTag.name}" merged into "${targetTag.name}" successfully`
    });
  } catch (error) {
    console.error('Error merging tags:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to merge tags'
    });
  }
}

// ============================================================================
// CHAPTERS (Enhanced)
// ============================================================================

/**
 * Get all chapters
 */
async function getChapters(req, res) {
  try {
    const { active_only } = req.query;

    let query = db('chapters')
      .select('*')
      .orderBy('display_order', 'asc');

    if (active_only === 'true') {
      query = query.where('is_active', true);
    }

    const chapters = await query;

    res.json({
      success: true,
      data: { chapters }
    });
  } catch (error) {
    console.error('Error fetching chapters:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chapters'
    });
  }
}

/**
 * Create a new chapter
 */
async function createChapter(req, res) {
  try {
    const { name, description } = req.body;
    const userId = req.user.userId;

    console.log('Creating chapter with name:', name);

    // Check if chapter name already exists (case-insensitive)
    const existing = await db('chapters')
      .whereRaw('LOWER(name) = LOWER(?)', [name])
      .first();
    
    console.log('Existing chapter check:', existing);
    
    if (existing) {
      console.log('Chapter already exists, returning 400');
      return res.status(400).json({
        success: false,
        message: `A chapter with the name "${existing.name}" already exists`,
        errors: { name: 'Chapter name must be unique' }
      });
    }

    // Get max display_order
    const maxOrder = await db('chapters').max('display_order as max').first();
    const display_order = (maxOrder.max || 0) + 1;

    console.log('Inserting chapter into database...');
    
    // Insert chapter
    const [result] = await db('chapters').insert({
      name,
      description: description || null,
      display_order,
      is_active: true,
      course_count: 0,
      created_at: new Date(),
      updated_at: new Date()
    }).returning('id');
    
    const chapterId = result.id || result;
    console.log('Chapter created with ID:', chapterId);

    const chapter = await db('chapters').where('id', chapterId).first();

    // Log audit
    await auditLogService.logConfigChange({
      admin_id: userId,
      entity_type: 'chapter',
      entity_id: chapterId,
      action_type: 'create',
      after_state: chapter,
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      data: { chapter },
      message: 'Chapter created successfully'
    });
  } catch (error) {
    console.error('Error creating chapter:', error);
    
    // Check if it's a unique constraint violation
    if (error.code === '23505' || error.message?.includes('unique')) {
      return res.status(400).json({
        success: false,
        message: 'A chapter with this name already exists',
        errors: { name: 'Chapter name must be unique' }
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create chapter'
    });
  }
}

/**
 * Update a chapter
 */
async function updateChapter(req, res) {
  try {
    const { id } = req.params;
    const { name, description, is_active } = req.body;
    const userId = req.user.userId;

    // Get current state
    const before_state = await db('chapters').where('id', id).first();
    if (!before_state) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found'
      });
    }

    const updates = { updated_at: new Date() };

    // Update name if changed
    if (name && name !== before_state.name) {
      // Check if new name already exists
      const existing = await db('chapters')
        .where('name', name)
        .whereNot('id', id)
        .first();
      
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'A chapter with this name already exists',
          errors: { name: 'Chapter name must be unique' }
        });
      }

      updates.name = name;
    }

    if (description !== undefined) updates.description = description;
    if (is_active !== undefined) updates.is_active = is_active;

    // Update chapter
    await db('chapters').where('id', id).update(updates);

    const after_state = await db('chapters').where('id', id).first();

    // Log audit
    await auditLogService.logConfigChange({
      admin_id: userId,
      entity_type: 'chapter',
      entity_id: parseInt(id),
      action_type: 'update',
      before_state,
      after_state,
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.json({
      success: true,
      data: { chapter: after_state },
      message: 'Chapter updated successfully'
    });
  } catch (error) {
    console.error('Error updating chapter:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update chapter'
    });
  }
}

/**
 * Delete a chapter
 */
async function deleteChapter(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Get current state
    const before_state = await db('chapters').where('id', id).first();
    if (!before_state) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found'
      });
    }

    // Check if chapter has courses
    const { can_delete, usage_count } = await usageAnalyticsService.canDeleteEntity('chapter', parseInt(id));
    if (!can_delete) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete chapter because it contains ${usage_count} course(s)`
      });
    }

    // Delete chapter
    await db('chapters').where('id', id).del();

    // Log audit
    await auditLogService.logConfigChange({
      admin_id: userId,
      entity_type: 'chapter',
      entity_id: parseInt(id),
      action_type: 'delete',
      before_state,
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: 'Chapter deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting chapter:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete chapter'
    });
  }
}

module.exports = {
  ...module.exports,
  getTags,
  createTag,
  updateTag,
  deleteTag,
  mergeTags,
  getChapters,
  createChapter,
  updateChapter,
  deleteChapter
};

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Bulk action for categories
 */
async function bulkActionCategories(req, res) {
  try {
    const { action, ids } = req.body;
    const userId = req.user.userId;

    const results = {
      successful: 0,
      failed: 0,
      errors: []
    };

    for (const id of ids) {
      try {
        const category = await db('course_categories').where('id', id).first();
        if (!category) {
          results.failed++;
          results.errors.push({ id, error: 'Category not found' });
          continue;
        }

        const before_state = { ...category };

        if (action === 'activate') {
          await db('course_categories').where('id', id).update({ is_active: true, updated_at: new Date() });
          results.successful++;
        } else if (action === 'deactivate') {
          await db('course_categories').where('id', id).update({ is_active: false, updated_at: new Date() });
          results.successful++;
        } else if (action === 'delete') {
          const { can_delete, usage_count } = await usageAnalyticsService.canDeleteEntity('category', id);
          if (!can_delete) {
            results.failed++;
            results.errors.push({ id, error: `Used by ${usage_count} course(s)` });
            continue;
          }
          await db('course_categories').where('id', id).del();
          results.successful++;
        }

        // Log audit
        await auditLogService.logConfigChange({
          admin_id: userId,
          entity_type: 'category',
          entity_id: id,
          action_type: action,
          before_state,
          ip_address: req.ip,
          user_agent: req.get('user-agent')
        });
      } catch (error) {
        results.failed++;
        results.errors.push({ id, error: error.message });
      }
    }

    res.json({
      success: true,
      data: results,
      message: `Bulk action completed: ${results.successful} successful, ${results.failed} failed`
    });
  } catch (error) {
    console.error('Error performing bulk action on categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk action'
    });
  }
}

/**
 * Bulk action for levels
 */
async function bulkActionLevels(req, res) {
  try {
    const { action, ids } = req.body;
    const userId = req.user.userId;

    const results = {
      successful: 0,
      failed: 0,
      errors: []
    };

    // Special check for deactivate: ensure at least one level remains active
    if (action === 'deactivate') {
      const activeLevels = await db('course_levels').where('is_active', true);
      const remainingActive = activeLevels.filter(level => !ids.includes(level.id));
      
      if (remainingActive.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot deactivate all levels. At least one level must remain active.'
        });
      }
    }

    for (const id of ids) {
      try {
        const level = await db('course_levels').where('id', id).first();
        if (!level) {
          results.failed++;
          results.errors.push({ id, error: 'Level not found' });
          continue;
        }

        const before_state = { ...level };

        if (action === 'activate') {
          await db('course_levels').where('id', id).update({ is_active: true, updated_at: new Date() });
          results.successful++;
        } else if (action === 'deactivate') {
          await db('course_levels').where('id', id).update({ is_active: false, updated_at: new Date() });
          results.successful++;
        } else if (action === 'delete') {
          const { can_delete, usage_count } = await usageAnalyticsService.canDeleteEntity('level', id);
          if (!can_delete) {
            results.failed++;
            results.errors.push({ id, error: `Used by ${usage_count} course(s)` });
            continue;
          }
          await db('course_levels').where('id', id).del();
          results.successful++;
        }

        // Log audit
        await auditLogService.logConfigChange({
          admin_id: userId,
          entity_type: 'level',
          entity_id: id,
          action_type: action,
          before_state,
          ip_address: req.ip,
          user_agent: req.get('user-agent')
        });
      } catch (error) {
        results.failed++;
        results.errors.push({ id, error: error.message });
      }
    }

    res.json({
      success: true,
      data: results,
      message: `Bulk action completed: ${results.successful} successful, ${results.failed} failed`
    });
  } catch (error) {
    console.error('Error performing bulk action on levels:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk action'
    });
  }
}

/**
 * Bulk action for durations
 */
async function bulkActionDurations(req, res) {
  try {
    const { action, ids } = req.body;
    const userId = req.user.userId;

    const results = {
      successful: 0,
      failed: 0,
      errors: []
    };

    for (const id of ids) {
      try {
        const duration = await db('course_durations').where('id', id).first();
        if (!duration) {
          results.failed++;
          results.errors.push({ id, error: 'Duration not found' });
          continue;
        }

        const before_state = { ...duration };

        if (action === 'activate') {
          await db('course_durations').where('id', id).update({ is_active: true, updated_at: new Date() });
          results.successful++;
        } else if (action === 'deactivate') {
          await db('course_durations').where('id', id).update({ is_active: false, updated_at: new Date() });
          results.successful++;
        } else if (action === 'delete') {
          const { can_delete, usage_count } = await usageAnalyticsService.canDeleteEntity('duration', id);
          if (!can_delete) {
            results.failed++;
            results.errors.push({ id, error: `Used by ${usage_count} course(s)` });
            continue;
          }
          await db('course_durations').where('id', id).del();
          results.successful++;
        }

        // Log audit
        await auditLogService.logConfigChange({
          admin_id: userId,
          entity_type: 'duration',
          entity_id: id,
          action_type: action,
          before_state,
          ip_address: req.ip,
          user_agent: req.get('user-agent')
        });
      } catch (error) {
        results.failed++;
        results.errors.push({ id, error: error.message });
      }
    }

    res.json({
      success: true,
      data: results,
      message: `Bulk action completed: ${results.successful} successful, ${results.failed} failed`
    });
  } catch (error) {
    console.error('Error performing bulk action on durations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk action'
    });
  }
}

/**
 * Bulk action for tags
 */
async function bulkActionTags(req, res) {
  try {
    const { action, ids } = req.body;
    const userId = req.user.userId;

    const results = {
      successful: 0,
      failed: 0,
      errors: []
    };

    for (const id of ids) {
      try {
        const tag = await db('content_tags').where('id', id).first();
        if (!tag) {
          results.failed++;
          results.errors.push({ id, error: 'Tag not found' });
          continue;
        }

        const before_state = { ...tag };

        if (action === 'activate') {
          await db('content_tags').where('id', id).update({ is_active: true, updated_at: new Date() });
          results.successful++;
        } else if (action === 'deactivate') {
          await db('content_tags').where('id', id).update({ is_active: false, updated_at: new Date() });
          results.successful++;
        } else if (action === 'delete') {
          const { can_delete, usage_count } = await usageAnalyticsService.canDeleteEntity('tag', id);
          if (!can_delete) {
            results.failed++;
            results.errors.push({ id, error: `Used by ${usage_count} course(s)` });
            continue;
          }
          await db('content_tags').where('id', id).del();
          results.successful++;
        }

        // Log audit
        await auditLogService.logConfigChange({
          admin_id: userId,
          entity_type: 'tag',
          entity_id: id,
          action_type: action,
          before_state,
          ip_address: req.ip,
          user_agent: req.get('user-agent')
        });
      } catch (error) {
        results.failed++;
        results.errors.push({ id, error: error.message });
      }
    }

    res.json({
      success: true,
      data: results,
      message: `Bulk action completed: ${results.successful} successful, ${results.failed} failed`
    });
  } catch (error) {
    console.error('Error performing bulk action on tags:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk action'
    });
  }
}

/**
 * Bulk action for chapters
 */
async function bulkActionChapters(req, res) {
  try {
    const { action, ids } = req.body;
    const userId = req.user.userId;

    const results = {
      successful: 0,
      failed: 0,
      errors: []
    };

    for (const id of ids) {
      try {
        const chapter = await db('chapters').where('id', id).first();
        if (!chapter) {
          results.failed++;
          results.errors.push({ id, error: 'Chapter not found' });
          continue;
        }

        const before_state = { ...chapter };

        if (action === 'activate') {
          await db('chapters').where('id', id).update({ is_active: true, updated_at: new Date() });
          results.successful++;
        } else if (action === 'deactivate') {
          await db('chapters').where('id', id).update({ is_active: false, updated_at: new Date() });
          results.successful++;
        } else if (action === 'delete') {
          const { can_delete, usage_count } = await usageAnalyticsService.canDeleteEntity('chapter', id);
          if (!can_delete) {
            results.failed++;
            results.errors.push({ id, error: `Contains ${usage_count} course(s)` });
            continue;
          }
          await db('chapters').where('id', id).del();
          results.successful++;
        }

        // Log audit
        await auditLogService.logConfigChange({
          admin_id: userId,
          entity_type: 'chapter',
          entity_id: id,
          action_type: action,
          before_state,
          ip_address: req.ip,
          user_agent: req.get('user-agent')
        });
      } catch (error) {
        results.failed++;
        results.errors.push({ id, error: error.message });
      }
    }

    res.json({
      success: true,
      data: results,
      message: `Bulk action completed: ${results.successful} successful, ${results.failed} failed`
    });
  } catch (error) {
    console.error('Error performing bulk action on chapters:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk action'
    });
  }
}

// ============================================================================
// REORDERING
// ============================================================================

/**
 * Reorder categories
 */
async function reorderCategories(req, res) {
  try {
    const { items } = req.body;
    const userId = req.user.userId;

    // Update display_order for each item
    for (const item of items) {
      await db('course_categories')
        .where('id', item.id)
        .update({ display_order: item.display_order, updated_at: new Date() });
    }

    // Log audit
    await auditLogService.logConfigChange({
      admin_id: userId,
      entity_type: 'category',
      entity_id: 0,
      action_type: 'reorder',
      after_state: { items },
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: 'Categories reordered successfully'
    });
  } catch (error) {
    console.error('Error reordering categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reorder categories'
    });
  }
}

/**
 * Reorder levels
 */
async function reorderLevels(req, res) {
  try {
    const { items } = req.body;
    const userId = req.user.userId;

    // Update display_order for each item
    for (const item of items) {
      await db('course_levels')
        .where('id', item.id)
        .update({ display_order: item.display_order, updated_at: new Date() });
    }

    // Log audit
    await auditLogService.logConfigChange({
      admin_id: userId,
      entity_type: 'level',
      entity_id: 0,
      action_type: 'reorder',
      after_state: { items },
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: 'Levels reordered successfully'
    });
  } catch (error) {
    console.error('Error reordering levels:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reorder levels'
    });
  }
}

// ============================================================================
// AUDIT LOGS
// ============================================================================

/**
 * Get audit logs with filtering
 */
async function getAuditLogs(req, res) {
  try {
    const filters = {
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      admin_id: req.query.admin_id ? parseInt(req.query.admin_id) : undefined,
      entity_type: req.query.entity_type,
      action_type: req.query.action_type,
      page: req.query.page ? parseInt(req.query.page) : 1,
      limit: req.query.limit ? parseInt(req.query.limit) : 50
    };

    const result = await auditLogService.getAuditLogs(filters);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs'
    });
  }
}

// ============================================================================
// USAGE ANALYTICS
// ============================================================================

/**
 * Get usage details for an entity
 */
async function getUsageDetails(req, res) {
  try {
    const { entityType, id } = req.params;

    const details = await usageAnalyticsService.getUsageDetails(entityType, parseInt(id));

    res.json({
      success: true,
      data: details
    });
  } catch (error) {
    console.error('Error fetching usage details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch usage details'
    });
  }
}

module.exports = {
  ...module.exports,
  bulkActionCategories,
  bulkActionLevels,
  bulkActionDurations,
  bulkActionTags,
  bulkActionChapters,
  reorderCategories,
  reorderLevels,
  getAuditLogs,
  getUsageDetails
};
