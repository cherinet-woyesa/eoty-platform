const db = require('../config/database');

const interactiveController = {
  // Get quizzes for a lesson
  async getLessonQuizzes(req, res) {
    try {
      const { lessonId } = req.params;
      const userId = req.user.userId;

      const quizzes = await db('quizzes')
        .where({ lesson_id: lessonId, is_published: true })
        .select('*')
        .orderBy('order_number', 'asc');

      // Get user's attempt status for each quiz
      const quizzesWithAttempts = await Promise.all(
        quizzes.map(async (quiz) => {
          const userAttempt = await db('user_quiz_attempts')
            .where({ user_id: userId, quiz_id: quiz.id })
            .select('score', 'max_score', 'is_completed', 'completed_at')
            .orderBy('created_at', 'desc')
            .first();

          return {
            ...quiz,
            user_attempt: userAttempt || null
          };
        })
      );

      res.json({
        success: true,
        data: { quizzes: quizzesWithAttempts }
      });
    } catch (error) {
      console.error('Get quizzes error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch quizzes'
      });
    }
  },

  // Get quiz questions
  async getQuizQuestions(req, res) {
    try {
      const { quizId } = req.params;

      const questions = await db('quiz_questions')
        .where({ quiz_id: quizId })
        .select('id', 'question_text', 'question_type', 'options', 'points', 'order_number')
        .orderBy('order_number', 'asc');

      res.json({
        success: true,
        data: { questions }
      });
    } catch (error) {
      console.error('Get quiz questions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch quiz questions'
      });
    }
  },

  // Submit quiz attempt
  async submitQuizAttempt(req, res) {
    try {
      const { quizId } = req.params;
      const { answers } = req.body;
      const userId = req.user.userId;

      // Get quiz and questions
      const quiz = await db('quizzes').where({ id: quizId }).first();
      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found'
        });
      }

      const questions = await db('quiz_questions')
        .where({ quiz_id: quizId })
        .select('*')
        .orderBy('order_number', 'asc');

      // Calculate score
      let score = 0;
      let maxScore = 0;
      const results = [];

      questions.forEach(question => {
        maxScore += question.points;
        const userAnswer = answers[question.id];
        const isCorrect = userAnswer === question.correct_answer;
        
        if (isCorrect) {
          score += question.points;
        }

        results.push({
          question_id: question.id,
          user_answer: userAnswer,
          correct_answer: question.correct_answer,
          is_correct: isCorrect,
          explanation: question.explanation
        });
      });

      // Check if user has attempts remaining
      const previousAttempts = await db('user_quiz_attempts')
        .where({ user_id: userId, quiz_id: quizId })
        .count('* as count')
        .first();

      if (quiz.max_attempts > 0 && previousAttempts.count >= quiz.max_attempts) {
        return res.status(400).json({
          success: false,
          message: 'No quiz attempts remaining'
        });
      }

      // Save attempt
      const [attemptId] = await db('user_quiz_attempts').insert({
        user_id: userId,
        quiz_id: quizId,
        score,
        max_score: maxScore,
        answers: JSON.stringify(results),
        is_completed: true,
        completed_at: new Date()
      });

      res.json({
        success: true,
        data: {
          attempt_id: attemptId,
          score,
          max_score: maxScore,
          percentage: Math.round((score / maxScore) * 100),
          results
        }
      });
    } catch (error) {
      console.error('Submit quiz error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit quiz'
      });
    }
  },

  // Create annotation
  async createAnnotation(req, res) {
    try {
      const { lessonId, timestamp, content, type, metadata = {}, isPublic = false } = req.body;
      const userId = req.user.userId;

      const [annotationId] = await db('video_annotations').insert({
        user_id: userId,
        lesson_id: lessonId,
        timestamp,
        content,
        type,
        metadata: JSON.stringify(metadata),
        is_public: isPublic
      });

      const annotation = await db('video_annotations')
        .where({ id: annotationId })
        .first();

      res.status(201).json({
        success: true,
        data: { annotation }
      });
    } catch (error) {
      console.error('Create annotation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create annotation'
      });
    }
  },

  // Get annotations for lesson
  async getLessonAnnotations(req, res) {
    try {
      const { lessonId } = req.params;
      const userId = req.user.userId;

      const annotations = await db('video_annotations')
        .where({ lesson_id: lessonId })
        .andWhere(function() {
          this.where({ user_id: userId }).orWhere({ is_public: true });
        })
        .select('*')
        .orderBy('timestamp', 'asc');

      res.json({
        success: true,
        data: { annotations }
      });
    } catch (error) {
      console.error('Get annotations error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch annotations'
      });
    }
  },

  // Create discussion post
  async createDiscussionPost(req, res) {
    try {
      const { lessonId, content, parentId = null, videoTimestamp = null } = req.body;
      const userId = req.user.userId;

      const [postId] = await db('lesson_discussions').insert({
        user_id: userId,
        lesson_id: lessonId,
        parent_id: parentId,
        content,
        video_timestamp: videoTimestamp
      });

      // Get the created post with user info
      const post = await db('lesson_discussions as ld')
        .join('users as u', 'ld.user_id', 'u.id')
        .where('ld.id', postId)
        .select(
          'ld.*',
          'u.first_name',
          'u.last_name',
          'u.email'
        )
        .first();

      res.status(201).json({
        success: true,
        data: { post }
      });
    } catch (error) {
      console.error('Create discussion post error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create discussion post'
      });
    }
  },

  // Get discussion posts for lesson
  async getLessonDiscussions(req, res) {
    try {
      const { lessonId } = req.params;

      const posts = await db('lesson_discussions as ld')
        .join('users as u', 'ld.user_id', 'u.id')
        .where('ld.lesson_id', lessonId)
        .andWhere('ld.is_moderated', false) // Only show non-moderated posts
        .select(
          'ld.*',
          'u.first_name',
          'u.last_name',
          'u.email'
        )
        .orderBy('ld.is_pinned', 'desc')
        .orderBy('ld.created_at', 'asc');

      // Structure as threaded comments
      const threadMap = new Map();
      const roots = [];

      posts.forEach(post => {
        post.replies = [];
        threadMap.set(post.id, post);
        
        if (post.parent_id) {
          const parent = threadMap.get(post.parent_id);
          if (parent) {
            parent.replies.push(post);
          }
        } else {
          roots.push(post);
        }
      });

      res.json({
        success: true,
        data: { posts: roots }
      });
    } catch (error) {
      console.error('Get discussions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch discussions'
      });
    }
  },

  // Update lesson progress
  async updateLessonProgress(req, res) {
    try {
      const { lessonId } = req.params;
      const { progress, lastWatchedTimestamp, isCompleted = false } = req.body;
      const userId = req.user.userId;

      const existingProgress = await db('user_lesson_progress')
        .where({ user_id: userId, lesson_id: lessonId })
        .first();

      const progressData = {
        user_id: userId,
        lesson_id: lessonId,
        progress: Math.min(Math.max(progress, 0), 1), // Clamp between 0-1
        last_watched_timestamp: lastWatchedTimestamp || 0,
        last_accessed_at: new Date()
      };

      if (isCompleted) {
        progressData.is_completed = true;
        progressData.completed_at = new Date();
      }

      if (existingProgress) {
        await db('user_lesson_progress')
          .where({ id: existingProgress.id })
          .update(progressData);
      } else {
        await db('user_lesson_progress').insert(progressData);
      }

      res.json({
        success: true,
        message: 'Progress updated successfully'
      });
    } catch (error) {
      console.error('Update progress error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update progress'
      });
    }
  },

  // Get user progress for lesson
  async getLessonProgress(req, res) {
    try {
      const { lessonId } = req.params;
      const userId = req.user.userId;

      const progress = await db('user_lesson_progress')
        .where({ user_id: userId, lesson_id: lessonId })
        .first();

      res.json({
        success: true,
        data: { progress: progress || null }
      });
    } catch (error) {
      console.error('Get progress error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch progress'
      });
    }
  },

  // TODO: Implement getQuizForTaking
  async getQuizForTaking(req, res) {
    res.status(501).json({ message: 'Not implemented' });
  },

  // TODO: Implement getQuizResults
  async getQuizResults(req, res) {
    res.status(501).json({ message: 'Not implemented' });
  }
};

module.exports = interactiveController;