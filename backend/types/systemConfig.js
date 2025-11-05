/**
 * System Configuration Type Definitions
 * 
 * These JSDoc type definitions provide TypeScript-like interfaces for system configuration entities.
 * They are used throughout the backend for type checking and documentation.
 */

/**
 * @typedef {Object} CourseCategory
 * @property {number} id - Unique identifier
 * @property {string} name - Category name (3-50 characters)
 * @property {string} slug - URL-friendly slug (auto-generated from name)
 * @property {string} [icon] - Lucide icon name
 * @property {string} [description] - Category description (max 500 characters)
 * @property {number} display_order - Display order for sorting
 * @property {boolean} is_active - Whether category is active
 * @property {number} [usage_count] - Number of courses using this category
 * @property {number} created_by - User ID who created this category
 * @property {Date} created_at - Creation timestamp
 * @property {Date} updated_at - Last update timestamp
 */

/**
 * @typedef {Object} CourseLevel
 * @property {number} id - Unique identifier
 * @property {string} name - Level name (3-30 characters)
 * @property {string} slug - URL-friendly slug (auto-generated from name)
 * @property {string} description - Level description (10-100 characters)
 * @property {number} display_order - Display order for sorting
 * @property {boolean} is_active - Whether level is active
 * @property {number} [usage_count] - Number of courses using this level
 * @property {number} created_by - User ID who created this level
 * @property {Date} created_at - Creation timestamp
 * @property {Date} updated_at - Last update timestamp
 */

/**
 * @typedef {Object} CourseDuration
 * @property {number} id - Unique identifier
 * @property {string} value - Duration value (e.g., "1-2", "3-4", "9+")
 * @property {string} label - Display label (e.g., "1-2 weeks")
 * @property {number} [weeks_min] - Minimum weeks
 * @property {number} [weeks_max] - Maximum weeks
 * @property {number} display_order - Display order for sorting
 * @property {boolean} is_active - Whether duration is active
 * @property {number} [usage_count] - Number of courses using this duration
 * @property {number} created_by - User ID who created this duration
 * @property {Date} created_at - Creation timestamp
 * @property {Date} updated_at - Last update timestamp
 */

/**
 * @typedef {Object} EnhancedTag
 * @property {number} id - Unique identifier
 * @property {string} name - Tag name (2-30 characters, alphanumeric with hyphens)
 * @property {string} [category] - Tag category (max 50 characters)
 * @property {string} color - Hex color code (default: #3B82F6)
 * @property {number} display_order - Display order for sorting
 * @property {boolean} is_active - Whether tag is active
 * @property {number} usage_count - Number of courses using this tag
 * @property {number} created_by - User ID who created this tag
 * @property {Date} created_at - Creation timestamp
 * @property {Date} updated_at - Last update timestamp
 */

/**
 * @typedef {Object} EnhancedChapter
 * @property {number} id - Unique identifier
 * @property {string} name - Chapter name (3-100 characters)
 * @property {string} [description] - Chapter description (max 500 characters)
 * @property {number} display_order - Display order for sorting
 * @property {boolean} is_active - Whether chapter is active
 * @property {number} course_count - Number of courses in this chapter
 * @property {Date} created_at - Creation timestamp
 * @property {Date} updated_at - Last update timestamp
 */

/**
 * @typedef {Object} ConfigAuditLog
 * @property {number} id - Unique identifier
 * @property {number} admin_id - Admin user ID who made the change
 * @property {string} admin_name - Admin user name
 * @property {string} entity_type - Type of entity ('category', 'level', 'duration', 'tag', 'chapter')
 * @property {number} entity_id - ID of the entity that was changed
 * @property {string} action_type - Type of action ('create', 'update', 'delete', 'activate', 'deactivate')
 * @property {Object} [before_state] - State before the change (JSONB)
 * @property {Object} [after_state] - State after the change (JSONB)
 * @property {string} [ip_address] - IP address of the admin
 * @property {string} [user_agent] - User agent string
 * @property {Date} created_at - Timestamp of the change
 */

/**
 * @typedef {Object} EntityMetrics
 * @property {number} total - Total count of entities
 * @property {number} active - Count of active entities
 * @property {number} inactive - Count of inactive entities
 */

/**
 * @typedef {Object} SystemConfigMetrics
 * @property {EntityMetrics} categories - Category metrics
 * @property {EntityMetrics} levels - Level metrics
 * @property {EntityMetrics} durations - Duration metrics
 * @property {EntityMetrics} tags - Tag metrics
 * @property {EntityMetrics} chapters - Chapter metrics
 * @property {ConfigAuditLog[]} recent_changes - Recent configuration changes
 */

/**
 * @typedef {Object} BulkActionRequest
 * @property {string} action - Action to perform ('activate', 'deactivate', 'delete')
 * @property {number[]} ids - Array of entity IDs to act upon
 */

/**
 * @typedef {Object} BulkActionResult
 * @property {number} successful - Count of successful operations
 * @property {number} failed - Count of failed operations
 * @property {Array<{id: number, error: string}>} errors - Details of failed operations
 */

/**
 * @typedef {Object} ReorderRequest
 * @property {Array<{id: number, display_order: number}>} items - Items with new display orders
 */

/**
 * @typedef {Object} MergeTagsRequest
 * @property {number} source_tag_id - Tag to merge from
 * @property {number} target_tag_id - Tag to merge into
 */

/**
 * @typedef {Object} UsageDetails
 * @property {number} entity_id - Entity ID
 * @property {string} entity_type - Entity type
 * @property {number} usage_count - Total usage count
 * @property {Array<{id: number, title: string}>} courses - Courses using this entity
 */

/**
 * @typedef {Object} ValidationError
 * @property {string} field - Field name that failed validation
 * @property {string} message - Error message
 */

module.exports = {};
