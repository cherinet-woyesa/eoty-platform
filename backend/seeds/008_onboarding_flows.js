/**
 * FR6: Seed Onboarding Flows
 * Creates default onboarding flows for each audience
 * REQUIREMENT: 100% new users see guided onboarding
 */

exports.seed = async function(knex) {
  // Check if flows already exist
  const existingFlows = await knex('onboarding_flows').count('* as count').first();
  if (parseInt(existingFlows?.count || 0) > 0) {
    console.log('⚠️  Onboarding flows already exist, skipping seed');
    return;
  }

  // Insert onboarding flows
  const flows = await knex('onboarding_flows').insert([
    {
      name: 'Welcome to EOTY Platform',
      audience: 'new_user',
      description: 'Complete this onboarding to learn about the platform features and get started as a student.',
      is_active: true,
      estimated_duration_minutes: 10
    },
    {
      name: 'Teacher Onboarding',
      audience: 'new_teacher',
      description: 'Learn how to create courses, manage lessons, and engage with students as a teacher.',
      is_active: true,
      estimated_duration_minutes: 15
    },
    {
      name: 'Admin Training',
      audience: 'new_admin',
      description: 'Master the admin tools, moderation features, and platform management capabilities.',
      is_active: true,
      estimated_duration_minutes: 20
    }
  ]).returning('*');

  console.log('✅ Onboarding flows seeded:', flows.length);
  return flows;
};


