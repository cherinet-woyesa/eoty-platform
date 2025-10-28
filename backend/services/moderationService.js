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
      'divorce', 'remarriage', 'priesthood', 'celibacy',
      'doctrinal dispute', 'theological debate', 'church authority'
    ];

    // Define problematic phrases that might indicate off-topic questions
    this.problematicPhrases = [
      'what about', 'why not', 'is it wrong', 'is it sin',
      'compare to', 'different from', 'orthodox view on',
      'versus', 'vs', 'against', 'contradict',
      'better than', 'worse than', 'superior to',
      'challenge to', 'conflict with', 'disagree with'
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
      'angels', 'demons', 'satan', 'creation',
      'hudade', 'timkat', 'meskel', 'enkutatash',
      'nine saints', 'church history', 'monasticism'
    ];
    
    // Define guidance templates for different scenarios
    this.guidanceTemplates = {
      too_short: "Your question seems too brief. Please provide more details for a better response. For example, instead of 'prayer', you could ask 'How should I pray during fasting?' or 'What are the different types of prayers in Orthodox tradition?'",
      potentially_off_topic: "Your question might be off-topic. Please focus on Orthodox Christian teachings and practices. Consider asking about specific doctrines, practices, or scripture.",
      sensitive_topic: "Your question touches on sensitive topics. It will be reviewed by moderators to ensure doctrinal accuracy. For complex theological questions, we recommend consulting with your local clergy.",
      low_faith_alignment: "Consider asking questions more directly related to Orthodox Christian faith and teachings. You might want to explore topics like the Trinity, sacraments, or spiritual practices.",
      medium_faith_alignment: "Try to include more specific Orthodox Christian terms in your questions for better responses. For example, instead of 'worship', you could ask about 'the Divine Liturgy' or 'the Eucharist'."
    };
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
      guidance.push(this.guidanceTemplates.too_short);
    }

    if (flags.includes('potentially_off_topic')) {
      guidance.push(this.guidanceTemplates.potentially_off_topic);
    }

    if (flags.some(flag => flag.includes('sensitive_topic'))) {
      guidance.push(this.guidanceTemplates.sensitive_topic);
    }

    if (faithAlignmentScore < 1) {
      guidance.push(this.guidanceTemplates.low_faith_alignment);
    } else if (faithAlignmentScore < 2) {
      guidance.push(this.guidanceTemplates.medium_faith_alignment);
    }

    return guidance;
  }

  // Handle vague or off-topic questions with enhanced guidance prompts
  handleVagueQuestion(content) {
    const wordCount = content.trim().split(/\s+/).length;
    
    // Handle very short questions
    if (wordCount < 3) {
      return {
        response: this.guidanceTemplates.too_short,
        needsModeration: false
      };
    }

    // Check if it's a generic question
    const contentLower = content.toLowerCase();
    const genericPatterns = [
      { 
        pattern: /\bwhy\b/i, 
        suggestion: "Why [specific aspect]? For example: 'Why do we fast during Hudade?' or 'Why is the Trinity important in Orthodox theology?'" 
      },
      { 
        pattern: /\bhow\b/i, 
        suggestion: "How [specific action]? For example: 'How do I prepare for confession?' or 'How should I study the Bible?'" 
      },
      { 
        pattern: /\bwhat\b/i, 
        suggestion: "What [specific topic]? For example: 'What is the meaning of the Eucharist?' or 'What are the major feast days in the Orthodox calendar?'" 
      },
      { 
        pattern: /\bwhen\b/i, 
        suggestion: "When [specific event]? For example: 'When is Timkat celebrated?' or 'When should I fast?'" 
      },
      { 
        pattern: /\bwhere\b/i, 
        suggestion: "Where [specific place]? For example: 'Where is the Ark of the Covenant kept?' or 'Where did Christianity first spread in Ethiopia?'" 
      },
      { 
        pattern: /\bwho\b/i, 
        suggestion: "Who [specific person]? For example: 'Who were the Nine Saints?' or 'Who is Saint George in Orthodox tradition?'" 
      }
    ];

    for (const { pattern, suggestion } of genericPatterns) {
      if (pattern.test(content) && wordCount < 5) {
        return {
          response: `Your question is quite general. To get a better response, please be more specific. ${suggestion}`,
          needsModeration: false
        };
      }
    }

    // Check for questions that are too broad
    const broadKeywords = ['everything', 'all about', 'tell me', 'explain'];
    const hasBroadKeyword = broadKeywords.some(keyword => contentLower.includes(keyword));
    
    if (hasBroadKeyword && wordCount < 8) {
      return {
        response: "Your question is quite broad. Please focus on a specific aspect of Orthodox Christianity. For example, instead of 'Tell me about Orthodox Christianity,' you could ask 'What are the main sacraments in the Ethiopian Orthodox Church?'",
        needsModeration: false
      };
    }

    return null; // No special handling needed
  }

  // Enhanced escalation for admin review with priority levels
  async escalateForReview(content, userId, reason, contentType = 'question', priority = 'medium') {
    // Determine priority based on content
    if (reason.includes('sensitive_topic_heresy') || reason.includes('sensitive_topic_doctrinal')) {
      priority = 'high';
    } else if (reason.includes('sensitive_topic_political') || reason.includes('sensitive_topic_social')) {
      priority = 'high';
    } else if (reason.includes('sensitive_topic_ecumenical') || reason.includes('sensitive_topic_other')) {
      priority = 'medium';
    }

    const [escalationId] = await db('moderation_escalations').insert({
      user_id: userId,
      content: content,
      content_type: contentType,
      reason: reason,
      priority: priority,
      status: 'pending',
      created_at: new Date()
    }).returning('id');

    return escalationId;
  }

  // Get pending moderation items for admins with filtering and sorting
  async getPendingItems(limit = 50, offset = 0, filters = {}) {
    let query = db('moderated_content')
      .where('status', 'pending')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)
      .select('*');
      
    // Apply filters if provided
    if (filters.priority) {
      query = query.where('priority', filters.priority);
    }
    
    if (filters.content_type) {
      query = query.where('content_type', filters.content_type);
    }
    
    if (filters.date_from) {
      query = query.where('created_at', '>=', filters.date_from);
    }
    
    if (filters.date_to) {
      query = query.where('created_at', '<=', filters.date_to);
    }

    return await query;
  }

  // Get pending escalation items for admins with priority levels
  async getPendingEscalations(limit = 50, offset = 0, priority = null) {
    let query = db('moderation_escalations')
      .where('status', 'pending')
      .orderByRaw("CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END")
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)
      .select('*');
      
    if (priority) {
      query = query.where('priority', priority);
    }

    return await query;
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

  // Resolve escalated content
  async resolveEscalation(escalationId, moderatorId, resolutionNotes = '', status = 'resolved') {
    return await db('moderation_escalations')
      .where({ id: escalationId })
      .update({
        status: status,
        reviewed_by: moderatorId,
        resolution_notes: resolutionNotes,
        updated_at: new Date()
      });
  }

  // Get moderation statistics
  async getModerationStats() {
    const stats = await db('moderation_stats')
      .where('date', new Date().toISOString().split('T')[0])
      .first();
      
    if (stats) {
      return stats;
    }
    
    // Return default stats if no record for today
    return {
      pending_count: 0,
      approved_count: 0,
      rejected_count: 0,
      escalated_count: 0,
      high_faith_alignment_count: 0,
      low_faith_alignment_count: 0,
      avg_faith_alignment_score: 0
    };
  }

  // Update moderation statistics
  async updateModerationStats(stats) {
    const today = new Date().toISOString().split('T')[0];
    
    const existing = await db('moderation_stats')
      .where('date', today)
      .first();
      
    if (existing) {
      return await db('moderation_stats')
        .where('date', today)
        .update({
          ...stats,
          updated_at: new Date()
        });
    } else {
      return await db('moderation_stats').insert({
        date: today,
        ...stats,
        created_at: new Date(),
        updated_at: new Date()
      });
    }
  }
}

module.exports = new ModerationService();