
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('onboarding_step_completions').del();
  await knex('onboarding_steps').del();
  await knex('onboarding_milestones').del();
  await knex('onboarding_flows').del();

  // 1. Create Flow
  const [flowId] = await knex('onboarding_flows').insert({
    name: 'New User Onboarding',
    audience: 'new_user',
    description: 'Guide for new users to set up their profile and explore the platform.',
    is_active: true,
    estimated_duration_minutes: 5
  }).returning('id');

  // 2. Create Milestones
  const [m1] = await knex('onboarding_milestones').insert({
    flow_id: flowId.id || flowId,
    name: 'Welcome & Setup',
    description: 'Get started with your profile.',
    step_count: 2,
    order_index: 1
  }).returning('id');

  const [m2] = await knex('onboarding_milestones').insert({
    flow_id: flowId.id || flowId,
    name: 'Discovery',
    description: 'Explore content and community.',
    step_count: 2,
    order_index: 2
  }).returning('id');

  const [m3] = await knex('onboarding_milestones').insert({
    flow_id: flowId.id || flowId,
    name: 'All Set!',
    description: 'You are ready to go.',
    step_count: 1,
    reward_type: 'badge',
    reward_data: JSON.stringify({ badge_name: 'Newcomer', icon: 'star' }),
    order_index: 3
  }).returning('id');

  // 3. Create Steps
  await knex('onboarding_steps').insert([
    {
      flow_id: flowId.id || flowId,
      milestone_id: m1.id || m1,
      title: 'Welcome to EOTY Platform',
      description: 'We are glad to have you here. Let\'s get you set up.',
      content: 'Welcome video or text goes here.',
      step_type: 'info',
      order_index: 1,
      is_required: true
    },
    {
      flow_id: flowId.id || flowId,
      milestone_id: m1.id || m1,
      title: 'Complete Your Profile',
      description: 'Upload a profile picture and set your bio.',
      step_type: 'action',
      action_required: 'profile_update',
      order_index: 2,
      is_required: true
    },
    {
      flow_id: flowId.id || flowId,
      milestone_id: m2.id || m2,
      title: 'Explore Courses',
      description: 'Check out our library of courses.',
      step_type: 'info', // Could be a tour
      order_index: 3,
      is_required: true
    },
    {
      flow_id: flowId.id || flowId,
      milestone_id: m2.id || m2,
      title: 'Join a Chapter',
      description: 'Connect with your local community.',
      step_type: 'action',
      action_required: 'join_chapter',
      order_index: 4,
      is_required: true
    },
    {
      flow_id: flowId.id || flowId,
      milestone_id: m3.id || m3,
      title: 'Claim Your Badge',
      description: 'Congratulations! You have completed the onboarding.',
      step_type: 'info',
      order_index: 5,
      is_required: true
    }
  ]);
};
