/**
 * Chapter Role Service - Handles chapter-specific role assignments
 * Supports FR7 multi-city chapter system with regional roles
 */

const db = require('../config/database');

class ChapterRoleService {
  /**
   * Assign a chapter-specific role to a user
   * @param {string} userId - User ID
   * @param {number} chapterId - Chapter ID
   * @param {string} role - Role type (chapter_admin, regional_coordinator)
   * @param {string} assignedBy - User ID of person assigning the role
   * @param {Object} permissions - Additional custom permissions (optional)
   */
  static async assignChapterRole(userId, chapterId, role, assignedBy, permissions = {}) {
    try {
      // Validate role
      const validRoles = ['chapter_admin', 'regional_coordinator'];
      if (!validRoles.includes(role)) {
        throw new Error(`Invalid chapter role: ${role}`);
      }

      // Check if user already has this role for this chapter
      const existingRole = await db('user_chapter_roles')
        .where({ user_id: userId, chapter_id: chapterId, role })
        .first();

      if (existingRole) {
        // Update existing role
        await db('user_chapter_roles')
          .where({ id: existingRole.id })
          .update({
            permissions: JSON.stringify(permissions),
            assigned_at: db.fn.now(),
            assigned_by: assignedBy
          });
        return existingRole.id;
      } else {
        // Create new role assignment
        const result = await db('user_chapter_roles').insert({
          user_id: userId,
          chapter_id: chapterId,
          role,
          permissions: JSON.stringify(permissions),
          assigned_at: db.fn.now(),
          assigned_by: assignedBy
        }).returning('id');

        return result[0]?.id || result[0];
      }
    } catch (error) {
      console.error('Error assigning chapter role:', error);
      throw error;
    }
  }

  /**
   * Remove a chapter-specific role from a user
   * @param {string} userId - User ID
   * @param {number} chapterId - Chapter ID
   * @param {string} role - Role type to remove
   */
  static async removeChapterRole(userId, chapterId, role) {
    try {
      await db('user_chapter_roles')
        .where({ user_id: userId, chapter_id: chapterId, role })
        .del();
      return true;
    } catch (error) {
      console.error('Error removing chapter role:', error);
      throw error;
    }
  }

  /**
   * Get all chapter-specific roles for a user
   * @param {string} userId - User ID
   */
  static async getUserChapterRoles(userId) {
    try {
      const roles = await db('user_chapter_roles')
        .join('chapters', 'user_chapter_roles.chapter_id', 'chapters.id')
        .where('user_chapter_roles.user_id', userId)
        .select(
          'user_chapter_roles.*',
          'chapters.name as chapter_name',
          'chapters.location as chapter_location',
          'chapters.city as chapter_city',
          'chapters.country as chapter_country'
        );

      // Parse permissions JSON
      return roles.map(role => ({
        ...role,
        permissions: typeof role.permissions === 'string'
          ? JSON.parse(role.permissions)
          : role.permissions
      }));
    } catch (error) {
      console.error('Error getting user chapter roles:', error);
      throw error;
    }
  }

  /**
   * Get all users with chapter-specific roles for a chapter
   * @param {number} chapterId - Chapter ID
   */
  static async getChapterRoleUsers(chapterId) {
    try {
      const users = await db('user_chapter_roles')
        .join('users', 'user_chapter_roles.user_id', 'users.id')
        .where('user_chapter_roles.chapter_id', chapterId)
        .select(
          'user_chapter_roles.*',
          'users.first_name',
          'users.last_name',
          'users.email',
          'users.profile_picture'
        );

      // Parse permissions JSON
      return users.map(user => ({
        ...user,
        permissions: typeof user.permissions === 'string'
          ? JSON.parse(user.permissions)
          : user.permissions
      }));
    } catch (error) {
      console.error('Error getting chapter role users:', error);
      throw error;
    }
  }

  /**
   * Get all chapter admins for a region (multiple chapters)
   * @param {string} region - Region identifier (can be country, state, etc.)
   */
  static async getRegionalAdmins(region) {
    try {
      // This assumes chapters have a 'region' column
      // For now, we'll get all chapter admins and filter by region
      const admins = await db('user_chapter_roles')
        .join('chapters', 'user_chapter_roles.chapter_id', 'chapters.id')
        .join('users', 'user_chapter_roles.user_id', 'users.id')
        .where('user_chapter_roles.role', 'chapter_admin')
        .where('chapters.country', region) // Using country as region for now
        .select(
          'user_chapter_roles.*',
          'chapters.name as chapter_name',
          'chapters.location as chapter_location',
          'users.first_name',
          'users.last_name',
          'users.email'
        );

      return admins.map(admin => ({
        ...admin,
        permissions: typeof admin.permissions === 'string'
          ? JSON.parse(admin.permissions)
          : admin.permissions
      }));
    } catch (error) {
      console.error('Error getting regional admins:', error);
      throw error;
    }
  }

  /**
   * Check if user has a specific chapter role
   * @param {string} userId - User ID
   * @param {number} chapterId - Chapter ID
   * @param {string} role - Role to check
   */
  static async userHasChapterRole(userId, chapterId, role) {
    try {
      const userRole = await db('user_chapter_roles')
        .where({ user_id: userId, chapter_id: chapterId, role })
        .first();

      return !!userRole;
    } catch (error) {
      console.error('Error checking chapter role:', error);
      return false;
    }
  }

  /**
   * Get user's effective permissions including chapter-specific roles
   * @param {string} userId - User ID
   * @param {number} chapterId - Optional chapter ID for chapter-specific permissions
   */
  static async getUserEffectivePermissions(userId, chapterId = null) {
    try {
      // Get base role permissions
      const user = await db('users').where('id', userId).first();
      if (!user) return [];

      const rolePermissions = await db('role_permissions')
        .join('user_permissions', 'role_permissions.permission_id', 'user_permissions.id')
        .where('role_permissions.role', user.role)
        .select('user_permissions.permission_key');

      let permissions = rolePermissions.map(rp => rp.permission_key);

      // Add chapter-specific permissions if chapterId provided
      if (chapterId) {
        const chapterRoles = await db('user_chapter_roles')
          .where({ user_id: userId, chapter_id: chapterId })
          .select('permissions');

        chapterRoles.forEach(role => {
          const rolePermissions = typeof role.permissions === 'string'
            ? JSON.parse(role.permissions)
            : role.permissions;

          // Add any additional permissions from chapter role
          if (rolePermissions.additional) {
            permissions = [...permissions, ...rolePermissions.additional];
          }
        });
      }

      return [...new Set(permissions)]; // Remove duplicates
    } catch (error) {
      console.error('Error getting effective permissions:', error);
      return [];
    }
  }

  /**
   * Get all regional coordinators
   */
  static async getRegionalCoordinators() {
    try {
      const coordinators = await db('user_chapter_roles')
        .join('users', 'user_chapter_roles.user_id', 'users.id')
        .join('chapters', 'user_chapter_roles.chapter_id', 'chapters.id')
        .where('user_chapter_roles.role', 'regional_coordinator')
        .select(
          'user_chapter_roles.*',
          'users.first_name',
          'users.last_name',
          'users.email',
          'chapters.name as chapter_name',
          'chapters.location as chapter_location',
          'chapters.country'
        );

      return coordinators.map(coord => ({
        ...coord,
        permissions: typeof coord.permissions === 'string'
          ? JSON.parse(coord.permissions)
          : coord.permissions
      }));
    } catch (error) {
      console.error('Error getting regional coordinators:', error);
      throw error;
    }
  }
}

module.exports = ChapterRoleService;
