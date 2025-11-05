const db = require('../config/database');

/**
 * Usage Analytics Service
 * 
 * Provides analytics and usage tracking for system configuration entities.
 * Calculates usage counts and provides details about which courses use each option.
 */

/**
 * Get usage details for a specific entity
 * @param {string} entity_type - Type of entity ('category', 'level', 'duration', 'tag', 'chapter')
 * @param {number} entity_id - ID of the entity
 * @returns {Promise<{entity_id: number, entity_type: string, usage_count: number, courses: Array}>}
 */
async function getUsageDetails(entity_type, entity_id) {
  try {
    let courses = [];
    let usage_count = 0;

    switch (entity_type) {
      case 'category': {
        // Get category slug
        const category = await db('course_categories')
          .where('id', entity_id)
          .select('slug')
          .first();

        if (category) {
          courses = await db('courses')
            .where('category', category.slug)
            .select('id', 'title', 'is_published')
            .orderBy('title');
          usage_count = courses.length;
        }
        break;
      }

      case 'level': {
        // Get level slug
        const level = await db('course_levels')
          .where('id', entity_id)
          .select('slug')
          .first();

        if (level) {
          courses = await db('courses')
            .where('level', level.slug)
            .select('id', 'title', 'is_published')
            .orderBy('title');
          usage_count = courses.length;
        }
        break;
      }

      case 'duration': {
        // Get duration value
        const duration = await db('course_durations')
          .where('id', entity_id)
          .select('value')
          .first();

        if (duration) {
          courses = await db('courses')
            .where('estimated_duration', duration.value)
            .select('id', 'title', 'is_published')
            .orderBy('title');
          usage_count = courses.length;
        }
        break;
      }

      case 'tag': {
        // Get courses with this tag
        courses = await db('course_tags as ct')
          .join('courses as c', 'ct.course_id', 'c.id')
          .where('ct.tag_id', entity_id)
          .select('c.id', 'c.title', 'c.is_published')
          .orderBy('c.title');
        usage_count = courses.length;
        break;
      }

      case 'chapter': {
        // Get courses in this chapter
        courses = await db('courses')
          .where('chapter_id', entity_id)
          .select('id', 'title', 'is_published')
          .orderBy('title');
        usage_count = courses.length;
        break;
      }

      default:
        throw new Error(`Invalid entity type: ${entity_type}`);
    }

    return {
      entity_id,
      entity_type,
      usage_count,
      courses
    };
  } catch (error) {
    console.error('Error getting usage details:', error);
    throw error;
  }
}

/**
 * Calculate and update usage counts for categories
 * @returns {Promise<void>}
 */
async function updateCategoryUsageCounts() {
  try {
    const categories = await db('course_categories').select('id', 'slug');

    for (const category of categories) {
      const count = await db('courses')
        .where('category', category.slug)
        .count('* as count')
        .first();

      await db('course_categories')
        .where('id', category.id)
        .update({ usage_count: parseInt(count.count) });
    }
  } catch (error) {
    console.error('Error updating category usage counts:', error);
    throw error;
  }
}

/**
 * Calculate and update usage counts for levels
 * @returns {Promise<void>}
 */
async function updateLevelUsageCounts() {
  try {
    const levels = await db('course_levels').select('id', 'slug');

    for (const level of levels) {
      const count = await db('courses')
        .where('level', level.slug)
        .count('* as count')
        .first();

      await db('course_levels')
        .where('id', level.id)
        .update({ usage_count: parseInt(count.count) });
    }
  } catch (error) {
    console.error('Error updating level usage counts:', error);
    throw error;
  }
}

/**
 * Calculate and update usage counts for durations
 * @returns {Promise<void>}
 */
async function updateDurationUsageCounts() {
  try {
    const durations = await db('course_durations').select('id', 'value');

    for (const duration of durations) {
      const count = await db('courses')
        .where('estimated_duration', duration.value)
        .count('* as count')
        .first();

      await db('course_durations')
        .where('id', duration.id)
        .update({ usage_count: parseInt(count.count) });
    }
  } catch (error) {
    console.error('Error updating duration usage counts:', error);
    throw error;
  }
}

/**
 * Calculate and update usage counts for tags
 * @returns {Promise<void>}
 */
async function updateTagUsageCounts() {
  try {
    const tags = await db('content_tags').select('id');

    for (const tag of tags) {
      const count = await db('course_tags')
        .where('tag_id', tag.id)
        .count('* as count')
        .first();

      await db('content_tags')
        .where('id', tag.id)
        .update({ usage_count: parseInt(count.count) });
    }
  } catch (error) {
    console.error('Error updating tag usage counts:', error);
    throw error;
  }
}

/**
 * Calculate and update course counts for chapters
 * @returns {Promise<void>}
 */
async function updateChapterCourseCounts() {
  try {
    const chapters = await db('chapters').select('id');

    for (const chapter of chapters) {
      const count = await db('courses')
        .where('chapter_id', chapter.id)
        .count('* as count')
        .first();

      await db('chapters')
        .where('id', chapter.id)
        .update({ course_count: parseInt(count.count) });
    }
  } catch (error) {
    console.error('Error updating chapter course counts:', error);
    throw error;
  }
}

/**
 * Update all usage counts
 * @returns {Promise<void>}
 */
async function updateAllUsageCounts() {
  try {
    await Promise.all([
      updateCategoryUsageCounts(),
      updateLevelUsageCounts(),
      updateDurationUsageCounts(),
      updateTagUsageCounts(),
      updateChapterCourseCounts()
    ]);
  } catch (error) {
    console.error('Error updating all usage counts:', error);
    throw error;
  }
}

/**
 * Update usage count for a specific entity
 * @param {string} entity_type - Type of entity
 * @param {number} entity_id - ID of the entity
 * @returns {Promise<number>} - Updated usage count
 */
async function updateEntityUsageCount(entity_type, entity_id) {
  try {
    const details = await getUsageDetails(entity_type, entity_id);
    const usage_count = details.usage_count;

    // Update the usage count in the database
    switch (entity_type) {
      case 'category':
        await db('course_categories')
          .where('id', entity_id)
          .update({ usage_count });
        break;
      case 'level':
        await db('course_levels')
          .where('id', entity_id)
          .update({ usage_count });
        break;
      case 'duration':
        await db('course_durations')
          .where('id', entity_id)
          .update({ usage_count });
        break;
      case 'tag':
        await db('content_tags')
          .where('id', entity_id)
          .update({ usage_count });
        break;
      case 'chapter':
        await db('chapters')
          .where('id', entity_id)
          .update({ course_count: usage_count });
        break;
    }

    return usage_count;
  } catch (error) {
    console.error('Error updating entity usage count:', error);
    throw error;
  }
}

/**
 * Check if an entity can be deleted (usage_count = 0)
 * @param {string} entity_type - Type of entity
 * @param {number} entity_id - ID of the entity
 * @returns {Promise<{can_delete: boolean, usage_count: number}>}
 */
async function canDeleteEntity(entity_type, entity_id) {
  try {
    const details = await getUsageDetails(entity_type, entity_id);
    return {
      can_delete: details.usage_count === 0,
      usage_count: details.usage_count
    };
  } catch (error) {
    console.error('Error checking if entity can be deleted:', error);
    throw error;
  }
}

module.exports = {
  getUsageDetails,
  updateCategoryUsageCounts,
  updateLevelUsageCounts,
  updateDurationUsageCounts,
  updateTagUsageCounts,
  updateChapterCourseCounts,
  updateAllUsageCounts,
  updateEntityUsageCount,
  canDeleteEntity
};
