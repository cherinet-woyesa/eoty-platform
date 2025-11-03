exports.seed = async function(knex) {
  // Get first lesson
  const lesson = await knex('lessons').first();
  
  if (!lesson) {
    console.log('No lessons found. Please run course seeds first.');
    return;
  }

  // Clear existing quiz data
  await knex('quiz_attempts').del();
  await knex('quiz_questions').del();
  await knex('quizzes').del();

  // Insert quiz (without created_by since it doesn't exist in your table)
  const quizzes = await knex('quizzes').insert([
    {
      lesson_id: lesson.id,
      title: 'Basic Orthodox Doctrine Quiz',
      description: 'Test your understanding of fundamental Orthodox Christian teachings',
      order_number: 1,
      time_limit: 600, // 10 minutes
      max_attempts: 3,
      is_published: true
      // removed created_by since column doesn't exist
    }
  ]).returning('id');

  console.log('✅ Quiz created with ID:', quizzes[0].id);

  // Insert questions
  await knex('quiz_questions').insert([
    {
      quiz_id: quizzes[0].id,
      question_text: 'How many persons are in the Holy Trinity?',
      question_type: 'multiple_choice',
      options: JSON.stringify({
        "choices": ["One", "Two", "Three", "Four"],
        "correct_index": 2
      }),
      correct_answer: "Three",
      explanation: "The Holy Trinity consists of three persons: Father, Son, and Holy Spirit.",
      points: 1,
      order_number: 1,
      is_active: true
    },
    {
      quiz_id: quizzes[0].id,
      question_text: 'The Ethiopian Orthodox Church follows the Alexandrian tradition.',
      question_type: 'true_false',
      options: JSON.stringify({
        "choices": ["True", "False"],
        "correct_index": 0
      }),
      correct_answer: "True",
      explanation: "Yes, the Ethiopian Orthodox Tewahedo Church follows the Alexandrian tradition and was under the jurisdiction of the Coptic Pope of Alexandria until 1959.",
      points: 1,
      order_number: 2,
      is_active: true
    },
    {
      quiz_id: quizzes[0].id,
      question_text: 'What is the central sacrament of the Ethiopian Orthodox Church?',
      question_type: 'multiple_choice',
      options: JSON.stringify({
        "choices": ["Baptism", "Eucharist (Qurban)", "Confirmation", "Marriage"],
        "correct_index": 1
      }),
      correct_answer: "Eucharist (Qurban)",
      explanation: "The Eucharist, known as Qurban, is the central and most important sacrament in the Ethiopian Orthodox Church.",
      points: 1,
      order_number: 3,
      is_active: true
    },
    {
      quiz_id: quizzes[0].id,
      question_text: 'Briefly explain the concept of Tewahedo in Ethiopian Orthodoxy.',
      question_type: 'short_answer',
      options: JSON.stringify({}),
      correct_answer: "unity",
      explanation: "Tewahedo means 'made one' or 'unified' in Ge'ez. It refers to the belief that Christ has one unified nature that is both divine and human, without separation, without mixture, and without confusion.",
      points: 3,
      order_number: 4,
      is_active: true
    }
  ]);

  console.log('✅ Quiz questions seeded');

  // Create a sample quiz attempt for the student
  const student = await knex('users').where('email', 'student@eoty.org').first();
  
  if (student) {
    // Create quiz session
    const quizSession = await knex('quiz_sessions').insert({
      user_id: student.id,
      quiz_id: quizzes[0].id,
      attempt_number: 1,
      total_questions: 4,
      correct_answers: 3,
      total_points: 5,
      max_points: 6,
      score_percentage: 83.33,
      is_completed: true,
      started_at: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      completed_at: new Date()
    }).returning('id');

    console.log('✅ Sample quiz attempt created for student');
  }

  console.log('✅ Quizzes seeded successfully!');
};