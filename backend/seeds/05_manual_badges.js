/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  const badges = [
    {
      name: 'Student of the Month',
      description: 'Awarded for outstanding performance and dedication.',
      icon_url: 'https://ui-avatars.com/api/?name=SM&background=FFD700&color=fff',
      points: 100,
      badge_type: 'achievement',
      is_active: true,
      is_manual: true
    },
    {
      name: 'Community Helper',
      description: 'Awarded for helping others in the community.',
      icon_url: 'https://ui-avatars.com/api/?name=CH&background=4CAF50&color=fff',
      points: 50,
      badge_type: 'community',
      is_active: true,
      is_manual: true
    },
    {
      name: 'Event Organizer',
      description: 'Awarded for organizing a successful chapter event.',
      icon_url: 'https://ui-avatars.com/api/?name=EO&background=2196F3&color=fff',
      points: 75,
      badge_type: 'community',
      is_active: true,
      is_manual: true
    }
  ];

  for (const badge of badges) {
    const exists = await knex('badges').where({ name: badge.name }).first();
    if (!exists) {
      await knex('badges').insert(badge);
    } else {
      await knex('badges').where({ name: badge.name }).update({ is_manual: true });
    }
  }
};
