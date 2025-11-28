const db = require('../config/database-gcp');
const { aiConfig } = require('../config/aiConfig-gcp');

class FaithClassifierService {
  // Simple classifier wrapper using aiConfig.validateFaithAlignment for now
  async classify(text, context = {}) {
    try {
      const result = aiConfig.validateFaithAlignment(text, context);
      return {
        success: true,
        score: result.score,
        isAligned: result.isAligned,
        issues: result.issues || [],
        suggestions: result.suggestions || []
      };
    } catch (error) {
      console.error('Faith classification failed:', error);
      return { success: false, message: 'Classification failed' };
    }
  }

  // Store moderator-provided label for training / auditing
  async storeLabel({ userId, sessionId, text, label, notes = null }) {
    try {
      const [id] = await db('faith_alignment_labels')
        .insert({ user_id: userId, session_id: sessionId, text: text.substring(0, 1000), label, notes: notes || null, created_at: new Date() })
        .returning('id');

      return { success: true, id };
    } catch (error) {
      console.error('Failed to store faith alignment label:', error);
      return { success: false, message: 'Failed to store label' };
    }
  }
}

module.exports = new FaithClassifierService();
