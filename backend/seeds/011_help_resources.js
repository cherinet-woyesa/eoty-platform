/**
 * FR6: Seed Help Resources
 * Creates default help resources, FAQs, and contextual help
 * REQUIREMENT: Contextual help, FAQ integration
 */

exports.seed = async function(knex) {
  // Check if help resources already exist
  // const existingResources = await knex('help_resources').count('* as count').first();
  // if (parseInt(existingResources?.count || 0) > 0) {
  //   console.log('⚠️  Help resources already exist, skipping seed');
  //   return;
  // }

  // Clear existing resources
  await knex('help_resources').del();


  const helpResources = [
    // Dashboard Help
    {
      resource_type: 'tooltip',
      component: 'dashboard',
      page: '/dashboard',
      audience: 'all',
      category: 'navigation',
      title: 'Your Dashboard',
      content: '<p>This is your command center. View your active courses, check upcoming events, and see your latest achievements at a glance.</p>',
      is_active: true
    },
    {
      resource_type: 'modal',
      component: 'dashboard',
      page: '/dashboard',
      audience: 'all',
      category: 'navigation',
      title: 'Mastering Your Dashboard',
      content: '<p><strong>Key Features:</strong></p><ul><li><strong>My Learning:</strong> Quick access to your current courses.</li><li><strong>Community:</strong> See the latest discussions in your chapter.</li><li><strong>Progress:</strong> Track your points, badges, and study streak.</li><li><strong>Recommendations:</strong> Discover new content based on your interests.</li></ul>',
      is_active: true
    },

    // Courses Help
    {
      resource_type: 'tooltip',
      component: 'course-card',
      page: '/courses',
      audience: 'all',
      category: 'courses',
      title: 'Course Overview',
      content: '<p>Click to view the syllabus, instructor details, and enrollment options. Start your learning journey here.</p>',
      is_active: true
    },
    {
      resource_type: 'faq',
      component: null,
      page: null,
      audience: 'all',
      category: 'courses',
      title: 'How do I start a course?',
      content: '<p>Simply click "Enroll" on any course card. The course will be added to your dashboard, and you can begin the first lesson immediately.</p>',
      is_active: true
    },
    {
      resource_type: 'faq',
      component: null,
      page: null,
      audience: 'all',
      category: 'courses',
      title: 'Can I learn at my own pace?',
      content: '<p>Absolutely! Most courses are self-paced. You can pause and resume whenever you like. Your progress is automatically saved.</p>',
      is_active: true
    },

    // Forums Help
    {
      resource_type: 'tooltip',
      component: 'forum-topic',
      page: '/forums',
      audience: 'all',
      category: 'community',
      title: 'Join the Discussion',
      content: '<p>Engage with your peers! Ask questions, share your thoughts, and support others in their faith journey.</p>',
      is_active: true
    },
    {
      resource_type: 'faq',
      component: null,
      page: null,
      audience: 'all',
      category: 'community',
      title: 'How do I post a new topic?',
      content: '<p>Navigate to the relevant forum category and click the "New Topic" button. Give your post a clear title and share your message. Remember to be respectful and kind!</p>',
      is_active: true
    },
    {
      resource_type: 'faq',
      component: null,
      page: null,
      audience: 'all',
      category: 'community',
      title: 'What is a Chapter Forum?',
      content: '<p>Chapter Forums are private spaces for members of your specific local chapter. It\'s a great place to discuss local events and coordinate activities.</p>',
      is_active: true
    },

    // Resource Library Help
    {
      resource_type: 'tooltip',
      component: 'resource-card',
      page: '/resources',
      audience: 'all',
      category: 'resources',
      title: 'Resource Card',
      content: '<p>Click on a resource card to view the resource, read summaries, take notes, and share with your chapter.</p>',
      is_active: true
    },
    {
      resource_type: 'faq',
      component: null,
      page: null,
      audience: 'all',
      category: 'resources',
      title: 'How do I search for resources?',
      content: '<p>Use the search bar and filters on the resources page to find resources by category, tags, author, or date. You can also use keywords to search resource content.</p>',
      is_active: true
    },
    {
      resource_type: 'faq',
      component: null,
      page: null,
      audience: 'all',
      category: 'resources',
      title: 'Can I take notes on resources?',
      content: '<p>Yes! When viewing a resource, you can create notes that are anchored to specific sections. Notes can be personal or shared with your chapter.</p>',
      is_active: true
    },

    // Teacher-Specific Help
    {
      resource_type: 'modal',
      component: 'course-editor',
      page: '/teacher/courses',
      audience: 'new_teacher',
      category: 'teaching',
      title: 'Creating Your First Course',
      content: '<p><strong>Course Creation Steps:</strong></p><ol><li>Click "Create Course"</li><li>Fill in course details (title, description, category)</li><li>Add lessons to your course</li><li>Upload course materials</li><li>Publish your course</li></ol>',
      is_active: true
    },
    {
      resource_type: 'faq',
      component: null,
      page: null,
      audience: 'new_teacher',
      category: 'teaching',
      title: 'How do I add a lesson to my course?',
      content: '<p>Navigate to your course details page and click "Add Lesson". Fill in the lesson title and description, then add content such as videos, quizzes, or resources.</p>',
      is_active: true
    },
    {
      resource_type: 'faq',
      component: null,
      page: null,
      audience: 'new_teacher',
      category: 'teaching',
      title: 'How do I track student progress?',
      content: '<p>You can view student progress from the course details page. The progress dashboard shows completion rates, quiz scores, and engagement metrics for each student.</p>',
      is_active: true
    },

    // Admin-Specific Help
    {
      resource_type: 'modal',
      component: 'admin-dashboard',
      page: '/admin',
      audience: 'new_admin',
      category: 'administration',
      title: 'Admin Dashboard Overview',
      content: '<p><strong>Admin Tools:</strong></p><ul><li>User Management: View and manage all users</li><li>Content Moderation: Review flagged content</li><li>Analytics: View platform usage statistics</li><li>System Configuration: Manage platform settings</li></ul>',
      is_active: true
    },
    {
      resource_type: 'faq',
      component: null,
      page: null,
      audience: 'new_admin',
      category: 'administration',
      title: 'How do I moderate flagged content?',
      content: '<p>Navigate to the Moderation Tools section in the admin dashboard. Review flagged content, take appropriate action (approve, warn, remove), and track moderation statistics.</p>',
      is_active: true
    },
    {
      resource_type: 'faq',
      component: null,
      page: null,
      audience: 'new_admin',
      category: 'administration',
      title: 'How do I ban a user?',
      content: '<p>From the user management page, select a user and click "Ban User". Provide a reason and duration for the ban. Banned users will be unable to access the platform during the ban period.</p>',
      is_active: true
    },

    // AI Assistant Help
    {
      resource_type: 'tooltip',
      component: 'ai-chat',
      page: '/ai-assistant',
      audience: 'all',
      category: 'ai',
      title: 'AI Assistant',
      content: '<p>The AI Assistant can answer questions about faith, courses, and platform features. It provides doctrinally-aligned responses in multiple languages.</p>',
      is_active: true
    },
    {
      resource_type: 'faq',
      component: null,
      page: null,
      audience: 'all',
      category: 'ai',
      title: 'What languages does the AI Assistant support?',
      content: '<p>The AI Assistant supports English, Amharic, Tigrigna, and Afan Oromo. It automatically detects your language and responds accordingly.</p>',
      is_active: true
    },
    {
      resource_type: 'faq',
      component: null,
      page: null,
      audience: 'all',
      category: 'ai',
      title: 'How accurate are AI responses?',
      content: '<p>AI responses are validated for 90%+ accuracy and alignment with Ethiopian Orthodox Tewahedo Church doctrine. Responses are reviewed and moderated to ensure quality.</p>',
      is_active: true
    },

    // General Platform Help
    {
      resource_type: 'faq',
      component: null,
      page: null,
      audience: 'all',
      category: 'general',
      title: 'How do I change my password?',
      content: '<p>Navigate to your profile settings and click "Change Password". Enter your current password and new password, then confirm the change.</p>',
      is_active: true
    },
    {
      resource_type: 'faq',
      component: null,
      page: null,
      audience: 'all',
      category: 'general',
      title: 'How do I update my profile?',
      content: '<p>Click on your profile icon in the header, then select "Edit Profile". Update your information and save your changes.</p>',
      is_active: true
    },
    {
      resource_type: 'faq',
      component: null,
      page: null,
      audience: 'all',
      category: 'general',
      title: 'How do I report inappropriate content?',
      content: '<p>You can report content by clicking the "Report" button on any post, comment, or resource. Our moderation team will review your report and take appropriate action.</p>',
      is_active: true
    }
  ];

  await knex('help_resources').insert(helpResources);
  console.log('✅ Help resources seeded:', helpResources.length);
};


