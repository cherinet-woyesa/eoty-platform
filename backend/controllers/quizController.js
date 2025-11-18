const db = require('../config/database');

const quizController = {
  // Create a quiz question for a lesson
  async createQuestion(req, res) {
    try {
      const teacherId = req.user.userId;
      const { lessonId } = req.params;
      const { question_text, question_type, options, correct_answer, explanation, points, order } = req.body;

      // Verify the lesson belongs to the teacher
      const lesson = await db('lessons as l')
        .join('courses as c', 'l.course_id', 'c.id')
        .where({ 'l.id': lessonId, 'c.created_by': teacherId })
        .first();

      if (!lesson) {
        return res.status(404).json({
          success: false,
          message: 'Lesson not found or access denied'
        });
      }

      const questionId = await db('quiz_questions').insert({
        lesson_id: lessonId,
        question_text,
        question_type,
        options: options ? JSON.stringify(options) : null,
        correct_answer,
        explanation,
        points: points || 1,
        order: order || 0,
        created_at: new Date(),
        updated_at: new Date()
      }).returning('id');

      res.status(201).json({
        success: true,
        message: 'Quiz question created successfully',
        data: { questionId: questionId[0].id }
      });
    } catch (error) {
      console.error('Create question error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create quiz question'
      });
    }
  },

  // Get all quiz questions for a lesson
  async getLessonQuestions(req, res) {
    try {
      const { lessonId } = req.params;

      const questions = await db('quiz_questions')
        .where({ lesson_id: lessonId, is_active: true })
        .orderBy('order', 'asc')
        .select('*');

      // Parse options JSON for multiple choice questions
      const parsedQuestions = questions.map(q => ({
        ...q,
        options: q.options ? JSON.parse(q.options) : null
      }));

      res.json({
        success: true,
        data: { questions: parsedQuestions }
      });
    } catch (error) {
      console.error('Get questions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch quiz questions'
      });
    }
  },

  // Submit a quiz answer
  async submitAnswer(req, res) {
    try {
      const userId = req.user.userId;
      const { questionId } = req.params;
      const { answer } = req.body;

      // Get the question details
      const question = await db('quiz_questions')
        .where({ id: questionId })
        .first();

      if (!question) {
        return res.status(404).json({
          success: false,
          message: 'Question not found'
        });
      }

      // Check if answer is correct
      const isCorrect = answer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();
      const pointsEarned = isCorrect ? question.points : 0;

      // Record the attempt
      await db('quiz_attempts').insert({
        user_id: userId,
        question_id: questionId,
        user_answer: answer,
        is_correct: isCorrect,
        points_earned: pointsEarned,
        attempted_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      });

      res.json({
        success: true,
        data: {
          isCorrect,
          pointsEarned,
          correctAnswer: question.correct_answer,
          explanation: question.explanation
        }
      });
    } catch (error) {
      console.error('Submit answer error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit answer'
      });
    }
  },

  // Start a quiz session
  async startQuizSession(req, res) {
    try {
      const userId = req.user.userId;
      const { lessonId } = req.params;

      // Get total questions and points for the lesson
      const questions = await db('quiz_questions')
        .where({ lesson_id: lessonId, is_active: true });

      const totalQuestions = questions.length;
      const maxPoints = questions.reduce((sum, q) => sum + q.points, 0);

      // Create quiz session
      const sessionId = await db('quiz_sessions').insert({
        user_id: userId,
        lesson_id: lessonId,
        total_questions: totalQuestions,
        max_points: maxPoints,
        started_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      }).returning('id');

      res.json({
        success: true,
        data: { sessionId: sessionId[0].id, totalQuestions, maxPoints }
      });
    } catch (error) {
      console.error('Start quiz session error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start quiz session'
      });
    }
  },

  // Complete a quiz session
  async completeQuizSession(req, res) {
    try {
      const userId = req.user.userId;
      const { sessionId } = req.params;

      // Get session details
      const session = await db('quiz_sessions')
        .where({ id: sessionId, user_id: userId })
        .first();

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Quiz session not found'
        });
      }

      // Calculate final score
      const attempts = await db('quiz_attempts')
        .where({ user_id: userId })
        .join('quiz_questions', 'quiz_attempts.question_id', 'quiz_questions.id')
        .where('quiz_questions.lesson_id', session.lesson_id)
        .select('quiz_attempts.*');

      const correctAnswers = attempts.filter(a => a.is_correct).length;
      const totalPoints = attempts.reduce((sum, a) => sum + a.points_earned, 0);
      const scorePercentage = session.max_points > 0 ? (totalPoints / session.max_points) * 100 : 0;

      // Update session
      await db('quiz_sessions')
        .where({ id: sessionId })
        .update({
          correct_answers: correctAnswers,
          total_points: totalPoints,
          score_percentage: scorePercentage,
          is_completed: true,
          completed_at: new Date(),
          updated_at: new Date()
        });

      // Update lesson progress
      await quizController.updateLessonProgress(userId, session.lesson_id, 'quiz', scorePercentage);

      res.json({
        success: true,
        data: {
          correctAnswers,
          totalQuestions: session.total_questions,
          totalPoints,
          maxPoints: session.max_points,
          scorePercentage: Math.round(scorePercentage * 100) / 100
        }
      });
    } catch (error) {
      console.error('Complete quiz session error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to complete quiz session'
      });
    }
  },

  // Get user's quiz results for a lesson
  async getQuizResults(req, res) {
    try {
      const userId = req.user.userId;
      const { lessonId } = req.params;

      const results = await db('quiz_sessions')
        .where({ user_id: userId, lesson_id: lessonId })
        .orderBy('completed_at', 'desc')
        .select('*');

      res.json({
        success: true,
        data: { results }
      });
    } catch (error) {
      console.error('Get quiz results error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch quiz results'
      });
    }
  },

  // Update lesson progress
  updateLessonProgress: async (userId, lessonId, type, progress) => {
    try {
      const existingProgress = await db('user_lesson_progress')
        .where({ user_id: userId, lesson_id: lessonId })
        .first();

      const updateData = {
        last_accessed_at: new Date(),
        updated_at: new Date()
      };

      if (type === 'video') {
        updateData.video_progress = progress;
        updateData.is_video_completed = progress >= 100;
      } else if (type === 'quiz') {
        updateData.quiz_progress = progress;
        updateData.is_quiz_completed = progress >= 100;
      }

      // Calculate overall progress (average of video and quiz)
      const videoProgress = type === 'video' ? progress : (existingProgress?.video_progress || 0);
      const quizProgress = type === 'quiz' ? progress : (existingProgress?.quiz_progress || 0);
      updateData.overall_progress = (videoProgress + quizProgress) / 2;
      updateData.is_lesson_completed = updateData.overall_progress >= 100;

      if (updateData.is_lesson_completed) {
        updateData.completed_at = new Date();
      }

      if (existingProgress) {
        await db('user_lesson_progress')
          .where({ user_id: userId, lesson_id: lessonId })
          .update(updateData);
      } else {
        await db('user_lesson_progress').insert({
          user_id: userId,
          lesson_id: lessonId,
          ...updateData,
          created_at: new Date()
        });
      }
    } catch (error) {
      console.error('Update lesson progress error:', error);
    }
  },

  // Get user's lesson progress
  async getLessonProgress(req, res) {
    try {
      const userId = req.user.userId;
      const { lessonId } = req.params;

      const progress = await db('user_lesson_progress')
        .where({ user_id: userId, lesson_id: lessonId })
        .first();

      res.json({
        success: true,
        data: { progress: progress || null }
      });
    } catch (error) {
      console.error('Get lesson progress error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch lesson progress'
      });
    }
  },

  // ============================================================================
  // QUIZ TRIGGERS - FR2: In-Lesson Quiz Integration
  // ============================================================================

  // Get all quiz triggers for a lesson (with timestamps for video player)
  async getQuizTriggers(req, res) {
    try {
      const { lessonId } = req.params;

      const triggers = await db('quiz_triggers as qt')
        .join('quiz_questions as qq', 'qt.question_id', 'qq.id')
        .where('qt.lesson_id', lessonId)
        .select(
          'qt.*',
          'qq.question_text',
          'qq.question_type',
          'qq.options',
          'qq.correct_answer',
          'qq.explanation',
          'qq.points'
        )
        .orderBy('qt.trigger_timestamp', 'asc');

      // Parse options JSON for each trigger
      const parsedTriggers = triggers.map(trigger => ({
        ...trigger,
        options: trigger.options ? JSON.parse(trigger.options) : null
      }));

      res.json({
        success: true,
        data: { triggers: parsedTriggers }
      });
    } catch (error) {
      console.error('Get quiz triggers error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch quiz triggers'
      });
    }
  },

  // Create a quiz trigger (teachers only)
  async createQuizTrigger(req, res) {
    try {
      const userId = req.user.userId;
      const { lessonId } = req.params;
      const {
        questionId,
        triggerTimestamp,
        isRequired = false,
        pauseVideo = true,
        durationSeconds = null,
        displayMode = 'overlay',
        minScoreToProceed = null
      } = req.body;

      // Verify the lesson belongs to the teacher
      const lesson = await db('lessons as l')
        .join('courses as c', 'l.course_id', 'c.id')
        .where({ 'l.id': lessonId, 'c.created_by': userId })
        .first();

      if (!lesson) {
        return res.status(404).json({
          success: false,
          message: 'Lesson not found or access denied'
        });
      }

      // Verify the question exists and belongs to this lesson
      const question = await db('quiz_questions')
        .where({ id: questionId, lesson_id: lessonId })
        .first();

      if (!question) {
        return res.status(404).json({
          success: false,
          message: 'Quiz question not found for this lesson'
        });
      }

      // Check if trigger already exists for this question
      const existingTrigger = await db('quiz_triggers')
        .where({ lesson_id: lessonId, question_id: questionId })
        .first();

      if (existingTrigger) {
        return res.status(400).json({
          success: false,
          message: 'A trigger already exists for this question. Please update or delete it first.'
        });
      }

      const [triggerId] = await db('quiz_triggers').insert({
        lesson_id: lessonId,
        question_id: questionId,
        trigger_timestamp: triggerTimestamp,
        is_required: isRequired,
        pause_video: pauseVideo,
        duration_seconds: durationSeconds,
        display_mode: displayMode,
        min_score_to_proceed: minScoreToProceed,
        created_by: userId,
        created_at: new Date(),
        updated_at: new Date()
      }).returning('id');

      res.status(201).json({
        success: true,
        message: 'Quiz trigger created successfully',
        data: { triggerId: triggerId.id || triggerId }
      });
    } catch (error) {
      console.error('Create quiz trigger error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create quiz trigger'
      });
    }
  },

  // Update a quiz trigger
  async updateQuizTrigger(req, res) {
    try {
      const userId = req.user.userId;
      const { triggerId } = req.params;
      const {
        triggerTimestamp,
        isRequired,
        pauseVideo,
        durationSeconds,
        displayMode,
        minScoreToProceed
      } = req.body;

      // Verify the trigger exists and user has permission
      const trigger = await db('quiz_triggers as qt')
        .join('lessons as l', 'qt.lesson_id', 'l.id')
        .join('courses as c', 'l.course_id', 'c.id')
        .where({ 'qt.id': triggerId, 'c.created_by': userId })
        .first();

      if (!trigger) {
        return res.status(404).json({
          success: false,
          message: 'Quiz trigger not found or access denied'
        });
      }

      const updateData = { updated_at: new Date() };
      if (triggerTimestamp !== undefined) updateData.trigger_timestamp = triggerTimestamp;
      if (isRequired !== undefined) updateData.is_required = isRequired;
      if (pauseVideo !== undefined) updateData.pause_video = pauseVideo;
      if (durationSeconds !== undefined) updateData.duration_seconds = durationSeconds;
      if (displayMode !== undefined) updateData.display_mode = displayMode;
      if (minScoreToProceed !== undefined) updateData.min_score_to_proceed = minScoreToProceed;

      await db('quiz_triggers')
        .where({ id: triggerId })
        .update(updateData);

      res.json({
        success: true,
        message: 'Quiz trigger updated successfully'
      });
    } catch (error) {
      console.error('Update quiz trigger error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update quiz trigger'
      });
    }
  },

  // Delete a quiz trigger
  async deleteQuizTrigger(req, res) {
    try {
      const userId = req.user.userId;
      const { triggerId } = req.params;

      // Verify the trigger exists and user has permission
      const trigger = await db('quiz_triggers as qt')
        .join('lessons as l', 'qt.lesson_id', 'l.id')
        .join('courses as c', 'l.course_id', 'c.id')
        .where({ 'qt.id': triggerId, 'c.created_by': userId })
        .first();

      if (!trigger) {
        return res.status(404).json({
          success: false,
          message: 'Quiz trigger not found or access denied'
        });
      }

      await db('quiz_triggers')
        .where({ id: triggerId })
        .delete();

      res.json({
        success: true,
        message: 'Quiz trigger deleted successfully'
      });
    } catch (error) {
      console.error('Delete quiz trigger error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete quiz trigger'
      });
    }
  }
};

module.exports = quizController;
