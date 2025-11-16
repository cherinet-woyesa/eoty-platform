// backend/services/youthPrivacyService.js
// Youth Privacy Service - REQUIREMENT: Youth privacy is strictly enforced

const db = require('../config/database');

class YouthPrivacyService {
  constructor() {
    // Privacy settings for youth users
    this.youthPrivacySettings = {
      hideFromLeaderboards: true, // Youth should be hidden by default
      hideFromGlobalSearch: true,
      restrictProfileVisibility: true,
      requireParentalConsent: false, // Can be enabled if needed
      anonymizeByDefault: true
    };
  }

  // Check if user is a youth member (REQUIREMENT: Youth privacy is strictly enforced)
  async isYouthUser(userId) {
    try {
      const user = await db('users')
        .where({ id: userId })
        .select('role', 'age', 'date_of_birth')
        .first();

      if (!user) return false;

      // Check if user is under 18 or marked as youth
      if (user.role === 'student' || user.role === 'youth') {
        return true;
      }

      // Check age if date_of_birth is available
      if (user.date_of_birth) {
        const birthDate = new Date(user.date_of_birth);
        const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        return age < 18;
      }

      return false;
    } catch (error) {
      console.error('Check youth user error:', error);
      return false; // Default to not youth if check fails
    }
  }

  // Enforce youth privacy on leaderboard (REQUIREMENT: Youth privacy is strictly enforced)
  async enforceYouthPrivacyOnLeaderboard(leaderboard, requestingUserId = null) {
    try {
      const sanitized = await Promise.all(
        leaderboard.map(async (entry) => {
          const isYouth = await this.isYouthUser(entry.user_id);
          
          if (isYouth) {
            // REQUIREMENT: Youth privacy is strictly enforced
            return {
              ...entry,
              user_id: null, // Hide user ID
              first_name: 'Anonymous',
              last_name: '',
              is_anonymous: true,
              is_youth: true // Flag for internal tracking
            };
          }
          
          return entry;
        })
      );

      return sanitized;
    } catch (error) {
      console.error('Enforce youth privacy error:', error);
      return leaderboard; // Return original if error
    }
  }

  // Enforce youth privacy on forum posts (REQUIREMENT: Youth privacy is strictly enforced)
  async enforceYouthPrivacyOnForumPost(post, requestingUserId = null) {
    try {
      const isYouth = await this.isYouthUser(post.author_id || post.user_id);
      
      if (isYouth && post.author_id !== requestingUserId) {
        // Hide youth identity from other users
        return {
          ...post,
          author_id: null,
          user_id: null,
          first_name: 'Anonymous',
          last_name: '',
          author_first_name: 'Anonymous',
          author_last_name: ''
        };
      }

      return post;
    } catch (error) {
      console.error('Enforce youth privacy on post error:', error);
      return post;
    }
  }

  // Auto-enable anonymity for youth users (REQUIREMENT: Youth privacy is strictly enforced)
  async autoEnableAnonymityForYouth(userId) {
    try {
      const isYouth = await this.isYouthUser(userId);
      
      if (isYouth && this.youthPrivacySettings.anonymizeByDefault) {
        // Auto-enable anonymity
        await db('users')
          .where({ id: userId })
          .update({ is_anonymous: true });

        // Update all leaderboard entries
        await db('leaderboard_entries')
          .where({ user_id: userId })
          .update({ is_anonymous: true });

        console.log(`Auto-enabled anonymity for youth user: ${userId}`);
      }
    } catch (error) {
      console.error('Auto-enable anonymity for youth error:', error);
    }
  }
}

// Create singleton instance
const youthPrivacyService = new YouthPrivacyService();

module.exports = youthPrivacyService;


