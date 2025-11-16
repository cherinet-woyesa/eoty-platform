const { Badge, UserBadge, Leaderboard } = require('../models/Forum');
const db = require('../config/database');
const achievementService = require('../services/achievementService');

const achievementController = {
  // Get user badges (REQUIREMENT: Badges linked to user profiles)
  async getUserBadges(req, res) {
    try {
      const userId = req.user.userId;
      
      const badges = await UserBadge.getUserBadges(userId);
      const totalPoints = await UserBadge.getUserPoints(userId);

      // REQUIREMENT: Youth privacy is strictly enforced
      const youthPrivacyService = require('../services/youthPrivacyService');
      const isYouth = await youthPrivacyService.isYouthUser(userId);

      res.json({
        success: true,
        data: {
          badges,
          total_points: totalPoints,
          is_youth: isYouth, // Internal flag for privacy enforcement
          privacy_enforced: isYouth // REQUIREMENT: Youth privacy is strictly enforced
        }
      });
    } catch (error) {
      console.error('Get user badges error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch badges'
      });
    }
  },

  // Get all available badges
  async getAvailableBadges(req, res) {
    try {
      const badges = await Badge.findAllActive();

      res.json({
        success: true,
        data: { badges }
      });
    } catch (error) {
      console.error('Get badges error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch badges'
      });
    }
  },

  // Check badge eligibility
  async checkEligibility(req, res) {
    try {
      const { badgeId } = req.params;
      const userId = req.user.userId;

      const eligible = await Badge.checkEligibility(userId, badgeId);
      const badge = await Badge.findById(badgeId);

      res.json({
        success: true,
        data: {
          eligible,
          badge,
          progress: await achievementService.getBadgeProgress(userId, badgeId)
        }
      });
    } catch (error) {
      console.error('Check eligibility error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check eligibility'
      });
    }
  },

  // Get leaderboard (REQUIREMENT: Per-chapter/global rankings, anonymity opts)
  async getLeaderboard(req, res) {
    try {
      const { type = 'chapter', period = 'current', includeAnonymous = 'false' } = req.query;
      const userId = req.user.userId;
      
      const user = await db('users').where({ id: userId }).select('chapter_id').first();
      
      let leaderboard;
      let periodDate = null;

      // Handle time-based leaderboards
      if (period === 'weekly') {
        periodDate = new Date();
        periodDate.setDate(periodDate.getDate() - 7);
      } else if (period === 'monthly') {
        periodDate = new Date();
        periodDate.setMonth(periodDate.getMonth() - 1);
      }

      if (type === 'global') {
        leaderboard = await Leaderboard.getGlobalLeaderboard(100, includeAnonymous === 'true');
      } else {
        // REQUIREMENT: Anonymity opts - respect user preference
        leaderboard = await Leaderboard.getLeaderboard(
          user.chapter_id, 
          type, 
          periodDate, 
          100,
          includeAnonymous === 'true' // Include anonymous if requested
        );
      }

      // REQUIREMENT: Limits leaderboard to non-sensitive profile info
      let sanitizedLeaderboard = leaderboard.map(entry => ({
        rank: entry.rank,
        points: entry.points,
        user_id: entry.is_anonymous ? null : entry.user_id, // Hide user ID if anonymous
        first_name: entry.is_anonymous ? 'Anonymous' : entry.first_name,
        last_name: entry.is_anonymous ? '' : entry.last_name,
        chapter_id: entry.chapter_id,
        is_anonymous: entry.is_anonymous
      }));

      // REQUIREMENT: Youth privacy is strictly enforced
      const youthPrivacyService = require('../services/youthPrivacyService');
      sanitizedLeaderboard = await youthPrivacyService.enforceYouthPrivacyOnLeaderboard(
        sanitizedLeaderboard,
        userId
      );

      // Add user's current rank
      const userRank = leaderboard.findIndex(entry => entry.user_id === userId) + 1;

      res.json({
        success: true,
        data: {
          leaderboard: sanitizedLeaderboard,
          user_rank: userRank > 0 ? userRank : null,
          leaderboard_type: type,
          period: period,
          total_entries: sanitizedLeaderboard.length
        }
      });
    } catch (error) {
      console.error('Get leaderboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch leaderboard'
      });
    }
  },

  // Update user anonymity preference (REQUIREMENT: Anonymity opts)
  async updateAnonymity(req, res) {
    try {
      const { isAnonymous } = req.body;
      const userId = req.user.userId;
      
      const user = await db('users').where({ id: userId }).select('chapter_id').first();

      // Update user preference
      await db('users')
        .where({ id: userId })
        .update({ is_anonymous: isAnonymous });

      // Update all leaderboard entries for this user (REQUIREMENT: Anonymity opts)
      await db('leaderboard_entries')
        .where({ user_id: userId })
        .update({ is_anonymous: isAnonymous });

      res.json({
        success: true,
        message: `Anonymity ${isAnonymous ? 'enabled' : 'disabled'} successfully`,
        data: {
          is_anonymous: isAnonymous,
          privacy_note: 'Your name will be hidden from leaderboards when anonymous'
        }
      });
    } catch (error) {
      console.error('Update anonymity error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update anonymity preference'
      });
    }
  }
};

module.exports = achievementController;