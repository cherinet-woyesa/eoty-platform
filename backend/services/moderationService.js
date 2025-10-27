const db = require('../config/database');

class ModerationService {
  constructor() {
    // Define sensitive topics that require moderation
    this.sensitiveTopics = [
      'controversy', 'heresy', 'schism', 'political', 'ecumenical',
      'protestant', 'catholic', 'islam', 'jewish', 'other faiths',
      'social issues', 'modern society', 'traditional vs modern',
      'abortion', 'contraception', 'gender', 'sexuality',
      'violence', 'war', 'death penalty', 'euthanasia',
      'divorce', 'remarriage', 'priesthood', 'celibacy'
    ];

    // Define problematic phrases that might indicate off-topic questions
    this.problematicPhrases = [
      'what about', 'why not', 'is it wrong', 'is it sin',
      'compare to', 'different from', 'orthodox view on',
      'versus', 'vs', 'against', 'contradict',
      'better than', 'worse than', 'superior to'
    ];

    // Define acceptable topics that align with faith
    this.faithAlignedTopics = [
      'abune', 'liqawint', 'tabot', 'qesoch', 'debrezeit',
      'ethiopian orthodox', 'tewahedo', 'geez', 'fidel',
      'kidane mehret', 'trinity', 'incarnation',
      'eucharist', 'baptism', 'prayer', 'fasting',
      'liturgy', 'scripture', 'bible', 'old testament',
      'new testament', 'apostles', 'saints', 'martyrs',
      'commandments', 'ten commandments', 'love', 'mercy',
      'repentance', 'salvation', 'heaven', 'hell',
      'angels', 'demons', 'satan', 'creation'
    ];
  }

  // Comprehensive content moderation
  async moderateContent(content, userId, contentType = 'question') {
    const contentLower = content.toLowerCase();
    const flags = [];
    let faithAlignmentScore = 0;

    // Check for sensitive topics
    this.sensitiveTopics.forEach(topic => {
      if (contentLower.includes(topic)) {
        flags.push(`sensitive_topic_${topic.replace(/\s+/g, '_')}`);
      }
    });

    // Check for problematic phrases
    this.problematicPhrases.forEach(phrase => {
      if (contentLower.includes(phrase)) {
        flags.push(`problematic_phrase_${phrase.replace(/\s+/g, '_')}`);
      }
    });

    // Check for faith-aligned content
    this.faithAlignedTopics.forEach(topic => {
      if (contentLower.includes(topic)) {
        faithAlignmentScore += 1;
      }
    });

    // Detect vague or off-topic questions
    const wordCount = content.trim().split(/\s+/).length;
    if (wordCount < 3) {
      flags.push('too_short');
    }

    // Check for generic questions that might be off-topic
    const genericQuestions = ['why', 'how', 'what', 'when', 'where', 'who'];
    const questionWords = genericQuestions.filter(word => contentLower.includes(word));
    
    if (questionWords.length > 2 && faithAlignmentScore < 2) {
      flags.push('potentially_off_topic');
    }

    // Log moderation event
    if (flags.length > 0 || faithAlignmentScore < 1) {
      await db('moderated_content').insert({
        user_id: userId,
        content: content,
        content_type: contentType,
        moderation_flags: flags.join(', '),
        faith_alignment_score: faithAlignmentScore,
        status: flags.length > 0 ? 'pending' : 'approved',
        created_at: new Date()
      });
    }

    return {
      needsModeration: flags.length > 0,
      flags,
      faithAlignmentScore,
      isFaithAligned: faithAlignmentScore >= 2,
      guidance: this.getGuidance(flags, faithAlignmentScore)
    };
  }

  // Get guidance message for users based on moderation flags
  getGuidance(flags, faithAlignmentScore) {
    const guidance = [];

    if (flags.includes('too_short')) {
      guidance.push('Your question seems too brief. Please provide more details for a better response.');
    }

    if (flags.includes('potentially_off_topic')) {
      guidance.push('Your question might be off-topic. Please focus on Orthodox Christian teachings and practices.');
    }

    if (flags.some(flag => flag.includes('sensitive_topic'))) {
      guidance.push('Your question touches on sensitive topics. It will be reviewed by moderators to ensure doctrinal accuracy.');
    }

    if (faithAlignmentScore < 1) {
      guidance.push('Consider asking questions more directly related to Orthodox Christian faith and teachings.');
    } else if (faithAlignmentScore < 2) {
      guidance.push('Try to include more specific Orthodox Christian terms in your questions for better responses.');
    }

    return guidance;
  }

  // Handle vague or off-topic questions with guidance prompts
  handleVagueQuestion(content) {
    const wordCount = content.trim().split(/\s+/).length;
    
    if (wordCount < 3) {
      return {
        response: "I notice your question is quite brief. Could you please provide more details? For example, instead of 'prayer', you could ask 'How should I pray during fasting?' or 'What are the different types of prayers in Orthodox tradition?'",
        needsModeration: false
      };
    }

    // Check if it's a generic question
    const genericPatterns = [
      { pattern: /\bwhy\b/i, suggestion: "Why [specific aspect]? For example: 'Why do we fast?' or 'Why is the Trinity important?'" },
      { pattern: /\bhow\b/i, suggestion: "How [specific action]? For example: 'How do I prepare for communion?' or 'How should I study scripture?'" },
      { pattern: /\bwhat\b/i, suggestion: "What [specific topic]? For example: 'What is the meaning of baptism?' or 'What are the church seasons?'" }
    ];

    for (const { pattern, suggestion } of genericPatterns) {
      if (pattern.test(content) && wordCount < 5) {
        return {
          response: `Your question is quite general. To get a better response, please be more specific. ${suggestion}`,
          needsModeration: false
        };
      }
    }

    return null; // No special handling needed
  }

  // Escalate content for admin review
  async escalateForReview(content, userId, reason, contentType = 'question') {
    const [escalationId] = await db('moderation_escalations').insert({
      user_id: userId,
      content: content,
      content_type: contentType,
      reason: reason,
      status: 'pending',
      created_at: new Date()
    }).returning('id');

    return escalationId;
  }

  // Get pending moderation items for admins
  async getPendingItems(limit = 50) {
    return await db('moderated_content')
      .where('status', 'pending')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .select('*');
  }

  // Approve moderated content
  async approveContent(contentId, moderatorId, notes = '') {
    return await db('moderated_content')
      .where({ id: contentId })
      .update({
        status: 'approved',
        moderated_by: moderatorId,
        moderation_notes: notes,
        updated_at: new Date()
      });
  }

  // Reject moderated content
  async rejectContent(contentId, moderatorId, notes = '') {
    return await db('moderated_content')
      .where({ id: contentId })
      .update({
        status: 'rejected',
        moderated_by: moderatorId,
        moderation_notes: notes,
        updated_at: new Date()
      });
  }
}

module.exports = new ModerationService();