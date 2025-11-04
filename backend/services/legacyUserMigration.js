const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { auth } = require('../lib/auth');

/**
 * Legacy User Migration Service
 * 
 * Handles transparent migration of users from the legacy JWT-based authentication
 * system to Better Auth. This service allows existing users to continue logging in
 * with their credentials while seamlessly migrating them to the new system.
 */
class LegacyUserMigration {
  /**
   * Check if a user exists in the legacy system
   * @param {string} email - User's email address
   * @returns {Promise<Object|null>} Legacy user object or null if not found
   */
  async isLegacyUser(email) {
    try {
      const legacyUser = await db('users')
        .where({ email: email.toLowerCase() })
        .first();

      return legacyUser || null;
    } catch (error) {
      console.error('Error checking legacy user:', error);
      throw new Error('Failed to check legacy user status');
    }
  }

  /**
   * Verify password against legacy bcrypt hash
   * @param {string} password - Plain text password
   * @param {string} passwordHash - Legacy bcrypt hash
   * @returns {Promise<boolean>} True if password matches
   */
  async verifyLegacyPassword(password, passwordHash) {
    try {
      if (!passwordHash) {
        return false;
      }
      
      const isValid = await bcrypt.compare(password, passwordHash);
      return isValid;
    } catch (error) {
      console.error('Error verifying legacy password:', error);
      return false;
    }
  }

  /**
   * Check if user has already been migrated to Better Auth
   * @param {string} email - User's email address
   * @returns {Promise<boolean>} True if user exists in Better Auth
   */
  async isMigrated(email) {
    try {
      const betterAuthUser = await db('user')
        .where({ email: email.toLowerCase() })
        .first();

      return !!betterAuthUser;
    } catch (error) {
      console.error('Error checking migration status:', error);
      return false;
    }
  }

  /**
   * Create Better Auth user from legacy user data
   * @param {Object} legacyUser - Legacy user object from database
   * @param {string} password - Plain text password for Better Auth to hash
   * @returns {Promise<Object>} Result object with success status
   */
  async createBetterAuthUser(legacyUser, password) {
    try {
      // Check if user already exists in Better Auth
      const alreadyMigrated = await this.isMigrated(legacyUser.email);
      
      if (alreadyMigrated) {
        return {
          success: true,
          alreadyMigrated: true,
          message: 'User already migrated to Better Auth'
        };
      }

      // Create user in Better Auth system using the API
      // Better Auth will handle password hashing
      const result = await auth.api.signUpEmail({
        body: {
          email: legacyUser.email,
          password: password,
          name: `${legacyUser.first_name} ${legacyUser.last_name}`,
          // Custom fields matching our schema
          role: legacyUser.role || 'student',
          chapter_id: legacyUser.chapter_id,
          first_name: legacyUser.first_name,
          last_name: legacyUser.last_name,
          profile_picture: legacyUser.profile_picture || null,
          is_active: legacyUser.is_active !== false,
        },
      });

      if (!result) {
        throw new Error('Failed to create Better Auth user');
      }

      return {
        success: true,
        migrated: true,
        message: 'User successfully migrated to Better Auth'
      };
    } catch (error) {
      console.error('Error creating Better Auth user:', error);
      return {
        success: false,
        error: error.message || 'Failed to create Better Auth user'
      };
    }
  }

  /**
   * Mark legacy user as migrated in the database
   * @param {number} userId - Legacy user ID
   * @returns {Promise<boolean>} True if successfully marked
   */
  async markAsMigrated(userId) {
    try {
      await db('users')
        .where({ id: userId })
        .update({
          migrated_to_better_auth: true,
          updated_at: new Date()
        });

      return true;
    } catch (error) {
      console.error('Error marking user as migrated:', error);
      return false;
    }
  }

  /**
   * Complete migration process for a legacy user
   * This is the main method that orchestrates the entire migration
   * 
   * @param {string} email - User's email address
   * @param {string} password - User's plain text password
   * @returns {Promise<Object>} Migration result with user data and session
   */
  async migrateUserOnLogin(email, password) {
    try {
      // Step 1: Check if user exists in legacy system
      const legacyUser = await this.isLegacyUser(email);
      
      if (!legacyUser) {
        return {
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        };
      }

      // Step 2: Verify password with legacy hash
      const isValidPassword = await this.verifyLegacyPassword(
        password,
        legacyUser.password_hash
      );

      if (!isValidPassword) {
        return {
          success: false,
          error: 'Invalid password',
          code: 'INVALID_PASSWORD'
        };
      }

      // Step 3: Check if user is active
      if (!legacyUser.is_active) {
        return {
          success: false,
          error: 'Account is deactivated',
          code: 'ACCOUNT_DISABLED'
        };
      }

      // Step 4: Check if already migrated
      const alreadyMigrated = await this.isMigrated(email);
      
      if (alreadyMigrated) {
        // User already migrated, just authenticate with Better Auth
        return {
          success: true,
          alreadyMigrated: true,
          message: 'User already migrated, use Better Auth login'
        };
      }

      // Step 5: Create Better Auth user
      const migrationResult = await this.createBetterAuthUser(legacyUser, password);
      
      if (!migrationResult.success) {
        return {
          success: false,
          error: migrationResult.error || 'Migration failed',
          code: 'MIGRATION_FAILED'
        };
      }

      // Step 6: Mark legacy user as migrated
      await this.markAsMigrated(legacyUser.id);

      // Step 7: Update last login timestamp
      await db('users')
        .where({ id: legacyUser.id })
        .update({ last_login_at: new Date() });

      return {
        success: true,
        migrated: true,
        message: 'User successfully migrated to Better Auth',
        user: {
          id: legacyUser.id,
          email: legacyUser.email,
          firstName: legacyUser.first_name,
          lastName: legacyUser.last_name,
          role: legacyUser.role,
          chapter: legacyUser.chapter_id,
          isActive: legacyUser.is_active
        }
      };
    } catch (error) {
      console.error('Migration error:', error);
      return {
        success: false,
        error: error.message || 'An unexpected error occurred during migration',
        code: 'MIGRATION_ERROR'
      };
    }
  }
}

// Export singleton instance
module.exports = new LegacyUserMigration();
