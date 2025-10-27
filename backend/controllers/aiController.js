const aiService = require('../services/aiService');
const db = require('../config/database');

const aiController = {
  async askQuestion(req, res) {
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

      // Get conversation history for context
      const conversationHistory = await aiService.getConversationHistory(userId, sessionId);

      // Generate AI response
      const aiResponse = await aiService.generateResponse(
        question, 
        context, 
        conversationHistory
      );

      // Store conversation
      await aiService.storeConversation(
        userId, 
        sessionId, 
        question, 
        aiResponse, 
        context,
        moderationResult.needsModeration
      );

      // Prepare response
      const response = {
        success: true,
        data: {
          answer: aiResponse.response,
          relevantContent: aiResponse.relevantContent,
          sources: aiResponse.sources,
          moderation: moderationResult,
          sessionId
        }
      };

      // If needs moderation, include warning
      if (moderationResult.needsModeration) {
        response.data.moderationWarning = 'This question has been flagged for moderator review due to sensitive content.';
      }

      res.json(response);

    } catch (error) {
      console.error('AI question error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process your question. Please try again.'
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
  }
};

module.exports = aiController;