/**
 * Seed data for landing page
 * Creates sample course stats and ratings for featured courses
 */

exports.seed = async function(knex) {
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
