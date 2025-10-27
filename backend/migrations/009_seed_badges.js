exports.up = async function(knex) {
  // Insert initial badges
  await knex('badges').insert([
    {
      name: 'first_post',
      description: 'Made your first forum post',
      icon_url: '/badges/first-post.png',
      badge_type: 'participation',
      category: 'community',
      points: 10,
      requirements: JSON.stringify({ forum_posts: 1 }),
      is_active: true
    },
    {
      name: 'active_participant',
      description: 'Posted 10 times in forums',
      icon_url: '/badges/active-participant.png',
      badge_type: 'participation',
      category: 'community',
      points: 50,
      requirements: JSON.stringify({ forum_posts: 10 }),
      is_active: true
    },
    {
      name: 'forum_leader',
      description: 'Posted 50 times in forums',
      icon_url: '/badges/forum-leader.png',
      badge_type: 'leadership',
      category: 'community',
      points: 100,
      requirements: JSON.stringify({ forum_posts: 50 }),
      is_active: true
    },
    {
      name: 'popular_contributor',
      description: 'Received 10+ likes on a post',
      icon_url: '/badges/popular-contributor.png',
      badge_type: 'participation',
      category: 'community',
      points: 25,
      requirements: JSON.stringify({}),
      is_active: true
    },
    {
      name: 'lesson_master',
      description: 'Completed 10 lessons',
      icon_url: '/badges/lesson-master.png',
      badge_type: 'completion',
      category: 'learning',
      points: 75,
      requirements: JSON.stringify({ lessons_completed: 10 }),
      is_active: true
    },
    {
      name: 'resource_explorer',
      description: 'Viewed 20 resources',
      icon_url: '/badges/resource-explorer.png',
      badge_type: 'participation',
      category: 'learning',
      points: 30,
      requirements: JSON.stringify({ resources_viewed: 20 }),
      is_active: true
    },
    {
      name: 'faith_scholar',
      description: 'Earned 5 different badges',
      icon_url: '/badges/faith-scholar.png',
      badge_type: 'special',
      category: 'achievement',
      points: 200,
      requirements: JSON.stringify({}),
      is_active: true
    }
  ]);
};

exports.down = async function(knex) {
  await knex('badges').del();
};