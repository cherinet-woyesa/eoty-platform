/**
 * Seed achievement badges for the platform
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if badges already exist
  const existingBadges = await knex('badges').count('id as count').first();
  if (parseInt(existingBadges.count) > 0) {
    console.log('Badges already seeded, skipping...');
    return;
  }

  const badges = [
    // Teaching Badges
    {
      name: 'First Lesson',
      description: 'Created your first lesson',
      icon_url: '/badges/first-lesson.svg',
      badge_type: 'teaching',
      category: 'teaching',
      points: 10,
      requirements: { lessons_created: 1 },
      rarity: 'common',
      icon_color: '#27AE60',
      is_featured: true
    },
    {
      name: 'Course Creator',
      description: 'Created your first course',
      icon_url: '/badges/course-creator.svg',
      badge_type: 'teaching',
      category: 'teaching',
      points: 25,
      requirements: { courses_created: 1 },
      rarity: 'common',
      icon_color: '#27AE60',
      is_featured: true
    },
    {
      name: 'Dedicated Teacher',
      description: 'Created 10 lessons',
      icon_url: '/badges/dedicated-teacher.svg',
      badge_type: 'teaching',
      category: 'teaching',
      points: 50,
      requirements: { lessons_created: 10 },
      rarity: 'uncommon',
      icon_color: '#16A085',
      is_featured: true
    },
    {
      name: 'Master Educator',
      description: 'Created 50 lessons',
      icon_url: '/badges/master-educator.svg',
      badge_type: 'teaching',
      category: 'teaching',
      points: 200,
      requirements: { lessons_created: 50 },
      rarity: 'rare',
      icon_color: '#E67E22',
      is_featured: true
    },

    // Engagement Badges
    {
      name: 'Welcome Aboard',
      description: 'Joined the platform',
      icon_url: '/badges/welcome.svg',
      badge_type: 'engagement',
      category: 'engagement',
      points: 5,
      requirements: { account_created: true },
      rarity: 'common',
      icon_color: '#2980B9',
      is_featured: false
    },
    {
      name: 'Active Learner',
      description: 'Completed 5 lessons',
      icon_url: '/badges/active-learner.svg',
      badge_type: 'completion',
      category: 'engagement',
      points: 15,
      requirements: { lessons_completed: 5 },
      rarity: 'common',
      icon_color: '#2980B9',
      is_featured: false
    },
    {
      name: 'Knowledge Seeker',
      description: 'Completed 25 lessons',
      icon_url: '/badges/knowledge-seeker.svg',
      badge_type: 'completion',
      category: 'engagement',
      points: 75,
      requirements: { lessons_completed: 25 },
      rarity: 'uncommon',
      icon_color: '#16A085',
      is_featured: true
    },
    {
      name: 'Wisdom Achiever',
      description: 'Completed 100 lessons',
      icon_url: '/badges/wisdom-achiever.svg',
      badge_type: 'completion',
      category: 'engagement',
      points: 300,
      requirements: { lessons_completed: 100 },
      rarity: 'epic',
      icon_color: '#8E44AD',
      is_featured: true
    },

    // Content Creation Badges
    {
      name: 'Video Pioneer',
      description: 'Uploaded your first video',
      icon_url: '/badges/video-pioneer.svg',
      badge_type: 'content',
      category: 'content',
      points: 20,
      requirements: { videos_uploaded: 1 },
      rarity: 'common',
      icon_color: '#F39C12',
      is_featured: false
    },
    {
      name: 'Content Creator',
      description: 'Uploaded 10 videos',
      icon_url: '/badges/content-creator.svg',
      badge_type: 'content',
      category: 'content',
      points: 100,
      requirements: { videos_uploaded: 10 },
      rarity: 'uncommon',
      icon_color: '#F39C12',
      is_featured: true
    },

    // Leadership Badges (Manual)
    {
      name: 'Community Helper',
      description: 'Awarded for helping community members',
      icon_url: '/badges/community-helper.svg',
      badge_type: 'leadership',
      category: 'leadership',
      points: 50,
      requirements: { manual_award: true },
      rarity: 'uncommon',
      icon_color: '#E67E22',
      is_manual: true,
      is_featured: false
    },
    {
      name: 'Spiritual Guide',
      description: 'Recognized for spiritual leadership',
      icon_url: '/badges/spiritual-guide.svg',
      badge_type: 'leadership',
      category: 'leadership',
      points: 150,
      requirements: { manual_award: true },
      rarity: 'rare',
      icon_color: '#9B59B6',
      is_manual: true,
      is_featured: true
    },

    // Special Badges
    {
      name: 'Beta Tester',
      description: 'Helped test the platform during beta',
      icon_url: '/badges/beta-tester.svg',
      badge_type: 'special',
      category: 'special',
      points: 25,
      requirements: { beta_participant: true },
      rarity: 'uncommon',
      icon_color: '#34495E',
      is_featured: false
    },
    {
      name: 'Platform Pioneer',
      description: 'One of the first 100 users',
      icon_url: '/badges/pioneer.svg',
      badge_type: 'special',
      category: 'special',
      points: 100,
      requirements: { early_adopter: true },
      rarity: 'rare',
      icon_color: '#2C3E50',
      is_featured: true
    }
  ];

  await knex('badges').insert(badges);
  console.log(`Seeded ${badges.length} achievement badges`);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  // Remove seeded badges
  return knex('badges').whereIn('name', [
    'First Lesson', 'Course Creator', 'Dedicated Teacher', 'Master Educator',
    'Welcome Aboard', 'Active Learner', 'Knowledge Seeker', 'Wisdom Achiever',
    'Video Pioneer', 'Content Creator', 'Community Helper', 'Spiritual Guide',
    'Beta Tester', 'Platform Pioneer'
  ]).del();
};
