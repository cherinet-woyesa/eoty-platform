const db = require('../config/database');

class PrivacyService {
  // Initialize privacy settings for new user
  async initializeUserPrivacy(userId) {
    try {
      // Check if user already has privacy settings
      const existing = await db('user_privacy_settings').where({ user_id: userId }).first();

      if (!existing) {
        // Get user details to determine default privacy settings
        const user = await db('users').where({ id: userId }).select('role').first();

        // Youth privacy defaults (COPPA compliance) - simplified since age column doesn't exist
        const isMinor = user?.role === 'youth';

        await db('user_privacy_settings').insert({
          user_id: userId,
          show_in_leaderboards: !isMinor, // Minors opt-out by default
          show_real_name: false, // Never show real names for youth
          allow_public_profile: !isMinor,
          hide_age_info: true, // Always hide age for privacy
          restrict_location_sharing: true // Restrict location sharing
        });
      }
    } catch (error) {
      console.error('Privacy initialization error:', error);
    }
  }

  // Get sanitized user data for leaderboards
  async getLeaderboardUserData(userId) {
    try {
      const privacySettings = await db('user_privacy_settings')
        .where({ user_id: userId })
        .first();

      if (!privacySettings?.show_in_leaderboards) {
        return null; // User opted out of leaderboards
      }

      const user = await db('users')
        .where({ id: userId })
        .select('first_name', 'last_name', 'profile_picture', 'role', 'chapter_id')
        .first();

      if (!user) return null;

      // Sanitize data based on privacy settings
      const sanitizedData = {
        user_id: userId,
        display_name: privacySettings.show_real_name
          ? `${user.first_name} ${user.last_name}`
          : `User ${userId.slice(-4)}`, // Anonymous identifier
        avatar: privacySettings.allow_public_profile ? user.profile_picture : null,
        role: user.role,
        chapter_id: user.chapter_id
      };

      return sanitizedData;
    } catch (error) {
      console.error('Leaderboard user data error:', error);
      return null;
    }
  }

  // Filter leaderboard data based on privacy settings
  async filterLeaderboardData(leaderboardData) {
    try {
      const filteredData = [];

      for (const entry of leaderboardData) {
        const sanitizedUser = await this.getLeaderboardUserData(entry.user_id);
        if (sanitizedUser) {
          filteredData.push({
            ...entry,
            user: sanitizedUser
          });
        }
      }

      return filteredData;
    } catch (error) {
      console.error('Leaderboard filtering error:', error);
      return [];
    }
  }

  // Check if user can view private profile data
  async canViewPrivateData(viewerId, targetUserId) {
    try {
      // Users can always view their own data
      if (viewerId === targetUserId) {
        return true;
      }

      // Check relationship (same chapter, etc.)
      const [viewer, target] = await Promise.all([
        db('users').where({ id: viewerId }).select('role', 'chapter_id').first(),
        db('users').where({ id: targetUserId }).select('role', 'chapter_id').first()
      ]);

      if (!viewer || !target) return false;

      // Moderators and admins can view more data
      if (['moderator', 'admin'].includes(viewer.role)) {
        return true;
      }

      // Same chapter members can view limited private data
      if (viewer.chapter_id === target.chapter_id) {
        return true;
      }

      // Check privacy settings
      const privacySettings = await db('user_privacy_settings')
        .where({ user_id: targetUserId })
        .first();

      return privacySettings?.allow_public_profile || false;
    } catch (error) {
      console.error('Private data access check error:', error);
      return false;
    }
  }

  // Update user privacy settings
  async updatePrivacySettings(userId, settings) {
    try {
      await db('user_privacy_settings')
        .where({ user_id: userId })
        .update({
          show_in_leaderboards: settings.showInLeaderboards ?? true,
          show_real_name: settings.showRealName ?? false,
          allow_public_profile: settings.allowPublicProfile ?? true,
          hide_age_info: settings.hideAgeInfo ?? true,
          restrict_location_sharing: settings.restrictLocationSharing ?? true,
          updated_at: new Date()
        });

      return { success: true };
    } catch (error) {
      console.error('Privacy settings update error:', error);
      return { success: false, error: error.message };
    }
  }

  // COPPA compliance check
  async isYouthProtected(userId) {
    try {
      const user = await db('users').where({ id: userId }).select('role').first();

      // Youth protection applies to users with youth role (age check removed since column doesn't exist)
      return user?.role === 'youth';
    } catch (error) {
      console.error('Youth protection check error:', error);
      return true; // Default to protected if check fails
    }
  }

  // Anonymize sensitive data for analytics/reports
  anonymizeData(data) {
    // Remove or hash sensitive identifiers
    const anonymized = { ...data };

    // Remove personal identifiers
    delete anonymized.email;
    delete anonymized.phone;
    delete anonymized.address;

    // Hash user IDs for aggregation while maintaining uniqueness
    if (anonymized.user_id) {
      anonymized.user_id = require('crypto')
        .createHash('sha256')
        .update(anonymized.user_id)
        .digest('hex');
    }

    // Remove exact ages, use age groups instead
    if (anonymized.age) {
      if (anonymized.age < 13) anonymized.age_group = 'under_13';
      else if (anonymized.age < 18) anonymized.age_group = '13_17';
      else if (anonymized.age < 25) anonymized.age_group = '18_24';
      else if (anonymized.age < 35) anonymized.age_group = '25_34';
      else anonymized.age_group = '35_plus';
      delete anonymized.age;
    }

    return anonymized;
  }
}

module.exports = new PrivacyService();
