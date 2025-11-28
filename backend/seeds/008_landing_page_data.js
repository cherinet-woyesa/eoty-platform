/**
 * Seed data for landing page
 * Creates landing page content and sample course stats and ratings for featured courses
 */

exports.seed = async function(knex) {
  // Seed landing page content
  const landingContent = {
    hero: {
      badge: 'For Ethiopian Orthodox Youths',
      title: 'Transform Your',
      titleGradient: 'Learning Journey',
      description: 'Join our faith-centered learning community. Access courses, track progress, and grow in your spiritual journey.',
      videoUrl: '', // Will be set by admin via upload
      showVideo: false
    },
    about: {
      badge: 'Our Mission',
      title: 'Empowering Ethiopian Orthodox Youths',
      description: 'Empowering Ethiopian Orthodox youths through faith-centered education. Nurturing spiritual growth with quality learning that honors our traditions.',
      features: [
        'Faith-Centered Learning',
        'Traditional Wisdom',
        'Community Support',
        'Spiritual Growth'
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
    },
    resources: {
      badge: 'Educational Resources',
      title: 'Orthodox Learning Materials',
      description: 'Access a rich library of faith-based educational content, study guides, and spiritual resources shared by Orthodox educators worldwide.'
    },
    blogs: {
      badge: 'Latest Articles',
      title: 'Insights & Stories',
      description: 'Discover insights and stories from our community'
    },
    testimonials: {
      badge: 'What Our Students Say',
      title: 'Trusted by Thousands',
      description: 'Real experiences from our learning community'
    },
    cta: {
      badge: 'Join Our Community',
      title: 'Ready to Start Learning?',
      description: 'Start your faith-centered learning journey today. Join thousands of students already learning and growing.',
      trustIndicators: [
        '100% Free to Start',
        '10K+ Active Students',
        '98% Satisfaction Rate',
        '500+ Courses Available'
      ]
    }
  };

  // Insert or update landing page content
  const existingContent = await knex('landing_page_content').first();

  if (existingContent) {
    // Update existing content
    await knex('landing_page_content')
      .where({ id: existingContent.id })
      .update({
        content_json: JSON.stringify(landingContent),
        updated_at: new Date()
      });
    console.log('✅ Landing page content updated');
  } else {
    // Insert new content
    await knex('landing_page_content').insert({
      content_json: JSON.stringify(landingContent),
      is_active: true,
      created_by: null,
      updated_by: null,
      created_at: new Date(),
      updated_at: new Date()
    });
    console.log('✅ Landing page content seeded');
  }
  // Get published courses
  const courses = await knex('courses')
    .where({ is_published: true })
    .select('id')
    .limit(10);

  if (courses.length === 0) {
    console.log('No published courses found. Skipping landing page seed.');
    return;
  }

  // Insert course stats for each course
  const courseStats = courses.map((course, index) => ({
    course_id: course.id,
    view_count: Math.floor(Math.random() * 5000) + 500,
    enrollment_count: Math.floor(Math.random() * 2000) + 100,
    completion_count: Math.floor(Math.random() * 500) + 50,
    favorite_count: Math.floor(Math.random() * 300) + 20,
    average_rating: (Math.random() * 1.5 + 3.5).toFixed(2), // 3.5 to 5.0
    rating_count: Math.floor(Math.random() * 200) + 50,
    engagement_metrics: JSON.stringify({
      avg_time_spent: Math.floor(Math.random() * 3600) + 1800,
      completion_rate: (Math.random() * 0.4 + 0.6).toFixed(2)
    }),
    last_accessed_at: new Date(),
    created_at: new Date(),
    updated_at: new Date()
  }));

  // Insert or update course stats
  for (const stat of courseStats) {
    await knex('course_stats')
      .insert(stat)
      .onConflict('course_id')
      .merge();
  }

  // Get some users to create ratings
  const users = await knex('users')
    .whereIn('role', ['user', 'student'])
    .select('id')
    .limit(20);

  if (users.length === 0) {
    console.log('No users found. Skipping ratings seed.');
    return;
  }

  // Sample reviews
  const sampleReviews = [
    'This course has transformed my understanding of our faith. Highly recommended!',
    'Excellent content and very well structured. The instructor is knowledgeable.',
    'Great course! I learned so much about our Orthodox traditions.',
    'Very informative and engaging. The video lessons are high quality.',
    'This course helped me grow spiritually. Thank you!',
    'Well-organized and easy to follow. Perfect for beginners.',
    'The best course I\'ve taken on this platform. Five stars!',
    'Comprehensive coverage of the topic. Very satisfied.',
    'Inspiring and educational. I recommend it to everyone.',
    'Clear explanations and great examples. Loved it!'
  ];

  // Create ratings for courses
  const ratings = [];
  courses.forEach((course, courseIndex) => {
    // Create 3-8 ratings per course
    const numRatings = Math.floor(Math.random() * 6) + 3;
    const usedUsers = new Set();
    
    for (let i = 0; i < numRatings && i < users.length; i++) {
      let userIndex;
      do {
        userIndex = Math.floor(Math.random() * users.length);
      } while (usedUsers.has(userIndex));
      
      usedUsers.add(userIndex);
      
      ratings.push({
        course_id: course.id,
        user_id: users[userIndex].id,
        rating: Math.floor(Math.random() * 2) + 4, // 4 or 5 stars
        review: Math.random() > 0.3 ? sampleReviews[Math.floor(Math.random() * sampleReviews.length)] : null,
        is_verified: Math.random() > 0.2, // 80% verified
        helpful_votes: JSON.stringify({
          helpful: Math.floor(Math.random() * 20),
          not_helpful: Math.floor(Math.random() * 3)
        }),
        created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
        updated_at: new Date()
      });
    }
  });

  // Insert ratings (ignore conflicts)
  for (const rating of ratings) {
    try {
      await knex('course_ratings')
        .insert(rating)
        .onConflict(['course_id', 'user_id'])
        .ignore();
    } catch (error) {
      // Ignore duplicate errors
      console.log('Skipping duplicate rating');
    }
  }

  console.log(`Seeded ${courseStats.length} course stats and ${ratings.length} ratings`);
};
