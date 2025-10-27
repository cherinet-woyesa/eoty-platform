exports.seed = function(knex) {
  // Deletes ALL existing entries
  return knex('user_quiz_attempts').del()
    .then(() => knex('quiz_questions').del())
    .then(() => knex('quizzes').del())
    .then(function () {
      // Inserts seed entries
      return knex('quizzes').insert([
        {
          id: 1,
          lesson_id: 1, // Make sure this matches an existing lesson ID
          title: 'Basic Orthodox Doctrine Quiz',
          description: 'Test your understanding of fundamental Orthodox Christian teachings',
          order_number: 1,
          time_limit: 600, // 10 minutes
          max_attempts: 3,
          is_published: true
        }
      ]);
    })
    .then(() => {
      return knex('quiz_questions').insert([
        {
          id: 1,
          quiz_id: 1,
          question_text: 'How many persons are in the Holy Trinity?',
          question_type: 'multiple_choice',
          options: JSON.stringify({
            "A": "One",
            "B": "Two", 
            "C": "Three",
            "D": "Four"
          }),
          correct_answer: "C",
          explanation: "The Holy Trinity consists of three persons: Father, Son, and Holy Spirit.",
          points: 1,
          order_number: 1
        },
        {
          id: 2,
          quiz_id: 1,
          question_text: 'The Ethiopian Orthodox Church follows the Alexandrian tradition.',
          question_type: 'true_false',
          options: JSON.stringify({
            "A": "True",
            "B": "False"
          }),
          correct_answer: "A",
          explanation: "Yes, the Ethiopian Orthodox Tewahedo Church follows the Alexandrian tradition and was under the jurisdiction of the Coptic Pope of Alexandria until 1959.",
          points: 1,
          order_number: 2
        },
        {
          id: 3,
          quiz_id: 1,
          question_text: 'Which of these are important fasting periods in the Ethiopian Orthodox Church? (Select all that apply)',
          question_type: 'multiple_choice',
          options: JSON.stringify({
            "A": "Lent (Hudade)",
            "B": "Apostles' Fast",
            "C": "Assumption Fast",
            "D": "All of the above"
          }),
          correct_answer: "D",
          explanation: "The Ethiopian Orthodox Church observes several fasting periods including Lent (Hudade), Apostles' Fast, and the Assumption Fast.",
          points: 2,
          order_number: 3
        },
        {
          id: 4,
          quiz_id: 1,
          question_text: 'What is the central sacrament of the Ethiopian Orthodox Church?',
          question_type: 'multiple_choice',
          options: JSON.stringify({
            "A": "Baptism",
            "B": "Eucharist (Qurban)",
            "C": "Confirmation", 
            "D": "Marriage"
          }),
          correct_answer: "B",
          explanation: "The Eucharist, known as Qurban, is the central and most important sacrament in the Ethiopian Orthodox Church.",
          points: 1,
          order_number: 4
        },
        {
          id: 5,
          quiz_id: 1,
          question_text: 'Briefly explain the concept of Tewahedo in Ethiopian Orthodoxy.',
          question_type: 'short_answer',
          options: JSON.stringify({}),
          correct_answer: "unity",
          explanation: "Tewahedo means 'made one' or 'unified' in Ge'ez. It refers to the belief that Christ has one unified nature that is both divine and human, without separation, without mixture, and without confusion.",
          points: 3,
          order_number: 5
        }
      ]);
    });
};