exports.seed = async function(knex) {
  // Check if we have any lessons to work with
  const lessons = await knex('lessons').select('id', 'title').limit(3);
  
  if (lessons.length === 0) {
    console.log('No lessons found. Skipping quiz and discussion seeding.');
    return;
  }

  const lessonId = lessons[0].id;

  // Seed quiz questions
  const quizQuestions = [
    {
      lesson_id: lessonId,
      question_text: 'What is the primary focus of Orthodox Christianity?',
      question_type: 'multiple_choice',
      options: JSON.stringify({
        A: 'Individual salvation',
        B: 'Community and tradition',
        C: 'Personal interpretation',
        D: 'Modern adaptation'
      }),
      correct_answer: 'B',
      explanation: 'Orthodox Christianity emphasizes community, tradition, and the collective experience of the Church.',
      points: 1,
      order: 1,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      lesson_id: lessonId,
      question_text: 'The Holy Trinity consists of three distinct persons in one God.',
      question_type: 'true_false',
      options: null,
      correct_answer: 'True',
      explanation: 'The Holy Trinity is a fundamental doctrine of Orthodox Christianity.',
      points: 1,
      order: 2,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      lesson_id: lessonId,
      question_text: 'Explain the significance of the Divine Liturgy in Orthodox worship.',
      question_type: 'short_answer',
      options: null,
      correct_answer: 'The Divine Liturgy is the central act of worship where believers participate in the heavenly banquet and receive the Body and Blood of Christ.',
      explanation: 'The Divine Liturgy is not just a service but a participation in the eternal worship of heaven.',
      points: 2,
      order: 3,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }
  ];

  // Insert quiz questions
  await knex('quiz_questions').insert(quizQuestions);

  // Seed discussion data
  const discussions = [
    {
      lesson_id: lessonId,
      user_id: 1, // Assuming user with ID 1 exists
      parent_id: null,
      content: 'This lesson really helped me understand the concept of faith in Orthodox Christianity. The explanation about the Trinity was particularly enlightening.',
      video_timestamp: 120,
      is_approved: true,
      is_pinned: true,
      likes_count: 12,
      replies_count: 2,
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
      updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000)
    },
    {
      lesson_id: lessonId,
      user_id: 1,
      parent_id: null,
      content: 'Could someone explain the difference between Orthodox and Catholic views on the Holy Spirit?',
      video_timestamp: 300,
      is_approved: true,
      is_pinned: false,
      likes_count: 8,
      replies_count: 1,
      created_at: new Date(Date.now() - 4 * 60 * 60 * 1000),
      updated_at: new Date(Date.now() - 4 * 60 * 60 * 1000)
    }
  ];

  // Insert discussions
  const discussionIds = await knex('lesson_discussions').insert(discussions).returning('id');

  // Seed replies
  const replies = [
    {
      lesson_id: lessonId,
      user_id: 2, // Assuming user with ID 2 exists
      parent_id: discussionIds[0].id,
      content: 'I agree! The way the teacher explained the relationship between the Father, Son, and Holy Spirit was very clear.',
      video_timestamp: null,
      is_approved: true,
      is_pinned: false,
      likes_count: 5,
      replies_count: 0,
      created_at: new Date(Date.now() - 1 * 60 * 60 * 1000),
      updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000)
    },
    {
      lesson_id: lessonId,
      user_id: 2,
      parent_id: discussionIds[0].id,
      content: 'The visual diagrams really helped me grasp the concept better.',
      video_timestamp: null,
      is_approved: true,
      is_pinned: false,
      likes_count: 3,
      replies_count: 0,
      created_at: new Date(Date.now() - 30 * 60 * 1000),
      updated_at: new Date(Date.now() - 30 * 60 * 1000)
    }
  ];

  await knex('lesson_discussions').insert(replies);

  console.log('Quiz and discussion data seeded successfully!');
};





