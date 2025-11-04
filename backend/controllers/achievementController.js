const { Badge, UserBadge, Leaderboard } = require('../models/Forum');
const db = require('../config/database');
const achievementService = require('../services/achievementService');

const achievementController = {
  // Get user badges
  async getUserBadges(req, res) {
    try {
      const userId = req.user.id;
      
      const badges = await UserBadge.getUserBadges(userId);
      const totalPoints = await UserBadge.getUserPoints(userId);

      res.json({
        success: true,
        data: {
          badges,
          total_points: totalPoints
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
      const userId = req.user.id;

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

  // Get leaderboard
  async getLeaderboard(req, res) {
    try {
      const { type = 'chapter', period = 'current' } = req.query;
      const userId = req.user.id;
      
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
        leaderboard = await Leaderboard.getGlobalLeaderboard(100);
      } else {
        leaderboard = await Leaderboard.getLeaderboard(
          user.chapter_id, 
          type, 
          periodDate, 
          100,
          false // Exclude anonymous for privacy
        );
      }

      // Add user's current rank
      const userRank = leaderboard.findIndex(entry => entry.user_id === userId) + 1;

      res.json({
        success: true,
        data: {
          leaderboard,
          user_rank: userRank > 0 ? userRank : null,
          leaderboard_type: type,
          period: period
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

  // Update user anonymity preference
  async updateAnonymity(req, res) {
    try {
      const { isAnonymous } = req.body;
      const userId = req.user.id;
      
      const user = await db('users').where({ id: userId }).select('chapter_id').first();

      // Update all leaderboard entries for this user
      await db('leaderboard_entries')
        .where({ user_id: userId, chapter_id: user.chapter_id })
        .update({ is_anonymous: isAnonymous });

      res.json({
        success: true,
        message: `Anonymity ${isAnonymous ? 'enabled' : 'disabled'} successfully`
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