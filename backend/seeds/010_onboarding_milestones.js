/**
 * FR6: Seed Onboarding Milestones
 * Creates default milestones for each flow
 * REQUIREMENT: Milestone-based onboarding
 */

exports.seed = async function(knex) {
  // Get flows
  const flows = await knex('onboarding_flows').select('id', 'audience');
  
  if (flows.length === 0) {
    console.log('⚠️  No onboarding flows found. Run 008_onboarding_flows.js first.');
    return;
  }

  // Check if milestones already exist
  const existingMilestones = await knex('onboarding_milestones').count('* as count').first();
  if (parseInt(existingMilestones?.count || 0) > 0) {
    console.log('⚠️  Onboarding milestones already exist, skipping seed');
    return;
  }

  // Get or create badges (if badges table exists)
  let welcomeBadgeId = null;
  let teacherBadgeId = null;
  let adminBadgeId = null;

  try {
    const hasBadgesTable = await knex.schema.hasTable('badges');
    if (hasBadgesTable) {
      // Try to find existing badges
      const welcomeBadge = await knex('badges').where({ name: 'Welcome Badge' }).first();
      const teacherBadge = await knex('badges').where({ name: 'Teacher Onboarded' }).first();
      const adminBadge = await knex('badges').where({ name: 'Admin Certified' }).first();

      // Create badges if they don't exist
      if (!welcomeBadge) {
        const [badge] = await knex('badges').insert({
          name: 'Welcome Badge',
          description: 'Awarded for completing the new user onboarding',
          icon_url: null,
          is_active: true
        }).returning('id');
        welcomeBadgeId = badge.id;
      } else {
        welcomeBadgeId = welcomeBadge.id;
      }

      if (!teacherBadge) {
        const [badge] = await knex('badges').insert({
          name: 'Teacher Onboarded',
          description: 'Awarded for completing the teacher onboarding',
          icon_url: null,
          is_active: true
        }).returning('id');
        teacherBadgeId = badge.id;
      } else {
        teacherBadgeId = teacherBadge.id;
      }

      if (!adminBadge) {
        const [badge] = await knex('badges').insert({
          name: 'Admin Certified',
          description: 'Awarded for completing the admin onboarding',
          icon_url: null,
          is_active: true
        }).returning('id');
        adminBadgeId = badge.id;
      } else {
        adminBadgeId = adminBadge.id;
      }
    }
  } catch (error) {
    console.warn('⚠️  Could not create badges:', error.message);
  }

  const milestones = [];

  // New User Flow Milestones
  const newUserFlow = flows.find(f => f.audience === 'new_user');
  if (newUserFlow) {
    milestones.push(
      {
        flow_id: newUserFlow.id,
        name: 'Getting Started',
        description: 'Complete the first steps of your journey',
        step_count: 2, // Steps 1-2
        badge_id: null,
        reward_type: 'message',
        reward_data: JSON.stringify({ message: 'Great start! You\'re on your way.' }),
        order_index: 1
      },
      {
        flow_id: newUserFlow.id,
        name: 'Exploring the Platform',
        description: 'Learn about courses and community',
        step_count: 2, // Steps 3-4
        badge_id: null,
        reward_type: 'message',
        reward_data: JSON.stringify({ message: 'You\'re exploring like a pro!' }),
        order_index: 2
      },
      {
        flow_id: newUserFlow.id,
        name: 'Onboarding Complete',
        description: 'Finish your onboarding journey',
        step_count: 1, // Step 5
        badge_id: welcomeBadgeId,
        reward_type: 'badge',
        reward_data: JSON.stringify({ badge_name: 'Welcome Badge' }),
        order_index: 3
      }
    );
  }

  // New Teacher Flow Milestones
  const newTeacherFlow = flows.find(f => f.audience === 'new_teacher');
  if (newTeacherFlow) {
    milestones.push(
      {
        flow_id: newTeacherFlow.id,
        name: 'Course Creation Basics',
        description: 'Learn the fundamentals of course creation',
        step_count: 2, // Steps 1-2
        badge_id: null,
        reward_type: 'message',
        reward_data: JSON.stringify({ message: 'You\'re learning the basics!' }),
        order_index: 1
      },
      {
        flow_id: newTeacherFlow.id,
        name: 'Advanced Teaching Tools',
        description: 'Master lesson creation and student engagement',
        step_count: 2, // Steps 3-4
        badge_id: null,
        reward_type: 'message',
        reward_data: JSON.stringify({ message: 'You\'re becoming a teaching expert!' }),
        order_index: 2
      },
      {
        flow_id: newTeacherFlow.id,
        name: 'Teacher Certified',
        description: 'Complete your teacher onboarding',
        step_count: 1, // Step 5
        badge_id: teacherBadgeId,
        reward_type: 'badge',
        reward_data: JSON.stringify({ badge_name: 'Teacher Onboarded' }),
        order_index: 3
      }
    );
  }

  // New Admin Flow Milestones
  const newAdminFlow = flows.find(f => f.audience === 'new_admin');
  if (newAdminFlow) {
    milestones.push(
      {
        flow_id: newAdminFlow.id,
        name: 'User Management',
        description: 'Master user and role management',
        step_count: 2, // Steps 1-2
        badge_id: null,
        reward_type: 'message',
        reward_data: JSON.stringify({ message: 'You\'re mastering user management!' }),
        order_index: 1
      },
      {
        flow_id: newAdminFlow.id,
        name: 'Platform Administration',
        description: 'Learn moderation and analytics',
        step_count: 2, // Steps 3-4
        badge_id: null,
        reward_type: 'message',
        reward_data: JSON.stringify({ message: 'You\'re becoming an admin expert!' }),
        order_index: 2
      },
      {
        flow_id: newAdminFlow.id,
        name: 'Admin Certified',
        description: 'Complete your admin training',
        step_count: 1, // Step 5
        badge_id: adminBadgeId,
        reward_type: 'badge',
        reward_data: JSON.stringify({ badge_name: 'Admin Certified' }),
        order_index: 3
      }
    );
  }

  const insertedMilestones = await knex('onboarding_milestones').insert(milestones).returning('*');
  console.log('✅ Onboarding milestones seeded:', insertedMilestones.length);

  // Update step milestone_ids
  for (const milestone of insertedMilestones) {
    const flow = flows.find(f => f.id === milestone.flow_id);
    if (!flow) continue;

    const steps = await knex('onboarding_steps')
      .where({ flow_id: milestone.flow_id })
      .orderBy('order_index', 'asc');

    if (steps.length === 0) continue;

    // Assign milestone to steps based on order_index
    if (milestone.order_index === 1) {
      // First milestone: steps 1-2
      const stepIds = steps.slice(0, 2).map(s => s.id);
      if (stepIds.length > 0) {
        await knex('onboarding_steps')
          .whereIn('id', stepIds)
          .update({ milestone_id: milestone.id });
      }
    } else if (milestone.order_index === 2) {
      // Second milestone: steps 3-4
      const stepIds = steps.slice(2, 4).map(s => s.id);
      if (stepIds.length > 0) {
        await knex('onboarding_steps')
          .whereIn('id', stepIds)
          .update({ milestone_id: milestone.id });
      }
    } else if (milestone.order_index === 3) {
      // Third milestone: last step
      const lastStep = steps[steps.length - 1];
      if (lastStep) {
        await knex('onboarding_steps')
          .where('id', lastStep.id)
          .update({ milestone_id: milestone.id });
      }
    }
  }

  console.log('✅ Milestone IDs assigned to steps');
};

