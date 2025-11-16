/**
 * FR6: Seed Onboarding Steps
 * Creates default onboarding steps for each flow
 * REQUIREMENT: Step-by-step guide, milestone-based
 */

exports.seed = async function(knex) {
  // Get flows
  const flows = await knex('onboarding_flows').select('id', 'audience');
  
  if (flows.length === 0) {
    console.log('⚠️  No onboarding flows found. Run 008_onboarding_flows.js first.');
    return;
  }

  // Check if steps already exist
  const existingSteps = await knex('onboarding_steps').count('* as count').first();
  if (parseInt(existingSteps?.count || 0) > 0) {
    console.log('⚠️  Onboarding steps already exist, skipping seed');
    return;
  }

  const steps = [];

  // New User Flow Steps
  const newUserFlow = flows.find(f => f.audience === 'new_user');
  if (newUserFlow) {
    steps.push(
      {
        flow_id: newUserFlow.id,
        title: 'Welcome to EOTY Platform',
        description: 'Learn about the Ethiopian Orthodox Tewahedo Youth platform and its mission.',
        content: '<p>The EOTY Platform is designed to help you grow in your faith through interactive courses, community engagement, and spiritual resources.</p>',
        step_type: 'info',
        order_index: 1,
        is_required: true,
        auto_resume: true
      },
      {
        flow_id: newUserFlow.id,
        title: 'Explore Your Dashboard',
        description: 'Get familiar with your personal dashboard and navigation.',
        content: '<p>Your dashboard is your home base. From here you can access courses, track your progress, and connect with your chapter community.</p>',
        step_type: 'action',
        order_index: 2,
        prerequisites: JSON.stringify([]),
        is_required: true,
        auto_resume: true
      },
      {
        flow_id: newUserFlow.id,
        title: 'Browse Available Courses',
        description: 'Discover courses available to you and learn how to enroll.',
        content: '<p>Browse the course catalog to find courses that interest you. You can filter by category, level, and duration.</p>',
        step_type: 'action',
        action_required: 'Visit the courses page and browse available courses.',
        order_index: 3,
        prerequisites: JSON.stringify([]), // Will be updated after step insertion
        is_required: true,
        auto_resume: true
      },
      {
        flow_id: newUserFlow.id,
        title: 'Join Your Chapter Community',
        description: 'Connect with other youth members in your chapter through forums and discussions.',
        content: '<p>Your chapter community is where you can ask questions, share insights, and grow together in faith.</p>',
        step_type: 'info',
        order_index: 4,
        prerequisites: JSON.stringify([]), // Will be updated after step insertion
        is_required: true,
        auto_resume: true
      },
      {
        flow_id: newUserFlow.id,
        title: 'Access the Resource Library',
        description: 'Learn about the resource library and how to use it for your studies.',
        content: '<p>The resource library contains articles, documents, and materials to support your learning journey.</p>',
        step_type: 'info',
        order_index: 5,
        prerequisites: JSON.stringify([]), // Will be updated after step insertion
        is_required: true,
        auto_resume: true
      }
    );
  }

  // New Teacher Flow Steps
  const newTeacherFlow = flows.find(f => f.audience === 'new_teacher');
  if (newTeacherFlow) {
    steps.push(
      {
        flow_id: newTeacherFlow.id,
        title: 'Welcome, Teacher!',
        description: 'Learn about your role as a teacher on the platform.',
        content: '<p>As a teacher, you can create and manage courses, interact with students, and contribute to the community.</p>',
        step_type: 'info',
        order_index: 1,
        is_required: true,
        auto_resume: true
      },
      {
        flow_id: newTeacherFlow.id,
        title: 'Create Your First Course',
        description: 'Learn how to create and structure a course.',
        content: '<p>Creating a course involves setting up course details, adding lessons, and organizing content.</p>',
        step_type: 'action',
        action_required: 'Navigate to the course creation page and explore the options.',
        order_index: 2,
        prerequisites: JSON.stringify([]),
        is_required: true,
        auto_resume: true
      },
      {
        flow_id: newTeacherFlow.id,
        title: 'Add Lessons to Your Course',
        description: 'Learn how to add and organize lessons within your course.',
        content: '<p>Lessons are the building blocks of your course. You can add videos, quizzes, and resources to each lesson.</p>',
        step_type: 'action',
        action_required: 'Try adding a lesson to understand the lesson creation process.',
        order_index: 3,
        prerequisites: JSON.stringify([]), // Will be updated after step insertion
        is_required: true,
        auto_resume: true
      },
      {
        flow_id: newTeacherFlow.id,
        title: 'Manage Student Engagement',
        description: 'Learn how to interact with students and track their progress.',
        content: '<p>You can view student progress, respond to questions, and provide feedback through the platform.</p>',
        step_type: 'info',
        order_index: 4,
        prerequisites: JSON.stringify([]), // Will be updated after step insertion
        is_required: true,
        auto_resume: true
      },
      {
        flow_id: newTeacherFlow.id,
        title: 'Use Admin Tools',
        description: 'Explore the admin tools available to teachers.',
        content: '<p>Teachers have access to moderation tools, analytics, and content management features.</p>',
        step_type: 'info',
        order_index: 5,
        prerequisites: JSON.stringify([]), // Will be updated after step insertion
        is_required: true,
        auto_resume: true
      }
    );
  }

  // New Admin Flow Steps
  const newAdminFlow = flows.find(f => f.audience === 'new_admin');
  if (newAdminFlow) {
    steps.push(
      {
        flow_id: newAdminFlow.id,
        title: 'Welcome, Administrator!',
        description: 'Learn about your administrative responsibilities.',
        content: '<p>As an administrator, you have full access to platform management, user moderation, and system configuration.</p>',
        step_type: 'info',
        order_index: 1,
        is_required: true,
        auto_resume: true
      },
      {
        flow_id: newAdminFlow.id,
        title: 'User Management',
        description: 'Learn how to manage users, roles, and permissions.',
        content: '<p>You can view all users, manage their roles, and handle user-related issues.</p>',
        step_type: 'action',
        action_required: 'Explore the user management section.',
        order_index: 2,
        prerequisites: JSON.stringify([]),
        is_required: true,
        auto_resume: true
      },
      {
        flow_id: newAdminFlow.id,
        title: 'Content Moderation',
        description: 'Learn about content moderation tools and workflows.',
        content: '<p>You can review flagged content, moderate discussions, and ensure platform safety.</p>',
        step_type: 'action',
        action_required: 'Review the moderation dashboard and tools.',
        order_index: 3,
        prerequisites: JSON.stringify([]), // Will be updated after step insertion
        is_required: true,
        auto_resume: true
      },
      {
        flow_id: newAdminFlow.id,
        title: 'Analytics and Reporting',
        description: 'Learn how to access and interpret platform analytics.',
        content: '<p>The analytics dashboard provides insights into user engagement, course performance, and platform usage.</p>',
        step_type: 'info',
        order_index: 4,
        prerequisites: JSON.stringify([]), // Will be updated after step insertion
        is_required: true,
        auto_resume: true
      },
      {
        flow_id: newAdminFlow.id,
        title: 'System Configuration',
        description: 'Learn about system settings and configuration options.',
        content: '<p>You can configure platform settings, manage chapters, and control system-wide features.</p>',
        step_type: 'info',
        order_index: 5,
        prerequisites: JSON.stringify([]), // Will be updated after step insertion
        is_required: true,
        auto_resume: true
      }
    );
  }

  const insertedSteps = await knex('onboarding_steps').insert(steps).returning('*');
  console.log('✅ Onboarding steps seeded:', insertedSteps.length);

  // Update prerequisites with actual step IDs
  // Each step requires the previous step (except the first step)
  for (const flow of flows) {
    const flowSteps = insertedSteps
      .filter(s => s.flow_id === flow.id)
      .sort((a, b) => a.order_index - b.order_index);
    
    for (let i = 1; i < flowSteps.length; i++) {
      const step = flowSteps[i];
      const previousStep = flowSteps[i - 1];
      
      // Each step requires the previous step
      await knex('onboarding_steps')
        .where({ id: step.id })
        .update({ prerequisites: JSON.stringify([previousStep.id]) });
    }
  }

  console.log('✅ Prerequisites updated for all steps');
};

