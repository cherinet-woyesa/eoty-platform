/**
 * Seed for landing page content
 */
exports.seed = async function(knex) {
  // Check if content already exists
  const existingContent = await knex('landing_page_content').first();
  
  if (existingContent) {
    console.log('Landing page content already exists, skipping seed.');
    return;
  }

  const defaultContent = {
    hero: {
      badge: 'For Ethiopian Orthodox Youths',
      title: 'Transform Your',
      titleGradient: 'Learning Journey',
      description: 'Join our faith-centered learning community. Access courses, track progress, and grow in your spiritual journey.',
      videoUrl: '',
      showVideo: false
    },
    about: {
      badge: 'Our Mission',
      title: 'Empowering Ethiopian Orthodox Youths',
      description: 'Empowering Ethiopian Orthodox youths through faith-centered education. Nurturing spiritual growth with quality learning that honors our traditions.',
      features: [
        {
          icon: 'BookOpen',
          title: 'Comprehensive Learning',
          description: 'Access courses covering theology, history, traditions, and more.'
        },
        {
          icon: 'Users',
          title: 'Community Support',
          description: 'Connect with fellow learners and experienced teachers.'
        },
        {
          icon: 'Award',
          title: 'Track Progress',
          description: 'Monitor your learning journey and celebrate achievements.'
        }
      ]
    },
    howItWorks: {
      badge: 'Simple Process',
      title: 'How It Works',
      description: 'Start your learning journey in minutes',
      steps: [
        {
          step: '01',
          icon: 'User',
          title: 'Create Account',
          description: 'Sign up for free and join our community of learners',
          features: ['Free forever', 'No credit card', 'Instant access']
        },
        {
          step: '02',
          icon: 'BookOpen',
          title: 'Browse Courses',
          description: 'Explore our comprehensive library of faith-based courses',
          features: ['500+ courses', 'Expert teachers', 'Self-paced']
        },
        {
          step: '03',
          icon: 'PlayCircle',
          title: 'Start Learning',
          description: 'Watch videos, complete lessons, and track your progress',
          features: ['HD videos', 'Interactive quizzes', 'Progress tracking']
        },
        {
          step: '04',
          icon: 'Award',
          title: 'Earn Achievements',
          description: 'Complete courses, earn badges, and grow in your faith journey',
          features: ['Certificates', 'Badges', 'Leaderboards']
        }
      ]
    }
  };

  // Get the first admin user to set as creator
  const adminUser = await knex('users').where('role', 'admin').first();
  const adminId = adminUser ? adminUser.id : null;

  // Insert default content
  await knex('landing_page_content').insert({
    content_json: JSON.stringify(defaultContent),
    is_active: true,
    created_by: adminId,
    updated_by: adminId
  });

  console.log('✅ Landing page content seeded successfully');
};
