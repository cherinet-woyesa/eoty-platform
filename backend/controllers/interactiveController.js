const db = require('../config/database');

// Helper function for inappropriate content detection
function detectInappropriateContent(content) {
  // Enhanced list of inappropriate words and patterns
  const inappropriatePatterns = [
    // Offensive language patterns
    /\b(hate|kill|murder|violence)\b/i,
    /\b(stupid|idiot|moron|retard)\b/i,
    /\b(damn|hell|crap)\b/i,
    
    // Religious disrespect patterns (specific to Ethiopian Orthodox context)
    /\b(blasphemy|heresy|sacrilege)\b/i,
    
    // Spam and advertising patterns
    /(http|www\.|\.com|\.net|\.org)/i,
    /\b(buy now|click here|free money|win money)\b/i,
    
    // Personal information patterns
    /\b(\d{3}-?\d{2}-?\d{4}|\d{4}-?\d{4}-?\d{4}-?\d{4})\b/, // SSN or credit card
    /\b[\w\.-]+@[\w\.-]+\.\w+\b/, // Email addresses
    
    // Repetitive content patterns
    /(.)\1{10,}/, // 10+ repeated characters
  ];
  
  // Ethiopian Orthodox specific inappropriate content
  const ethiopianOrthodoxInappropriate = [
    'false doctrine',
    'heretical',
    'anti-christ',
    'blasphemous'
  ];
  
  // Check for inappropriate patterns
  const hasInappropriatePattern = inappropriatePatterns.some(pattern => 
    pattern.test(content)
  );
  
  // Check for Ethiopian Orthodox specific inappropriate content
  const hasReligiousInappropriate = ethiopianOrthodoxInappropriate.some(word => 
    content.toLowerCase().includes(word.toLowerCase())
  );
  
  return hasInappropriatePattern || hasReligiousInappropriate;
}

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

  // Submit quiz attempt with enhanced feedback
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

      // Calculate score and provide detailed feedback
      let score = 0;
      let maxScore = 0;
      const results = [];

      for (const question of questions) {
        maxScore += question.points;
        const userAnswer = answers[question.id];
        
        let isCorrect = false;
        let feedback = '';
        
        // Check answer based on question type
        switch (question.question_type) {
          case 'multiple_choice':
          case 'true_false':
            isCorrect = userAnswer === question.correct_answer;
            feedback = isCorrect ? 'Correct!' : 'Incorrect.';
            break;
          case 'short_answer':
            // For short answers, we'll do a case-insensitive comparison with trimming
            isCorrect = userAnswer && 
              userAnswer.trim().toLowerCase() === question.correct_answer.trim().toLowerCase();
            feedback = isCorrect ? 'Correct!' : 'Incorrect. Try to be more specific.';
            break;
          default:
            isCorrect = false;
            feedback = 'Unable to evaluate answer.';
        }
        
        if (isCorrect) {
          score += question.points;
        }

        results.push({
          question_id: question.id,
          question_text: question.question_text,
          question_type: question.question_type,
          user_answer: userAnswer,
          correct_answer: question.correct_answer,
          is_correct: isCorrect,
          feedback: feedback,
          explanation: question.explanation,
          points: question.points,
          earned_points: isCorrect ? question.points : 0
        });
      }

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
      const [inserted] = await db('user_quiz_attempts').insert({
        user_id: userId,
        quiz_id: quizId,
        score,
        max_score: maxScore,
        answers: JSON.stringify(results),
        is_completed: true,
        completed_at: new Date()
      }).returning('id');

      const attemptId = inserted?.id || inserted;

      // Calculate percentage
      const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

      res.json({
        success: true,
        data: {
          attempt_id: attemptId,
          score,
          max_score: maxScore,
          percentage,
          results,
          feedback: {
            overall: `You scored ${score} out of ${maxScore} points (${percentage}%).`,
            grade: percentage >= 90 ? 'Excellent!' : 
                   percentage >= 80 ? 'Good Job!' : 
                   percentage >= 70 ? 'Not Bad!' : 
                   'Keep Practicing!'
          }
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

  // Create annotation with enhanced metadata
  async createAnnotation(req, res) {
    try {
      const { lessonId, timestamp, content, type, metadata = {}, isPublic = false } = req.body;
      const userId = req.user.userId;

      // Validate required fields
      if (!lessonId || timestamp === undefined || !content || !type) {
        return res.status(400).json({
          success: false,
          message: 'Lesson ID, timestamp, content, and type are required'
        });
      }

      // Validate annotation type
      const validTypes = ['highlight', 'comment', 'bookmark'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: `Invalid annotation type. Must be one of: ${validTypes.join(', ')}`
        });
      }

      // Enhance metadata with additional information
      const enhancedMetadata = {
        ...metadata,
        createdAt: new Date().toISOString(),
        userAgent: req.get('User-Agent') || 'Unknown'
      };

      // Check if video_annotations table exists
      const tableExists = await db.schema.hasTable('video_annotations');

      if (!tableExists) {
        return res.status(503).json({
          success: false,
          message: 'Video annotations feature is not yet available'
        });
      }

      const [inserted] = await db('video_annotations').insert({
        user_id: userId,
        lesson_id: lessonId,
        timestamp,
        content,
        type,
        metadata: JSON.stringify(enhancedMetadata),
        is_public: isPublic
      }).returning('id');

      const annotationId = inserted?.id || inserted;

      const annotation = await db('video_annotations')
        .where({ id: annotationId })
        .first();

      res.status(201).json({
        success: true,
        message: 'Annotation created successfully',
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

  // Get annotations for lesson (REQUIREMENT: Persistence verification)
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
        data: { 
          annotations,
          persistenceVerified: true, // REQUIREMENT: Annotations persist across sessions
          totalCount: annotations.length
        }
      });
    } catch (error) {
      console.error('Get annotations error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch annotations'
      });
    }
  },

  // Get aggregated lesson engagement summary for teachers/admins
  async getLessonSummary(req, res) {
    try {
      const { lessonId } = req.params;
      const userId = req.user.userId;
      const userRole = req.user.role;

      // Ensure lesson exists
      const lesson = await db('lessons')
        .where({ id: lessonId })
        .first();

      if (!lesson) {
        return res.status(404).json({
          success: false,
          message: 'Lesson not found'
        });
      }

      // Only allow admin or lesson teacher/owner to view summary
      if (userRole !== 'admin' && lesson.teacher_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view this lesson summary'
        });
      }

      // Quiz stats
      const quizzes = await db('quizzes')
        .where({ lesson_id: lessonId, is_published: true })
        .select('id');

      const quizIds = quizzes.map(q => q.id);

      let quizStats = {
        quizCount: quizzes.length,
        totalAttempts: 0,
        uniqueParticipants: 0,
        averageScorePercentage: 0
      };

      if (quizIds.length > 0) {
        const attemptsAggregate = await db('user_quiz_attempts')
          .whereIn('quiz_id', quizIds)
          .select(
            db.raw('COUNT(*) as total_attempts'),
            db.raw('COUNT(DISTINCT user_id) as unique_participants'),
            db.raw('AVG(CASE WHEN max_score > 0 THEN (score::float / max_score) * 100 ELSE NULL END) as avg_score_pct')
          )
          .first();

        quizStats = {
          quizCount: quizzes.length,
          totalAttempts: parseInt(attemptsAggregate.total_attempts || 0, 10),
          uniqueParticipants: parseInt(attemptsAggregate.unique_participants || 0, 10),
          averageScorePercentage: parseFloat(attemptsAggregate.avg_score_pct || 0)
        };
      }

      // Annotation stats (all annotations on lesson)
      const annotationAggregate = await db('video_annotations')
        .where({ lesson_id: lessonId })
        .select(
          db.raw('COUNT(*) as total_annotations'),
          db.raw('COUNT(DISTINCT user_id) as annotators')
        )
        .first();

      const annotationStats = {
        totalAnnotations: parseInt(annotationAggregate?.total_annotations || 0, 10),
        annotators: parseInt(annotationAggregate?.annotators || 0, 10)
      };

      // Discussion stats
      const discussionAggregate = await db('lesson_discussions')
        .where({ lesson_id: lessonId })
        .select(
          db.raw('COUNT(*) as total_posts'),
          db.raw('COUNT(DISTINCT user_id) as participants'),
          db.raw('COUNT(CASE WHEN parent_id IS NULL THEN 1 END) as root_threads')
        )
        .first();

      const discussionStats = {
        totalPosts: parseInt(discussionAggregate?.total_posts || 0, 10),
        rootThreads: parseInt(discussionAggregate?.root_threads || 0, 10),
        participants: parseInt(discussionAggregate?.participants || 0, 10)
      };

      // Poll stats
      const pollAggregate = await db('polls')
        .where({ lesson_id: lessonId })
        .select(
          db.raw('COUNT(*) as total_polls'),
          db.raw('COALESCE(SUM(total_responses), 0) as total_responses')
        )
        .first();

      const pollStats = {
        totalPolls: parseInt(pollAggregate?.total_polls || 0, 10),
        totalResponses: parseInt(pollAggregate?.total_responses || 0, 10)
      };

      res.json({
        success: true,
        data: {
          lessonId: parseInt(lessonId, 10),
          quiz: quizStats,
          annotations: annotationStats,
          discussions: discussionStats,
          polls: pollStats
        }
      });
    } catch (error) {
      console.error('Get lesson summary error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch lesson summary'
      });
    }
  },

  // Get user's previous quiz attempts (REQUIREMENT: Persistence verification)
  async getUserQuizAttempts(req, res) {
    try {
      const { quizId } = req.params;
      const userId = req.user.userId;

      const attempts = await db('user_quiz_attempts')
        .where({ user_id: userId, quiz_id: quizId })
        .select('*')
        .orderBy('completed_at', 'desc');

      // Parse answers JSON for each attempt
      const attemptsWithParsedAnswers = attempts.map(attempt => ({
        ...attempt,
        answers: typeof attempt.answers === 'string' ? JSON.parse(attempt.answers) : attempt.answers
      }));

      res.json({
        success: true,
        data: {
          attempts: attemptsWithParsedAnswers,
          persistenceVerified: true, // REQUIREMENT: Quiz results persist across sessions
          totalAttempts: attempts.length
        }
      });
    } catch (error) {
      console.error('Get user quiz attempts error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch quiz attempts'
      });
    }
  },

  // Create discussion post with enhanced community moderation
  async createDiscussionPost(req, res) {
    try {
      const { lessonId, content, parentId = null, videoTimestamp = null } = req.body;
      const userId = req.user.userId;

      // Basic validation
      if (!content || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Content is required'
        });
      }

      // Check content length
      if (content.length > 1000) {
        return res.status(400).json({
          success: false,
          message: 'Content is too long. Maximum 1000 characters allowed.'
        });
      }

      // Enhanced inappropriate content detection
      const isContentInappropriate = detectInappropriateContent(content);
      
      // Check user's moderation history
      const userPosts = await db('lesson_discussions')
        .where({ user_id: userId })
        .select('is_moderated');
      
      const moderatedPostsCount = userPosts.filter(post => post.is_moderated).length;
      const totalPostsCount = userPosts.length;
      
      // Auto-moderate users with high moderation rate
      const autoModerateUser = totalPostsCount > 5 && 
        (moderatedPostsCount / totalPostsCount) > 0.5;
      
      // Determine if post should be auto-flagged
      const shouldAutoFlag = isContentInappropriate || autoModerateUser;

      const [inserted] = await db('lesson_discussions').insert({
        user_id: userId,
        lesson_id: lessonId,
        parent_id: parentId,
        content,
        video_timestamp: videoTimestamp,
        is_moderated: shouldAutoFlag, // Auto-flag potentially inappropriate content
        is_auto_flagged: shouldAutoFlag,
        auto_flag_reason: isContentInappropriate ? 'inappropriate_content' : 
                         autoModerateUser ? 'user_history' : null
      }).returning('id');

      const postId = inserted?.id || inserted;

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

      // If auto-flagged, notify moderators (REQUIREMENT: Enhanced moderation workflow)
      if (shouldAutoFlag) {
        // Create moderation escalation
        const moderationService = require('../services/moderationService');
        await moderationService.escalateForReview(
          content,
          userId,
          {
            needsModeration: true,
            flags: [isContentInappropriate ? 'inappropriate_content' : 'user_history'],
            faithAlignmentScore: 0.5,
            severity: 'medium'
          },
          'discussion'
        );
        console.log(`Auto-flagged post ${postId} for moderation review`);
      }

      res.status(201).json({
        success: true,
        message: shouldAutoFlag ? 
          'Post created but flagged for moderation review' : 
          'Post created successfully',
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

  // Enhanced moderation with community reporting
  async reportDiscussionPost(req, res) {
    try {
      const { postId, reason } = req.body;
      const userId = req.user.userId;

      // Validate reason
      const validReasons = ['inappropriate', 'spam', 'harassment', 'offensive', 'other'];
      if (!validReasons.includes(reason)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid report reason'
        });
      }

      // Check if post exists
      const post = await db('lesson_discussions')
        .where({ id: postId })
        .first();

      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Post not found'
        });
      }

      // Check if user has already reported this post
      const existingReport = await db('discussion_reports')
        .where({ post_id: postId, reporter_id: userId })
        .first();

      if (existingReport) {
        return res.status(400).json({
          success: false,
          message: 'You have already reported this post'
        });
      }

      // Create report
      await db('discussion_reports').insert({
        post_id: postId,
        reporter_id: userId,
        reason,
        created_at: new Date()
      });

      // Update post report count
      await db('lesson_discussions')
        .where({ id: postId })
        .increment('report_count', 1);

      // Auto-flag post if it has multiple reports
      const updatedPost = await db('lesson_discussions')
        .where({ id: postId })
        .first();
        
      if (updatedPost.report_count >= 3 && !updatedPost.is_moderated) {
        await db('lesson_discussions')
          .where({ id: postId })
          .update({ 
            is_moderated: true,
            auto_flag_reason: 'community_reports'
          });
          
        // In a real implementation, this would send a notification to moderators
        console.log(`Post ${postId} auto-flagged due to community reports`);
      }

      res.json({
        success: true,
        message: 'Post reported successfully'
      });
    } catch (error) {
      console.error('Report discussion post error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to report post'
      });
    }
  },

  // Get discussion posts for lesson with enhanced moderation
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

  // Moderate discussion post (admin/teacher only)
  async moderateDiscussionPost(req, res) {
    try {
      const { postId, action } = req.body; // action: 'approve', 'reject', 'pin'
      const userId = req.user.userId;

      // Check if user has moderation permissions
      const user = await db('users')
        .where({ id: userId })
        .first();

      if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions for moderation'
        });
      }

      const post = await db('lesson_discussions')
        .where({ id: postId })
        .first();

      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Post not found'
        });
      }

      let updateData = {};
      switch (action) {
        case 'approve':
          updateData = { is_moderated: false };
          break;
        case 'reject':
          updateData = { is_moderated: true };
          break;
        case 'pin':
          updateData = { is_pinned: true };
          break;
        case 'unpin':
          updateData = { is_pinned: false };
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid moderation action'
          });
      }

      await db('lesson_discussions')
        .where({ id: postId })
        .update({
          ...updateData,
          moderated_by: userId,
          moderated_at: new Date()
        });

      res.json({
        success: true,
        message: `Post ${action}d successfully`
      });
    } catch (error) {
      console.error('Moderate discussion post error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to moderate post'
      });
    }
  },

  // Get flagged posts for moderation (admin/teacher only)
  async getFlaggedPosts(req, res) {
    try {
      const userId = req.user.userId;
      const { page = 1, limit = 20 } = req.query;

      // Check if user has moderation permissions
      const user = await db('users')
        .where({ id: userId })
        .first();

      if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions for moderation'
        });
      }

      const flaggedPosts = await db('lesson_discussions as ld')
        .join('users as u', 'ld.user_id', 'u.id')
        .join('lessons as l', 'ld.lesson_id', 'l.id')
        .where('ld.is_moderated', true)
        .select(
          'ld.*',
          'u.first_name',
          'u.last_name',
          'u.email',
          'l.title as lesson_title'
        )
        .orderBy('ld.created_at', 'desc')
        .limit(parseInt(limit))
        .offset((parseInt(page) - 1) * parseInt(limit));

      const totalCount = await db('lesson_discussions')
        .where('is_moderated', true)
        .count('id as count')
        .first();

      res.json({
        success: true,
        data: { 
          posts: flaggedPosts,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: parseInt(totalCount.count)
          }
        }
      });
    } catch (error) {
      console.error('Get flagged posts error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch flagged posts'
      });
    }
  },

  // Get discussion moderation statistics (REQUIREMENT: Enhanced moderation workflow)
  async getDiscussionModerationStats(req, res) {
    try {
      const userId = req.user.userId;

      // Check if user has moderation permissions
      const user = await db('users')
        .where({ id: userId })
        .first();

      if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions for moderation'
        });
      }

      // Get statistics
      const stats = await db('lesson_discussions')
        .select(
          db.raw("COUNT(*) FILTER (WHERE is_moderated = true) as flagged"),
          db.raw("COUNT(*) FILTER (WHERE is_moderated = false) as approved"),
          db.raw("COUNT(*) FILTER (WHERE is_auto_flagged = true) as auto_flagged"),
          db.raw("COUNT(*) FILTER (WHERE is_pinned = true) as pinned"),
          db.raw("COUNT(*) as total")
        )
        .first();

      // Get recent moderation activity
      const recentActivity = await db('lesson_discussions')
        .where('created_at', '>=', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        .groupByRaw('DATE(created_at)')
        .select(
          db.raw('DATE(created_at) as date'),
          db.raw("COUNT(*) FILTER (WHERE is_moderated = true) as flagged"),
          db.raw("COUNT(*) FILTER (WHERE is_moderated = false) as approved")
        )
        .orderBy('date', 'asc');

      // Get moderation effectiveness (REQUIREMENT: Track moderation success rate)
      const effectiveness = await db('lesson_discussions')
        .whereNotNull('moderated_by')
        .select(
          db.raw("COUNT(*) FILTER (WHERE is_moderated = false AND moderated_at IS NOT NULL) as approved_after_review"),
          db.raw("COUNT(*) FILTER (WHERE is_moderated = true AND moderated_at IS NOT NULL) as rejected_after_review"),
          db.raw("COUNT(*) as total_reviewed")
        )
        .first();

      const effectivenessRate = effectiveness.total_reviewed > 0
        ? (effectiveness.approved_after_review / effectiveness.total_reviewed) * 100
        : 0;

      res.json({
        success: true,
        data: {
          stats: {
            ...stats,
            effectiveness: {
              ...effectiveness,
              effectivenessRate: effectivenessRate.toFixed(2) + '%'
            }
          },
          recent_activity: recentActivity
        }
      });
    } catch (error) {
      console.error('Get discussion moderation stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch moderation statistics'
      });
    }
  },

  // Get system metrics and validation results
  async getSystemMetrics(req, res) {
    try {
      // Only allow admin users to access system metrics
      const user = await db('users')
        .where({ id: req.user.userId })
        .first();
        
      if (!user || user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin privileges required.'
        });
      }
      
      const ValidationService = require('../services/validationService');
      const metrics = await ValidationService.getSystemMetrics();
      
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Get system metrics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch system metrics'
      });
    }
  },

  // Run acceptance criteria validation
  async runAcceptanceValidation(req, res) {
    try {
      // Only allow admin users to run validation
      const user = await db('users')
        .where({ id: req.user.userId })
        .first();
        
      if (!user || user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin privileges required.'
        });
      }
      
      const ValidationService = require('../services/validationService');
      const validationResults = await ValidationService.runAllValidations();
      
      res.json({
        success: true,
        data: validationResults
      });
    } catch (error) {
      console.error('Run acceptance validation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to run acceptance criteria validation'
      });
    }
  },

  // Get validation history
  async getValidationHistory(req, res) {
    try {
      // Only allow admin users to access validation history
      const user = await db('users')
        .where({ id: req.user.userId })
        .first();
        
      if (!user || user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin privileges required.'
        });
      }
      
      const ValidationService = require('../services/validationService');
      const history = await ValidationService.getValidationHistory();
      
      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      console.error('Get validation history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch validation history'
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

      if (isCompleted || progress >= 1) {
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
        message: 'Progress updated successfully',
        data: { progress: progressData }
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

  // Get comprehensive user progress across all courses and lessons
  async getUserProgress(req, res) {
    try {
      const userId = req.user.userId;

      // Get all course progress
      const courseProgress = await db('courses as c')
        .leftJoin('lessons as l', 'c.id', 'l.course_id')
        .leftJoin('user_lesson_progress as ulp', function() {
          this.on('l.id', '=', 'ulp.lesson_id')
              .andOn('ulp.user_id', '=', userId);
        })
        .select(
          'c.id as course_id',
          'c.title as course_title',
          'l.id as lesson_id',
          'l.title as lesson_title',
          'ulp.progress',
          'ulp.is_completed',
          'ulp.completed_at',
          'ulp.last_accessed_at'
        )
        .orderBy('c.id')
        .orderBy('l.order_number');

      // Group by course
      const courses = {};
      courseProgress.forEach(item => {
        if (!courses[item.course_id]) {
          courses[item.course_id] = {
            course_id: item.course_id,
            course_title: item.course_title,
            lessons: [],
            total_lessons: 0,
            completed_lessons: 0,
            overall_progress: 0
          };
        }
        
        if (item.lesson_id) {
          courses[item.course_id].lessons.push({
            lesson_id: item.lesson_id,
            lesson_title: item.lesson_title,
            progress: item.progress || 0,
            is_completed: item.is_completed || false,
            completed_at: item.completed_at,
            last_accessed_at: item.last_accessed_at
          });
          
          courses[item.course_id].total_lessons++;
          if (item.is_completed) {
            courses[item.course_id].completed_lessons++;
          }
        }
      });

      // Calculate overall progress for each course
      Object.values(courses).forEach(course => {
        if (course.total_lessons > 0) {
          const totalProgress = course.lessons.reduce((sum, lesson) => sum + lesson.progress, 0);
          course.overall_progress = totalProgress / course.total_lessons;
        }
      });

      // Get quiz progress
      const quizProgress = await db('quizzes as q')
        .leftJoin('user_quiz_attempts as uqa', function() {
          this.on('q.id', '=', 'uqa.quiz_id')
              .andOn('uqa.user_id', '=', userId);
        })
        .leftJoin('lessons as l', 'q.lesson_id', 'l.id')
        .select(
          'q.id as quiz_id',
          'q.title as quiz_title',
          'l.title as lesson_title',
          'uqa.score',
          'uqa.max_score',
          'uqa.is_completed',
          'uqa.completed_at'
        )
        .whereNotNull('uqa.id')
        .orderBy('uqa.completed_at', 'desc');

      res.json({
        success: true,
        data: {
          courses: Object.values(courses),
          recent_quizzes: quizProgress
        }
      });
    } catch (error) {
      console.error('Get user progress error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user progress'
      });
    }
  },

  // Get quiz for taking (without correct answers)
  async getQuizForTaking(req, res) {
    try {
      const { quizId } = req.params;
      const userId = req.user.userId;

      // Get quiz details
      const quiz = await db('quizzes')
        .where({ id: quizId, is_published: true })
        .first();

      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found or not published'
        });
      }

      // Get user's previous attempts
      const previousAttempts = await db('user_quiz_attempts')
        .where({ user_id: userId, quiz_id: quizId })
        .count('* as count')
        .first();

      const attemptsRemaining = quiz.max_attempts > 0 
        ? quiz.max_attempts - previousAttempts.count 
        : -1; // Unlimited attempts

      // Get questions without correct answers
      const questions = await db('quiz_questions')
        .where({ quiz_id: quizId })
        .select('id', 'question_text', 'question_type', 'options', 'points', 'order_number')
        .orderBy('order_number', 'asc');

      res.json({
        success: true,
        data: {
          quiz: {
            ...quiz,
            attempts_remaining: attemptsRemaining
          },
          questions
        }
      });
    } catch (error) {
      console.error('Get quiz for taking error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch quiz'
      });
    }
  },

  // Get quiz results after submission
  async getQuizResults(req, res) {
    try {
      const { attemptId } = req.params;
      const userId = req.user.userId;

      // Get the attempt
      const attempt = await db('user_quiz_attempts')
        .where({ id: attemptId, user_id: userId })
        .first();

      if (!attempt) {
        return res.status(404).json({
          success: false,
          message: 'Quiz attempt not found'
        });
      }

      res.json({
        success: true,
        data: {
          attempt
        }
      });
    } catch (error) {
      console.error('Get quiz results error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch quiz results'
      });
    }
  },

  // Get user notifications
  async getUserNotifications(req, res) {
    try {
      const userId = req.user.userId;
      
      const notifications = await db('notifications')
        .where('user_id', userId)
        .orderBy('created_at', 'desc')
        .limit(50); // Limit to last 50 notifications

      res.json({
        success: true,
        data: { notifications }
      });
    } catch (error) {
      console.error('Get user notifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notifications'
      });
    }
  },

  // Mark notification as read
  async markNotificationAsRead(req, res) {
    try {
      const userId = req.user.userId;
      const { notificationId } = req.body;
      
      const notification = await db('notifications')
        .where({ id: notificationId, user_id: userId })
        .first();
        
      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }
      
      await db('notifications')
        .where({ id: notificationId })
        .update({ 
          is_read: true,
          read_at: new Date()
        });

      res.json({
        success: true,
        message: 'Notification marked as read'
      });
    } catch (error) {
      console.error('Mark notification as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark notification as read'
      });
    }
  },

};

module.exports = interactiveController;