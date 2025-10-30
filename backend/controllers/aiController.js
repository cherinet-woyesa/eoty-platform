const aiService = require('../services/aiService');
const db = require('../config/database');

const aiController = {
  async askQuestion(req, res) {
    const startTime = Date.now();
    
    try {
      const { question, sessionId = 'default', context = {} } = req.body;
      const userId = req.user.userId;

      if (!question || question.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Question is required'
        });
      }

      // Moderate the query
      const moderationResult = await aiService.moderateQuery(question, userId);

      // If moderation provides guidance, return it directly
      if (moderationResult.guidance && moderationResult.guidance.length > 0 && !moderationResult.needsModeration) {
        return res.json({
          success: true,
          data: {
            answer: moderationResult.guidance[0],
            relevantContent: [],
            sources: [],
            relatedResources: [],
            moderation: moderationResult,
            sessionId,
            guidanceProvided: true
          }
        });
      }

      // Get conversation history for context
      const conversationHistory = await aiService.getConversationHistory(userId, sessionId);

      // Generate AI response with performance monitoring
      const aiResponseStartTime = Date.now();
      const aiResponse = await aiService.generateResponse(
        question, 
        context, 
        conversationHistory
      );
      const aiResponseTime = Date.now() - aiResponseStartTime;

      // Store conversation
      const storeStartTime = Date.now();
      await aiService.storeConversation(
        userId, 
        sessionId, 
        question, 
        aiResponse, 
        context,
        moderationResult.needsModeration
      );
      const storeTime = Date.now() - storeStartTime;

      // Prepare response
      const response = {
        success: true,
        data: {
          answer: aiResponse.response,
          relevantContent: aiResponse.relevantContent,
          sources: aiResponse.sources,
          relatedResources: aiResponse.relatedResources,
          moderation: moderationResult,
          sessionId,
          detectedLanguage: aiResponse.detectedLanguage
        }
      };

      // If needs moderation, include warning
      if (moderationResult.needsModeration) {
        response.data.moderationWarning = 'This question has been flagged for moderator review due to sensitive content.';
      }

      // If guidance was provided, include it
      if (moderationResult.guidance && moderationResult.guidance.length > 0) {
        response.data.guidance = moderationResult.guidance;
      }

      // Add detailed response time metrics
      const totalTime = Date.now() - startTime;
      response.data.performanceMetrics = {
        totalTimeMs: totalTime,
        aiResponseTimeMs: aiResponseTime,
        storeTimeMs: storeTime,
        responseTimeMs: totalTime // For backward compatibility
      };
      
      // Log if response time is too slow
      if (totalTime > aiService.performanceSettings.maxResponseTimeMs) {
        console.warn(`Slow AI response: ${totalTime}ms for question: ${question.substring(0, 50)}...`);
        console.warn(`Breakdown - AI: ${aiResponseTime}ms, Store: ${storeTime}ms`);
      }

      res.json(response);

    } catch (error) {
      console.error('AI question error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process your question. Please try again.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  async getConversationHistory(req, res) {
    try {
      const { sessionId = 'default' } = req.query;
      const userId = req.user.userId;

      const history = await aiService.getConversationHistory(userId, sessionId);

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

  // NEW: Report/escalate an AI question for moderation
  async reportQuestion(req, res) {
    try {
      const userId = req.user.userId;
      const { question, sessionId = 'default', context = {}, moderation = {} } = req.body || {};

      if (!question || question.trim().length === 0) {
        return res.status(400).json({ success: false, message: 'Question is required' });
      }

      // Store in moderated_queries for review
      await db('moderated_queries').insert({
        original_query: question,
        moderated_query: null,
        moderation_action: 'escalated_by_user',
        moderation_reasons: JSON.stringify({ moderation, context, sessionId }),
        user_id: userId
      });

      // Also log an entry in system_logs for quick visibility
      await db('system_logs').insert({
        log_type: 'ai_report',
        message: JSON.stringify({ userId, sessionId, context, reportedAt: new Date().toISOString() })
      });

      return res.json({ success: true, message: 'Reported for moderation' });
    } catch (error) {
      console.error('AI reportQuestion error:', error);
      return res.status(500).json({ success: false, message: 'Failed to report question' });
    }
  },

  // NEW: Receive client-side telemetry for response times
  async telemetry(req, res) {
    try {
      const userId = req.user.userId;
      const { sessionId = 'default', context = {}, totalTimeMs = 0, success = false, errorMessage } = req.body || {};

      await db('system_logs').insert({
        log_type: 'ai_telemetry',
        message: JSON.stringify({ userId, sessionId, context, totalTimeMs, success, errorMessage, ts: new Date().toISOString() })
      });

      return res.json({ success: true });
    } catch (error) {
      console.error('AI telemetry error:', error);
      return res.status(500).json({ success: false, message: 'Failed to record telemetry' });
    }
  },

  // NEW: Privacy-safe conversation summary logging (lengths/flags only)
  async summary(req, res) {
    try {
      const userId = req.user.userId;
      const { sessionId = 'default', language, route, questionLength = 0, answerLength = 0, flagged = false } = req.body || {};

      await db('system_logs').insert({
        log_type: 'ai_summary',
        message: JSON.stringify({ userId, sessionId, language, route, questionLength, answerLength, flagged, ts: new Date().toISOString() })
      });

      return res.json({ success: true });
    } catch (error) {
      console.error('AI summary error:', error);
      return res.status(500).json({ success: false, message: 'Failed to record summary' });
    }
  }
};

module.exports = aiController;