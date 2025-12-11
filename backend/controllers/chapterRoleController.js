/**
 * Chapter Role Controller - API endpoints for chapter-specific role management
 * Supports FR7 multi-city chapter system with regional roles
 */

const ChapterRoleService = require('../services/chapterRoleService');
const { validationResult } = require('express-validator');

class ChapterRoleController {
  /**
   * Assign a chapter-specific role to a user
   * POST /api/admin/chapter-roles/assign
   */
  static async assignChapterRole(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { userId, chapterId, role, permissions } = req.body;
      const assignedBy = req.user.id;

      const roleId = await ChapterRoleService.assignChapterRole(
        userId,
        chapterId,
        role,
        assignedBy,
        permissions || {}
      );

      res.json({
        success: true,
        message: 'Chapter role assigned successfully',
        data: { roleId }
      });
    } catch (error) {
      console.error('Error assigning chapter role:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to assign chapter role'
      });
    }
  }

  /**
   * Remove a chapter-specific role from a user
   * DELETE /api/admin/chapter-roles/remove
   */
  static async removeChapterRole(req, res) {
    try {
      const { userId, chapterId, role } = req.body;

      await ChapterRoleService.removeChapterRole(userId, chapterId, role);

      res.json({
        success: true,
        message: 'Chapter role removed successfully'
      });
    } catch (error) {
      console.error('Error removing chapter role:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to remove chapter role'
      });
    }
  }

  /**
   * Get all chapter-specific roles for a user
   * GET /api/chapter-roles/user/:userId
   */
  static async getUserChapterRoles(req, res) {
    try {
      const { userId } = req.params;

      const roles = await ChapterRoleService.getUserChapterRoles(userId);

      res.json({
        success: true,
        data: { roles }
      });
    } catch (error) {
      console.error('Error getting user chapter roles:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get user chapter roles'
      });
    }
  }

  /**
   * Get all users with chapter-specific roles for a chapter
   * GET /api/chapter-roles/chapter/:chapterId
   */
  static async getChapterRoleUsers(req, res) {
    try {
      const { chapterId } = req.params;

      const users = await ChapterRoleService.getChapterRoleUsers(parseInt(chapterId));

      res.json({
        success: true,
        data: { users }
      });
    } catch (error) {
      console.error('Error getting chapter role users:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get chapter role users'
      });
    }
  }

  /**
   * Get all regional coordinators
   * GET /api/admin/chapter-roles/regional-coordinators
   */
  static async getRegionalCoordinators(req, res) {
    try {
      const coordinators = await ChapterRoleService.getRegionalCoordinators();

      res.json({
        success: true,
        data: { coordinators }
      });
    } catch (error) {
      console.error('Error getting regional coordinators:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get regional coordinators'
      });
    }
  }

  /**
   * Get all chapter admins for a region
   * GET /api/admin/chapter-roles/regional-admins/:region
   */
  static async getRegionalAdmins(req, res) {
    try {
      const { region } = req.params;

      const admins = await ChapterRoleService.getRegionalAdmins(region);

      res.json({
        success: true,
        data: { admins }
      });
    } catch (error) {
      console.error('Error getting regional admins:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get regional admins'
      });
    }
  }

  /**
   * Check if user has a specific chapter role
   * GET /api/chapter-roles/check/:userId/:chapterId/:role
   */
  static async checkChapterRole(req, res) {
    try {
      const { userId, chapterId, role } = req.params;

      const hasRole = await ChapterRoleService.userHasChapterRole(
        userId,
        parseInt(chapterId),
        role
      );

      res.json({
        success: true,
        data: { hasRole }
      });
    } catch (error) {
      console.error('Error checking chapter role:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to check chapter role'
      });
    }
  }

  /**
   * Get user's effective permissions including chapter-specific roles
   * GET /api/chapter-roles/permissions/:userId
   */
  static async getUserEffectivePermissions(req, res) {
    try {
      const { userId } = req.params;
      const { chapterId } = req.query;

      const permissions = await ChapterRoleService.getUserEffectivePermissions(
        userId,
        chapterId ? parseInt(chapterId) : null
      );

      res.json({
        success: true,
        data: { permissions }
      });
    } catch (error) {
      console.error('Error getting effective permissions:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get effective permissions'
      });
    }
  }

  /**
   * Get all chapter role assignments
   * GET /api/admin/chapter-roles/all
   */
  static async getAllChapterRoles(req, res) {
    try {
      const roles = await ChapterRoleService.getAllChapterRoles();

      res.json({
        success: true,
        data: { roles }
      });
    } catch (error) {
      console.error('Error getting all chapter roles:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get all chapter roles'
      });
    }
  }
}

module.exports = ChapterRoleController;
