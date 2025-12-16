const db = require('../config/database');

/**
 * Achievements Controller
 * Handles badge awarding, retrieval, and management
 */

exports.getUserBadges = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Get user's earned badges with badge details
    const userBadges = await db('user_badges as ub')
      .join('badges as b', 'ub.badge_id', 'b.id')
      .where('ub.user_id', userId)
      .where('b.is_active', true)
      .select(
        'ub.id',
        'ub.earned_at',
        'ub.metadata',
        'b.id as badge_id',
        'b.name',
        'b.description',
        'b.icon_url',
        'b.badge_type',
        'b.category',
        'b.points',
        'b.rarity',
        'b.icon_color',
        'b.is_featured'
      )
      .orderBy('ub.earned_at', 'desc');

    // Calculate total points
    const totalPoints = userBadges.reduce((sum, badge) => sum + (badge.points || 0), 0);

    // Group badges by category
    const badgesByCategory = userBadges.reduce((acc, badge) => {
      const category = badge.category || 'general';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(badge);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        badges: userBadges,
        badgesByCategory,
        total_points: totalPoints,
        total_badges: userBadges.length
      }
    });
  } catch (error) {
    console.error('Get user badges error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user badges'
    });
  }
};

exports.getAvailableBadges = async (req, res) => {
  try {
    const badges = await db('badges')
      .where('is_active', true)
      .select(
        'id',
        'name',
        'description',
        'icon_url',
        'badge_type',
        'category',
        'points',
        'requirements',
        'rarity',
        'icon_color',
        'is_featured'
      )
      .orderBy('points', 'asc');

    res.json({
      success: true,
      data: {
        badges
      }
    });
  } catch (error) {
    console.error('Get available badges error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available badges'
    });
  }
};

exports.getFeaturedBadges = async (req, res) => {
  try {
    const badges = await db('badges')
      .where('is_active', true)
      .where('is_featured', true)
      .select(
        'id',
        'name',
        'description',
        'icon_url',
        'badge_type',
        'category',
        'points',
        'requirements',
        'rarity',
        'icon_color'
      )
      .orderBy('points', 'asc')
      .limit(10);

    res.json({
      success: true,
      data: {
        badges
      }
    });
  } catch (error) {
    console.error('Get featured badges error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured badges'
    });
  }
};

exports.awardBadge = async (req, res) => {
  try {
    const { userId, badgeId } = req.body;
    const awardedBy = req.user?.userId;

    if (!userId || !badgeId) {
      return res.status(400).json({
        success: false,
        message: 'User ID and Badge ID are required'
      });
    }

    // Check if user already has this badge
    const existingBadge = await db('user_badges')
      .where({ user_id: userId, badge_id: badgeId })
      .first();

    if (existingBadge) {
      return res.status(409).json({
        success: false,
        message: 'User already has this badge'
      });
    }

    // Verify badge exists and is active
    const badge = await db('badges')
      .where({ id: badgeId, is_active: true })
      .first();

    if (!badge) {
      return res.status(404).json({
        success: false,
        message: 'Badge not found or inactive'
      });
    }

    // Check permissions - only teachers/admins can manually award badges
    if (badge.is_manual && req.user?.role !== 'teacher' && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to award this badge'
      });
    }

    // Award the badge
    const insertResult = await db('user_badges').insert({
      user_id: userId,
      badge_id: badgeId,
      metadata: {
        awarded_by: awardedBy,
        award_method: badge.is_manual ? 'manual' : 'automatic'
      }
    });

    const userBadgeId = Array.isArray(insertResult) ? insertResult[0] : insertResult;

    // Get the awarded badge with details
    const awardedBadge = await db('user_badges as ub')
      .join('badges as b', 'ub.badge_id', 'b.id')
      .where('ub.id', userBadgeId)
      .select(
        'ub.id',
        'ub.earned_at',
        'ub.metadata',
        'b.id as badge_id',
        'b.name',
        'b.description',
        'b.icon_url',
        'b.badge_type',
        'b.category',
        'b.points',
        'b.rarity',
        'b.icon_color',
        'b.is_featured'
      )
      .first();

    // Queue real-time update
    await db('realtime_update_queue').insert({
      update_type: 'badge',
      user_id: userId,
      update_data: { badge: awardedBadge },
      status: 'pending'
    });

    res.json({
      success: true,
      message: 'Badge awarded successfully',
      data: {
        userBadge: awardedBadge
      }
    });
  } catch (error) {
    console.error('Award badge error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to award badge'
    });
  }
};

exports.checkBadgeEligibility = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { badgeId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Check if user already has this badge
    const existingBadge = await db('user_badges')
      .where({ user_id: userId, badge_id: badgeId })
      .first();

    const isEligible = !existingBadge;

    res.json({
      success: true,
      data: {
        is_eligible: isEligible,
        already_has_badge: !!existingBadge
      }
    });
  } catch (error) {
    console.error('Check badge eligibility error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check badge eligibility'
    });
  }
};

exports.getBadgeStats = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Get badge statistics for the user
    const stats = await db('user_badges as ub')
      .join('badges as b', 'ub.badge_id', 'b.id')
      .where('ub.user_id', userId)
      .select(
        db.raw('COUNT(*) as total_badges'),
        db.raw('SUM(b.points) as total_points'),
        db.raw('COUNT(DISTINCT b.category) as categories_unlocked'),
        db.raw('MAX(ub.earned_at) as last_badge_date')
      )
      .first();

    // Get badges by rarity
    const badgesByRarity = await db('user_badges as ub')
      .join('badges as b', 'ub.badge_id', 'b.id')
      .where('ub.user_id', userId)
      .select('b.rarity')
      .count('b.id as count')
      .groupBy('b.rarity');

    res.json({
      success: true,
      data: {
        stats: {
          total_badges: parseInt(stats.total_badges) || 0,
          total_points: parseInt(stats.total_points) || 0,
          categories_unlocked: parseInt(stats.categories_unlocked) || 0,
          last_badge_date: stats.last_badge_date
        },
        badges_by_rarity: badgesByRarity.reduce((acc, item) => {
          acc[item.rarity || 'common'] = parseInt(item.count);
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Get badge stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch badge statistics'
    });
  }
};
