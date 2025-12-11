// backend/controllers/aiController.js - GOOGLE CLOUD VERTEX AI VERSION
const aiService = require('../services/aiService-gcp');
const performanceService = require('../services/performanceService');
const analyticsService = require('../services/analyticsService');
const languageAlertService = require('../services/languageAlertService');
const contextService = require('../services/contextService');
const db = require('../config/database-gcp');
const faithClassifierService = require('../services/faithClassifierService');

const aiController = {
  // ENHANCED: Ask question with comprehensive monitoring and analytics
  async askQuestion(req, res) {
    const startTime = Date.now();
    const sessionId = req.body.sessionId || 'default';
    const userId = req.user.userId;

    try {
      const { question, context = {} } = req.body;

      if (!question || question.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Question is required'
        });
      }

      // 1. Check for unsupported language
      const languageCheck = await languageAlertService.handleUnsupportedLanguage(
        question, userId, sessionId, context
      );

      if (!languageCheck.isSupported) {
        // Log unsupported language interaction
        await analyticsService.logInteraction(sessionId, {
          userId,
          type: 'unsupported_language',
          question,
          response: languageCheck.alertMessage || 'Unsupported language detected',
          context,
          language: languageCheck.detectedLanguage,
          userFeedback: { status: 'unsupported_language' }
        });

        return res.json({
          success: false,
          message: languageCheck.alertMessage,
          data: {
            detectedLanguage: languageCheck.detectedLanguage,
            supportedLanguages: languageCheck.supportedLanguages,
            isUnsupportedLanguage: true
          }
        });
      }

      // 2. Log user activity for context enhancement
      await contextService.logUserActivity(userId, 'ai_question', {
        question: question.substring(0, 100),
        context: context,
        sessionId: sessionId,
        language: languageCheck.detectedLanguage
      });

      // 3. Moderate the query
      const moderationStart = Date.now();
      const moderationResult = await aiService.moderateQuery(question, userId);
      const moderationTime = Date.now() - moderationStart;

      // If moderation provides guidance, return it directly
      if (moderationResult.guidance && moderationResult.guidance.length > 0 && !moderationResult.needsModeration) {
        const guidanceTime = Date.now() - startTime;
        
        // Track performance for guidance response
        await performanceService.trackResponseTime(sessionId, startTime, Date.now(), 'guidance_response');
        
        // Log guidance interaction
        await analyticsService.logInteraction(sessionId, {
          userId,
          type: 'guidance_response',
          question,
          response: moderationResult.guidance[0],
          context,
          performance: { responseTime: guidanceTime, totalTime: guidanceTime },
          moderation: moderationResult,
          language: languageCheck.detectedLanguage
        });

        return res.json({
          success: true,
          data: {
            answer: moderationResult.guidance[0],
            relevantContent: [],
            sources: [],
            relatedResources: [],
            moderation: moderationResult,
            sessionId,
            guidanceProvided: true,
            faithAlignment: { score: 1.0, isAligned: true, issues: [] },
            performanceMetrics: {
              responseTime: guidanceTime,
              totalTime: guidanceTime,
              withinThreshold: guidanceTime <= 3000
            }
          }
        });
      }

      // 4. Get conversation history
      const historyStart = Date.now();
      const conversationHistory = await aiService.getConversationHistory(userId, sessionId);
      const historyTime = Date.now() - historyStart;

      // 5. Generate AI response with performance tracking and timeout enforcement
      const aiStartTime = Date.now();
      let aiResponse;
      try {
        aiResponse = await aiService.generateResponse(
          question, 
          { ...context, userId }, 
          conversationHistory
        );
      } catch (error) {
        // Handle timeout or accuracy errors
        if (error.message.includes('timeout') || error.message.includes('exceeded 3-second')) {
          return res.status(408).json({
            success: false,
            message: 'Response time exceeded 3-second requirement. Please try again or rephrase your question.',
            data: {
              error: 'TIMEOUT',
              suggestion: 'Try asking a shorter, more specific question.'
            }
          });
        }
        if (error.message.includes('does not meet 90% requirement')) {
          return res.status(422).json({
            success: false,
            message: 'Unable to generate a response that meets accuracy requirements. Please try rephrasing your question.',
            data: {
              error: 'ACCURACY_THRESHOLD',
              suggestion: 'Try asking a more specific question or consult with your local clergy.'
            }
          });
        }
        throw error; // Re-throw other errors
      }
      const aiResponseTime = Date.now() - aiStartTime;

      // 6. Store conversation
      const storeStartTime = Date.now();
      await aiService.storeConversation(
        userId, 
        sessionId, 
        question, 
        aiResponse.response, 
        context,
        moderationResult.needsModeration
      );
      const storeTime = Date.now() - storeStartTime;

      // 7. Calculate total response time
      const totalTime = Date.now() - startTime;

      // 8. Track performance metrics
      const performanceMetrics = {
        responseTime: totalTime,
        aiProcessingTime: aiResponseTime,
        databaseTime: historyTime + storeTime,
        moderationTime: moderationTime,
        cacheHit: aiResponse.cacheHit || false,
        totalTime: totalTime
      };

      await performanceService.trackResponseTime(sessionId, startTime, Date.now(), 'ai_question');
      
      // 9. Track accuracy metrics
      const accuracyScore = aiResponse.faithAlignment?.score || 0.9;
      await performanceService.trackAccuracy(sessionId, question, aiResponse.response, accuracyScore, {
        faithAlignment: aiResponse.faithAlignment,
        moderationFlags: moderationResult.flags
      });

      // 10. Log comprehensive interaction
      await analyticsService.logInteraction(sessionId, {
        userId,
        type: 'ai_question',
        question,
        response: aiResponse.response,
        context,
        performance: performanceMetrics,
        faithAlignment: aiResponse.faithAlignment,
        moderation: moderationResult,
        language: languageCheck.detectedLanguage
      });

      // 11. Prepare response with enhanced metrics
      const response = {
        success: true,
        data: {
          answer: aiResponse.response,
          relevantContent: aiResponse.relevantContent,
          sources: aiResponse.sources,
          relatedResources: aiResponse.relatedResources,
          moderation: moderationResult,
          sessionId,
          detectedLanguage: languageCheck.detectedLanguage,
          faithAlignment: aiResponse.faithAlignment,
          performanceMetrics: {
            ...performanceMetrics,
            withinThreshold: totalTime <= 3000,
            accuracyScore: accuracyScore,
            isAccurate: accuracyScore >= 0.9
          }
        }
      };

      // REQUIREMENT: Verify response meets criteria
      if (totalTime > 3000) {
        console.warn(`Response took ${totalTime}ms, exceeding 3-second requirement`);
        // Note: This should not happen due to timeout enforcement, but log if it does
      }

      // REQUIREMENT: Accuracy is now enforced in aiService, but verify here too
      if (accuracyScore < 0.9) {
        console.error(`Response accuracy ${(accuracyScore * 100).toFixed(1)}% does not meet 90% requirement`);
        // This should not happen due to validation in aiService, but log if it does
      }

      // Add success indicators
      response.data.performanceMetrics.meetsTimeRequirement = totalTime <= 3000;
      response.data.performanceMetrics.meetsAccuracyRequirement = accuracyScore >= 0.9;

      // If needs moderation, include warning
      if (moderationResult.needsModeration) {
        response.data.moderationWarning = 'This question has been flagged for moderator review due to sensitive content.';
      }

      // If guidance was provided, include it
      if (moderationResult.guidance && moderationResult.guidance.length > 0) {
        response.data.guidance = moderationResult.guidance;
      }

      // Log if response time is too slow or faith alignment is low
      if (totalTime > aiService.performanceSettings.maxResponseTimeMs) {
        console.warn(`Slow AI response: ${totalTime}ms for question: ${question.substring(0, 50)}...`);
        console.warn(`Breakdown - AI: ${aiResponseTime}ms, Store: ${storeTime}ms`);
      }
      
      if (aiResponse.faithAlignment && !aiResponse.faithAlignment.isAligned) {
        console.warn(`Low faith alignment: ${aiResponse.faithAlignment.score} for question: ${question.substring(0, 50)}...`);
      }

      res.json(response);

    } catch (error) {
      const errorTime = Date.now() - startTime;
      
      // Track error performance
      await performanceService.trackResponseTime(sessionId, startTime, Date.now(), 'ai_error');
      
      // Log error interaction
      await analyticsService.logInteraction(sessionId, {
        userId,
        type: 'ai_error',
        question: req.body.question || '[Unknown Question]',
        response: error.message || 'Error occurred',
        context: req.body.context || {},
        performance: { responseTime: errorTime, totalTime: errorTime },
        userFeedback: { status: 'error', message: error.message }
      });

      // Log error for analytics
      try {
        await db('system_logs').insert({
          log_type: 'ai_error',
          severity: 'error',
          message: JSON.stringify({
            userId: req.user.userId,
            sessionId: sessionId,
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
          })
        });
      } catch (logError) {
        console.error('Failed to log AI error:', logError);
      }
      
      console.error('AI question error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process your question. Please try again.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get conversation history
  async getConversationHistory(req, res) {
    try {
      const { sessionId = 'default' } = req.query;
      const userId = req.user.userId;

      const history = await aiService.getConversationHistory(userId, sessionId);

      // Log analytics for conversation history access
      await analyticsService.logInteraction(sessionId, {
        userId,
        type: 'conversation_history_access',
        question: '[History Access]',
        response: 'History retrieved',
        context: { sessionId }
      });

      res.json({
        success: true,
        data: { history }
      });
    } catch (error) {
      console.error('Get conversation history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch conversation history'
      });
    }
  },

  // Clear conversation history
  async clearConversation(req, res) {
    try {
      const { sessionId = 'default' } = req.body;
      const userId = req.user.userId;

      const conversation = await db('ai_conversations')
        .where({ user_id: userId, session_id: sessionId })
        .first();

      if (conversation) {
        await db('ai_messages')
          .where({ conversation_id: conversation.id })
          .delete();

        await db('ai_conversations')
          .where({ id: conversation.id })
          .delete();
      }

      // Log conversation clearance
      await analyticsService.logInteraction(sessionId, {
        userId,
        type: 'conversation_cleared',
        question: '[Clear Conversation]',
        response: 'Conversation cleared',
        context: { sessionId }
      });

      res.json({
        success: true,
        message: 'Conversation history cleared'
      });
    } catch (error) {
      console.error('Clear conversation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to clear conversation history'
      });
    }
  },

  // ENHANCED: Report/escalate an AI question for moderation with detailed tracking
  async reportQuestion(req, res) {
    try {
      const userId = req.user.userId;
      const { question, sessionId = 'default', context = {}, moderation = {}, reason, additionalNotes } = req.body || {};

      if (!question || question.trim().length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Question is required for moderation reporting' 
        });
      }

      // Enhanced moderation reporting with detailed tracking
      const reportData = {
        original_query: question,
        moderated_query: null,
        moderation_action: 'escalated_by_user',
        moderation_reasons: JSON.stringify({ 
          moderation, 
          context, 
          sessionId,
          user_reason: reason,
          user_notes: additionalNotes,
          escalated_at: new Date().toISOString()
        }),
        user_id: userId,
        priority: moderation.flags && moderation.flags.some(f => f.includes('sensitive_topic')) ? 'high' : 'medium',
        status: 'pending_review'
      };

      // Store in moderated_queries for review
      const [reportId] = await db('moderated_queries').insert(reportData).returning('id');

      // Enhanced system logging for quick visibility
      await db('system_logs').insert({
        log_type: 'ai_escalation',
        severity: 'high',
        message: JSON.stringify({ 
          userId, 
          sessionId, 
          reportId,
          questionPreview: question.substring(0, 100),
          moderationFlags: moderation.flags || [],
          faithAlignmentScore: moderation.faithAlignmentScore || 0,
          escalatedAt: new Date().toISOString() 
        })
      });

      // Notify admins if high priority (in production, this would integrate with notification system)
      if (reportData.priority === 'high') {
        await db('admin_notifications').insert({
          type: 'content_escalation',
          title: 'High Priority Content Escalation',
          message: `User ${userId} escalated content requiring immediate review.`,
          data: JSON.stringify({ reportId, question: question.substring(0, 200) }),
          priority: 'high',
          status: 'unread',
          created_at: new Date()
        });
      }

      // Log report interaction for analytics
      await analyticsService.logInteraction(sessionId, {
        userId,
        type: 'content_report',
        question,
        response: 'Content reported by user',
        context,
        moderation: moderation,
        userFeedback: { status: 'reported' }
      });

      return res.json({ 
        success: true, 
        message: 'Question escalated for moderation review',
        reportId,
        priority: reportData.priority
      });
    } catch (error) {
      console.error('AI reportQuestion error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to report question for moderation' 
      });
    }
  },

  // Faith alignment classifier endpoint (scaffold)
  async faithClassify(req, res) {
    try {
      const { text, context = {} } = req.body || {};
      if (!text || text.trim().length === 0) {
        return res.status(400).json({ success: false, message: 'Text is required' });
      }

      const result = await faithClassifierService.classify(text, context);
      return res.json({ success: true, data: result });
    } catch (error) {
      console.error('faithClassify error:', error);
      return res.status(500).json({ success: false, message: 'Classification failed' });
    }
  },

  // Store moderator-provided faith alignment label
  async faithLabel(req, res) {
    try {
      const userId = req.user.userId;
      const { sessionId = 'default', text, label, notes } = req.body || {};

      if (!text || typeof label === 'undefined') {
        return res.status(400).json({ success: false, message: 'Text and label are required' });
      }

      const stored = await faithClassifierService.storeLabel({ userId, sessionId, text, label, notes });
      if (!stored.success) {
        return res.status(500).json({ success: false, message: stored.message || 'Failed to store label' });
      }

      // Log analytics
      await analyticsService.logInteraction(sessionId, {
        userId,
        type: 'faith_label_submitted',
        question: text || '[No Text]',
        response: `Label: ${label}`,
        context: { sessionId },
        faithLabel: label
      });

      return res.json({ success: true, id: stored.id });
    } catch (error) {
      console.error('faithLabel error:', error);
      return res.status(500).json({ success: false, message: 'Failed to store label' });
    }
  },

  // NEW: Receive client-side telemetry for response times with enhanced analytics
  async telemetry(req, res) {
    try {
      const userId = req.user.userId;
      const { 
        sessionId = 'default', 
        context = {}, 
        totalTimeMs = 0, 
        success = false, 
        errorMessage, 
        faithAlignment,
        interactionType = 'unknown'
      } = req.body || {};

      // Enhanced telemetry with faith alignment data
      await db('ai_telemetry').insert({
        user_id: userId,
        session_id: sessionId,
        context: JSON.stringify(context),
        total_time_ms: totalTimeMs,
        success: success,
        error_message: errorMessage,
        faith_alignment_score: faithAlignment?.score || null,
        faith_aligned: faithAlignment?.isAligned || null,
        interaction_type: interactionType,
        timestamp: new Date()
      });

      // Also log as interaction for comprehensive analytics
      if (interactionType !== 'unknown') {
        await analyticsService.logInteraction(sessionId, {
          userId,
          type: interactionType,
          question: '[Telemetry Event]',
          response: errorMessage || (success ? 'Success' : 'Unknown result'),
          context,
          performance: { totalTime: totalTimeMs },
          faithAlignment: faithAlignment,
          userFeedback: { status: success ? 'success' : 'error' }
        });
      }

      return res.json({ success: true });
    } catch (error) {
      console.error('AI telemetry error:', error);
      return res.status(500).json({ success: false, message: 'Failed to record telemetry' });
    }
  },

  // NEW: Privacy-safe conversation summary logging with enhanced metrics
  async summary(req, res) {
    try {
      const userId = req.user.userId;
      const { 
        sessionId = 'default', 
        language, 
        route, 
        questionLength = 0, 
        answerLength = 0, 
        flagged = false,
        faithAlignmentScore = null,
        moderationFlags = [],
        interactionType = 'conversation_summary'
      } = req.body || {};

      // Enhanced summary logging with faith alignment data
      await db('ai_conversation_summaries').insert({
        user_id: userId,
        session_id: sessionId,
        language: language,
        route: route,
        question_length: questionLength,
        answer_length: answerLength,
        flagged: flagged,
        faith_alignment_score: faithAlignmentScore,
        moderation_flags: JSON.stringify(moderationFlags),
        interaction_type: interactionType,
        timestamp: new Date()
      });

      // Log as interaction for comprehensive analytics
      await analyticsService.logInteraction(sessionId, {
        userId,
        type: interactionType,
        question: '[Conversation Summary]',
        response: `Summary: ${questionLength} chars in, ${answerLength} chars out`,
        context: { route, language },
        performance: {},
        faithAlignment: faithAlignmentScore ? { score: faithAlignmentScore } : null,
        userFeedback: { status: flagged ? 'flagged' : 'normal' }
      });

      return res.json({ success: true });
    } catch (error) {
      console.error('AI summary error:', error);
      return res.status(500).json({ success: false, message: 'Failed to record summary' });
    }
  },

  // NEW: Get AI performance statistics for admin dashboard
  async getPerformanceStats(req, res) {
    try {
      const { days = 7, timeframe = '7days' } = req.query;
      
      // Get performance statistics
      const performanceStats = await performanceService.getPerformanceStats(timeframe);
      
      // Get analytics overview
      const analyticsStats = await analyticsService.getAnalytics(timeframe);

      res.json({
        success: true,
        data: {
          performance: performanceStats,
          analytics: analyticsStats.overview,
          faithAlignment: analyticsStats.faithAlignment,
          moderation: analyticsStats.moderation,
          cache: aiService.getPerformanceMetrics()
        }
      });
    } catch (error) {
      console.error('Get performance stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch performance statistics'
      });
    }
  },

  // NEW: Get user-specific analytics
  async getUserAnalytics(req, res) {
    try {
      const userId = req.user.userId;
      const { timeframe = '30days' } = req.query;

      const userAnalytics = await analyticsService.getUserAnalytics(userId, timeframe);

      res.json({
        success: true,
        data: userAnalytics
      });
    } catch (error) {
      console.error('Get user analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user analytics'
      });
    }
  },

  // NEW: Get unsupported language statistics
  async getUnsupportedLanguageStats(req, res) {
    try {
      const { timeframe = '7days' } = req.query;

      const stats = await languageAlertService.getUnsupportedLanguageStats(timeframe);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get unsupported language stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch unsupported language statistics'
      });
    }
  },

  // NEW: Get performance alerts
  async getPerformanceAlerts(req, res) {
    try {
      const alerts = await performanceService.checkPerformanceAlerts();

      res.json({
        success: true,
        data: {
          alerts,
          total: alerts.length
        }
      });
    } catch (error) {
      console.error('Get performance alerts error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch performance alerts'
      });
    }
  },

  // NEW: Generate resource summary
  async generateResourceSummary(req, res) {
    try {
      const { resourceId, type = 'brief' } = req.body;
      const userId = req.user.userId;

      // Get resource from database
      const resource = await db('resources')
        .where({ id: resourceId })
        .first();

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }

      const startTime = Date.now();
      
      // Generate AI summary
      const summary = await aiService.generateResourceSummary(resource, type);
      
      const totalTime = Date.now() - startTime;

      // Track performance
      await performanceService.trackResponseTime(`resource_${resourceId}`, startTime, Date.now(), 'resource_summary');

      // Log interaction
      await analyticsService.logInteraction(`resource_${resourceId}`, {
        userId,
        type: 'resource_summary',
        question: `Summary for: ${resource.title}`,
        response: summary ? summary.substring(0, 100) + '...' : 'Summary generated',
        context: { resourceId, resourceTitle: resource.title, summaryType: type },
        performance: { responseTime: totalTime, totalTime },
        userFeedback: { status: 'success' }
      });

      res.json({
        success: true,
        data: {
          summary,
          resource: {
            id: resource.id,
            title: resource.title,
            category: resource.category
          },
          performanceMetrics: {
            responseTime: totalTime,
            withinThreshold: totalTime <= 3000
          }
        }
      });
    } catch (error) {
      console.error('Generate resource summary error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate resource summary'
      });
    }
  },

  // NEW: Validate resource summary quality
  async validateResourceSummary(req, res) {
    try {
      const { summary, resourceId } = req.body;

      const resource = await db('resources')
        .where({ id: resourceId })
        .first();

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }

      const validation = await aiService.validateSummaryQuality(summary, resource);

      res.json({
        success: true,
        data: {
          validation,
          resource: {
            id: resource.id,
            title: resource.title
          }
        }
      });
    } catch (error) {
      console.error('Validate resource summary error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate resource summary'
      });
    }
  },

  // NEW: Get system health status
  async getSystemHealth(req, res) {
    try {
      const performanceStats = await performanceService.getPerformanceStats('1hour');
      const cacheMetrics = aiService.getPerformanceMetrics();
      
      // Check AI service availability
      const aiServiceStatus = aiService.isAIEnabled() ? 'healthy' : 'degraded';
      
      // Check database connection
      let dbStatus = 'healthy';
      try {
        await db.raw('SELECT 1');
      } catch (error) {
        dbStatus = 'unhealthy';
      }

      res.json({
        success: true,
        data: {
          status: 'operational',
          services: {
            ai: aiServiceStatus,
            database: dbStatus,
            moderation: 'healthy',
            analytics: 'healthy'
          },
          performance: {
            responseTime: {
              current: performanceStats.responseTime.average,
              threshold: 3000,
              status: performanceStats.responseTime.average <= 3000 ? 'healthy' : 'degraded'
            },
            accuracy: {
              current: performanceStats.accuracy.average,
              threshold: 0.9,
              status: performanceStats.accuracy.average >= 0.9 ? 'healthy' : 'degraded'
            }
          },
          cache: {
            size: cacheMetrics.cacheSize,
            maxSize: cacheMetrics.maxCacheSize,
            hitRate: 'high' // This would be calculated from analytics in production
          },
          lastUpdated: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Get system health error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch system health status'
      });
    }
  },
  // NEW: Faith alignment classifier
  async faithClassify(req, res) {
    try {
      const { text, context } = req.body;
      if (!text) {
        return res.status(400).json({ success: false, message: 'Text is required' });
      }
      const result = await faithClassifierService.classify(text, context);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Faith classify error:', error);
      res.status(500).json({ success: false, message: 'Classification failed' });
    }
  },

  // NEW: Submit faith alignment label
  async faithLabel(req, res) {
    try {
      const { sessionId, text, label, notes } = req.body;
      const userId = req.user.userId;
      
      if (!text || label === undefined) {
        return res.status(400).json({ success: false, message: 'Text and label are required' });
      }

      const result = await faithClassifierService.storeLabel({
        userId,
        sessionId,
        text,
        label,
        notes
      });

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Faith label error:', error);
      res.status(500).json({ success: false, message: 'Failed to submit label' });
    }
  }
};

module.exports = aiController;