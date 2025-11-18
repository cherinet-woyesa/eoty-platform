const db = require('../config/database');

/**
 * Audit Logging Service
 * 
 * Handles logging of all system configuration changes for audit trail purposes.
 * Captures before/after states, admin information, and request metadata.
 */

/**
 * Log a configuration change
 * @param {Object} params - Logging parameters
 * @param {number} params.admin_id - ID of the admin making the change
 * @param {string} params.entity_type - Type of entity ('category', 'level', 'duration', 'tag', 'chapter')
 * @param {number} params.entity_id - ID of the entity being changed
 * @param {string} params.action_type - Type of action ('create', 'update', 'delete', 'activate', 'deactivate')
 * @param {Object} [params.before_state] - State before the change
 * @param {Object} [params.after_state] - State after the change
 * @param {string} [params.ip_address] - IP address of the request
 * @param {string} [params.user_agent] - User agent string
 * @returns {Promise<number>} - ID of the created audit log entry
 */
async function logConfigChange({
  admin_id,
  entity_type,
  entity_id,
  action_type,
  before_state = null,
  after_state = null,
  ip_address = null,
  user_agent = null
}) {
  try {
    // Check if audit table exists; if not, skip logging gracefully
    const hasTable = await db.schema.hasTable('system_config_audit');
    if (!hasTable) {
      console.warn('system_config_audit table does not exist, skipping config change log');
      return null;
    }

    const [logId] = await db('system_config_audit').insert({
      admin_id,
      entity_type,
      entity_id,
      action_type,
      before_state: before_state ? JSON.stringify(before_state) : null,
      after_state: after_state ? JSON.stringify(after_state) : null,
      ip_address,
      user_agent,
      created_at: new Date()
    }).returning('id');

    return logId;
  } catch (error) {
    console.error('Error logging configuration change:', error);
    // Don't throw - audit logging should not break the main operation
    return null;
  }
}

/**
 * Get audit logs with filtering and pagination
 * @param {Object} filters - Filter parameters
 * @param {Date} [filters.start_date] - Start date for filtering
 * @param {Date} [filters.end_date] - End date for filtering
 * @param {number} [filters.admin_id] - Filter by admin user ID
 * @param {string} [filters.entity_type] - Filter by entity type
 * @param {string} [filters.action_type] - Filter by action type
 * @param {number} [filters.page=1] - Page number
 * @param {number} [filters.limit=50] - Items per page
 * @returns {Promise<{logs: Array, total: number, page: number, limit: number}>}
 */
async function getAuditLogs(filters = {}) {
  try {
    const {
      start_date,
      end_date,
      admin_id,
      entity_type,
      action_type,
      page = 1,
      limit = 50
    } = filters;

    // Check if audit table exists; if not, return empty result
    const hasTable = await db.schema.hasTable('system_config_audit');
    if (!hasTable) {
      console.warn('system_config_audit table does not exist, returning empty audit logs');
      return {
        logs: [],
        total: 0,
        page: 1,
        limit: filters.limit || 50,
        pages: 0
      };
    }

    // Build query
    let query = db('system_config_audit as sca')
      .leftJoin('users as u', 'sca.admin_id', 'u.id')
      .select(
        'sca.*',
        'u.first_name as admin_first_name',
        'u.last_name as admin_last_name',
        'u.email as admin_email'
      )
      .orderBy('sca.created_at', 'desc');

    // Apply filters
    if (start_date) {
      query = query.where('sca.created_at', '>=', start_date);
    }
    if (end_date) {
      query = query.where('sca.created_at', '<=', end_date);
    }
    if (admin_id) {
      query = query.where('sca.admin_id', admin_id);
    }
    if (entity_type) {
      query = query.where('sca.entity_type', entity_type);
    }
    if (action_type) {
      query = query.where('sca.action_type', action_type);
    }

    // Get total count
    const countQuery = query.clone().clearSelect().clearOrder().count('* as count');
    const [{ count }] = await countQuery;
    const total = parseInt(count);

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.limit(limit).offset(offset);

    // Execute query
    const logs = await query;

    // Format logs
    const formattedLogs = logs.map(log => ({
      ...log,
      admin_name: `${log.admin_first_name} ${log.admin_last_name}`,
      before_state: log.before_state ? JSON.parse(log.before_state) : null,
      after_state: log.after_state ? JSON.parse(log.after_state) : null
    }));

    return {
      logs: formattedLogs,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit)
    };
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    throw error;
  }
}

/**
 * Get audit logs for a specific entity
 * @param {string} entity_type - Type of entity
 * @param {number} entity_id - ID of the entity
 * @param {number} [limit=10] - Number of logs to retrieve
 * @returns {Promise<Array>}
 */
async function getEntityAuditLogs(entity_type, entity_id, limit = 10) {
  try {
    const hasTable = await db.schema.hasTable('system_config_audit');
    if (!hasTable) {
      console.warn('system_config_audit table does not exist, returning empty entity audit logs');
      return [];
    }

    const logs = await db('system_config_audit as sca')
      .leftJoin('users as u', 'sca.admin_id', 'u.id')
      .where({
        'sca.entity_type': entity_type,
        'sca.entity_id': entity_id
      })
      .select(
        'sca.*',
        'u.first_name as admin_first_name',
        'u.last_name as admin_last_name',
        'u.email as admin_email'
      )
      .orderBy('sca.created_at', 'desc')
      .limit(limit);

    return logs.map(log => ({
      ...log,
      admin_name: `${log.admin_first_name} ${log.admin_last_name}`,
      before_state: log.before_state ? JSON.parse(log.before_state) : null,
      after_state: log.after_state ? JSON.parse(log.after_state) : null
    }));
  } catch (error) {
    console.error('Error fetching entity audit logs:', error);
    throw error;
  }
}

/**
 * Get recent configuration changes for dashboard
 * @param {number} [limit=10] - Number of recent changes to retrieve
 * @returns {Promise<Array>}
 */
async function getRecentChanges(limit = 10) {
  try {
    const hasTable = await db.schema.hasTable('system_config_audit');
    if (!hasTable) {
      console.warn('system_config_audit table does not exist, returning empty recent changes');
      return [];
    }

    const changes = await db('system_config_audit as sca')
      .leftJoin('users as u', 'sca.admin_id', 'u.id')
      .select(
        'sca.id',
        'sca.admin_id',
        'sca.entity_type',
        'sca.entity_id',
        'sca.action_type',
        'sca.created_at',
        'u.first_name as admin_first_name',
        'u.last_name as admin_last_name',
        'u.email as admin_email'
      )
      .orderBy('sca.created_at', 'desc')
      .limit(limit);

    return changes.map(change => ({
      ...change,
      admin_name: `${change.admin_first_name} ${change.admin_last_name}`
    }));
  } catch (error) {
    console.error('Error fetching recent changes:', error);
    throw error;
  }
}

module.exports = {
  logConfigChange,
  getAuditLogs,
  getEntityAuditLogs,
  getRecentChanges
};
