// backend/services/moderationService.js - ENHANCED VERSION
const db = require('../config/database');
const { openai } = require('../config/aiConfig');

class ModerationService {
  constructor() {
    // Enhanced sensitive topics with severity levels
    this.sensitiveTopics = {
      high: [
        { topic: 'heresy', examples: ['nestorianism', 'arianism', 'monophysitism'] },
        { topic: 'doctrinal dispute', examples: ['challenge church teaching', 'dispute doctrine'] },
        { topic: 'ecumenical compromise', examples: ['unite with protestants', 'catholic agreement'] },
        { topic: 'political religious', examples: ['church and state', 'religious politics'] }
      ],
      medium: [
        { topic: 'social issues', examples: ['abortion', 'contraception', 'gender issues'] },
        { topic: 'comparative theology', examples: ['orthodox vs protestant', 'compare to catholic'] },
        { topic: 'modern controversies', examples: ['modern vs traditional', 'church reform'] }
      ],
      low: [
        { topic: 'historical criticism', examples: ['church history problems', 'historical issues'] },
        { topic: 'personal spiritual', examples: ['personal revelation', 'private interpretation'] }
      ]
    };

    // Enhanced problematic phrases with context awareness
    this.problematicPhrases = {
      comparative: ['better than', 'worse than', 'superior to', 'inferior to', 'versus', 'vs'],
      challenging: ['why does the church', 'how can you believe', 'prove that', 'disprove'],
      speculative: ['what if', 'suppose that', 'imagine if', 'hypothetical'],
      personal_interpretation: ['i think that', 'in my opinion', 'i believe that']
    };

    // Faith alignment thresholds for auto-escalation
    this.escalationThresholds = {
      faithAlignment: 0.6,      // Escalate if below this score
      sensitiveTopicCount: 2,   // Escalate if multiple sensitive topics
      userReportThreshold: 3,   // Escalate after multiple user reports
      confidenceThreshold: 0.8  // Confidence needed for auto-moderation
    };
  }

  // ENHANCED: Comprehensive content moderation with intelligent escalation
  async moderateContent(content, userId, contentType = 'question', context = {}) {
    const contentLower = content.toLowerCase();
    const analysis = {
      needsModeration: false,
      flags: [],
      confidence: 1.0,
      faithAlignmentScore: 0,
      severity: 'low',
      recommendedAction: 'approve',
      escalationReasons: [],
      autoModerated: false
    };

    // 1. Analyze sensitive topics with severity levels
    await this.analyzeSensitiveTopics(contentLower, analysis);
    
    // 2. Check for problematic phrases
    this.analyzeProblematicPhrases(contentLower, analysis);
    
    // 3. Calculate faith alignment
    analysis.faithAlignmentScore = await this.calculateFaithAlignment(content, context);
    
    // 4. Check user history for pattern detection
    await this.checkUserHistory(userId, analysis);
    
    // 5. Determine moderation needs and severity
    this.determineModerationAction(analysis);
    
    // 6. Auto-moderate low-risk content if confidence is high
    if (this.shouldAutoModerate(analysis)) {
      analysis.autoModerated = true;
      analysis.needsModeration = false;
      await this.logAutoModeration(content, userId, analysis);
    } else if (analysis.needsModeration) {
      // 7. Escalate for human review
      await this.escalateForReview(content, userId, analysis, contentType);
    }

    // 8. Log moderation event
    await this.logModerationEvent(content, userId, analysis, contentType);

    return analysis;
  }

  // Enhanced sensitive topic analysis with severity levels
  async analyzeSensitiveTopics(content, analysis) {
    let highSeverityCount = 0;
    let mediumSeverityCount = 0;

    // Check high severity topics
    this.sensitiveTopics.high.forEach(({ topic, examples }) => {
      if (examples.some(example => content.includes(example)) || content.includes(topic)) {
        analysis.flags.push(`high_severity_${topic}`);
        highSeverityCount++;
        analysis.confidence *= 0.7; // Reduce confidence for high severity
      }
    });

    // Check medium severity topics
    this.sensitiveTopics.medium.forEach(({ topic, examples }) => {
      if (examples.some(example => content.includes(example)) || content.includes(topic)) {
        analysis.flags.push(`medium_severity_${topic}`);
        mediumSeverityCount++;
        analysis.confidence *= 0.9;
      }
    });

    // Check low severity topics
    this.sensitiveTopics.low.forEach(({ topic, examples }) => {
      if (examples.some(example => content.includes(example)) || content.includes(topic)) {
        analysis.flags.push(`low_severity_${topic}`);
        analysis.confidence *= 0.95;
      }
    });

    // Update severity based on counts
    if (highSeverityCount > 0) {
      analysis.severity = 'high';
    } else if (mediumSeverityCount > 0) {
      analysis.severity = 'medium';
    }
  }

  // Enhanced problematic phrase analysis
  analyzeProblematicPhrases(content, analysis) {
    Object.entries(this.problematicPhrases).forEach(([category, phrases]) => {
      const foundPhrases = phrases.filter(phrase => content.includes(phrase));
      if (foundPhrases.length > 0) {
        analysis.flags.push(`problematic_${category}`);
        analysis.escalationReasons.push(`Contains ${category} language: ${foundPhrases.join(', ')}`);
        
        // Adjust confidence based on category
        if (category === 'comparative' || category === 'challenging') {
          analysis.confidence *= 0.8;
        }
      }
    });
  }

  // Calculate faith alignment score
  async calculateFaithAlignment(content, context = {}) {
    let score = 1.0;
    
    // Check for Ethiopian Orthodox terminology
    const faithTerms = ['tewahedo', 'ethiopian orthodox', 'qurban', 'tabot', 'geez', 'timkat'];
    const foundTerms = faithTerms.filter(term => content.toLowerCase().includes(term));
    score += foundTerms.length * 0.1;

    // Check for problematic comparative language
    const comparativeTerms = ['protestant', 'catholic', 'compared to', 'versus', 'vs'];
    const foundComparative = comparativeTerms.filter(term => content.toLowerCase().includes(term));
    score -= foundComparative.length * 0.2;

    // Use AI for complex faith alignment if available
    if (openai && content.length > 20) {
      try {
        const aiAlignment = await this.getAIFaithAlignment(content, context);
        score = (score + aiAlignment) / 2; // Blend with heuristic score
      } catch (error) {
        console.warn('AI faith alignment failed, using heuristic only:', error);
      }
    }

    return Math.max(0, Math.min(1, score));
  }

  // AI-powered faith alignment analysis
  async getAIFaithAlignment(content, context) {
    const prompt = `
Analyze the following question for alignment with Ethiopian Orthodox Tewahedo doctrine:

Question: "${content}"

Context: ${JSON.stringify(context)}

Score the question on a scale of 0-1 for:
1. Doctrinal alignment with Ethiopian Orthodox teaching
2. Appropriate tone and respect for tradition
3. Absence of comparative or challenging language

Respond only with a number between 0 and 1.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 10,
      temperature: 0
    });

    const score = parseFloat(completion.choices[0].message.content);
    return isNaN(score) ? 0.7 : score;
  }

  // Check user history for pattern detection
  async checkUserHistory(userId, analysis) {
    try {
      // Get recent moderation events for this user
      const recentModerations = await db('moderated_content')
        .where({ user_id: userId })
        .where('created_at', '>', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // Last 7 days
        .select('status', 'moderation_flags')
        .limit(10);

      const flaggedCount = recentModerations.filter(m => m.status === 'pending' || m.status === 'rejected').length;
      
      if (flaggedCount >= 3) {
        analysis.flags.push('frequent_flagged_user');
        analysis.escalationReasons.push(`User has ${flaggedCount} flagged contents in last 7 days`);
        analysis.confidence *= 0.8;
      }

      // Check if user has pattern of similar issues
      const similarFlags = recentModerations.filter(m => 
        m.moderation_flags && analysis.flags.some(flag => 
          m.moderation_flags.includes(flag)
        )
      ).length;

      if (similarFlags >= 2) {
        analysis.flags.push('recurring_issue_pattern');
        analysis.escalationReasons.push(`User has recurring pattern of similar issues`);
      }

    } catch (error) {
      console.warn('Failed to check user history:', error);
    }
  }

  // Determine appropriate moderation action
  determineModerationAction(analysis) {
    // High severity always needs moderation
    if (analysis.severity === 'high') {
      analysis.needsModeration = true;
      analysis.recommendedAction = 'review_high_priority';
      return;
    }

    // Low faith alignment with high confidence
    if (analysis.faithAlignmentScore < this.escalationThresholds.faithAlignment && 
        analysis.confidence > this.escalationThresholds.confidenceThreshold) {
      analysis.needsModeration = true;
      analysis.recommendedAction = 'review_faith_alignment';
      return;
    }

    // Multiple sensitive topics
    const sensitiveFlags = analysis.flags.filter(f => f.includes('severity_'));
    if (sensitiveFlags.length >= this.escalationThresholds.sensitiveTopicCount) {
      analysis.needsModeration = true;
      analysis.recommendedAction = 'review_multiple_issues';
      return;
    }

    // Default to no moderation needed
    analysis.needsModeration = false;
    analysis.recommendedAction = 'approve';
  }

  // Determine if content can be auto-moderated
  shouldAutoModerate(analysis) {
    // Only auto-moderate if confidence is high and severity is low
    if (analysis.severity === 'high') return false;
    if (analysis.confidence < this.escalationThresholds.confidenceThreshold) return false;
    
    // Don't auto-moderate if faith alignment is very low
    if (analysis.faithAlignmentScore < 0.4) return false;
    
    // Auto-moderate low-risk content
    return !analysis.needsModeration || analysis.recommendedAction === 'approve';
  }

  // ENHANCED: Escalate for review with intelligent priority
  async escalateForReview(content, userId, analysis, contentType = 'question') {
    // Determine priority based on analysis
    let priority = 'medium';
    if (analysis.severity === 'high' || analysis.faithAlignmentScore < 0.4) {
      priority = 'high';
    } else if (analysis.severity === 'low' && analysis.faithAlignmentScore > 0.7) {
      priority = 'low';
    }

    // Create detailed escalation reason
    const escalationReason = this.formatEscalationReason(analysis);

    const [escalationId] = await db('moderation_escalations').insert({
      user_id: userId,
      content: content,
      content_type: contentType,
      reason: escalationReason,
      priority: priority,
      flags: JSON.stringify(analysis.flags),
      faith_alignment_score: analysis.faithAlignmentScore,
      severity: analysis.severity,
      confidence: analysis.confidence,
      status: 'pending',
      created_at: new Date()
    }).returning('id');

    // Notify moderators based on priority
    await this.notifyModerators(escalationId, priority, analysis);

    console.log(`Content escalated for review (ID: ${escalationId}, Priority: ${priority})`);

    return escalationId;
  }

  // Format detailed escalation reason
  formatEscalationReason(analysis) {
    const reasons = [];
    
    if (analysis.severity === 'high') {
      reasons.push('High severity content detected');
    }
    
    if (analysis.faithAlignmentScore < 0.6) {
      reasons.push(`Low faith alignment (${Math.round(analysis.faithAlignmentScore * 100)}%)`);
    }
    
    if (analysis.escalationReasons.length > 0) {
      reasons.push(...analysis.escalationReasons);
    }
    
    if (analysis.flags.some(f => f.includes('frequent_flagged_user'))) {
      reasons.push('User has history of flagged content');
    }

    return reasons.join('; ');
  }

  // Notify moderators based on priority
  async notifyModerators(escalationId, priority, analysis) {
    const notificationData = {
      escalationId,
      priority,
      flags: analysis.flags,
      faithAlignmentScore: analysis.faithAlignmentScore,
      severity: analysis.severity,
      timestamp: new Date().toISOString()
    };

    // Store notification for moderators
    await db('moderator_notifications').insert({
      type: 'escalation',
      title: `New ${priority} priority escalation`,
      message: `Content requires moderation review`,
      data: JSON.stringify(notificationData),
      priority: priority,
      status: 'unread',
      created_at: new Date()
    });

    // In production, this would integrate with:
    // - Email notifications for high priority
    // - Slack/Teams webhooks
    // - SMS alerts for critical issues
    console.log(`Moderator notified: ${priority} priority escalation ${escalationId}`);
  }

  // Log auto-moderation decisions
  async logAutoModeration(content, userId, analysis) {
    await db('auto_moderation_logs').insert({
      user_id: userId,
      content: content,
      moderation_decision: 'auto_approved',
      flags: JSON.stringify(analysis.flags),
      faith_alignment_score: analysis.faithAlignmentScore,
      confidence: analysis.confidence,
      created_at: new Date()
    });
  }

  // Log moderation event
  async logModerationEvent(content, userId, analysis, contentType) {
    await db('moderated_content').insert({
      user_id: userId,
      content: content,
      content_type: contentType,
      moderation_flags: analysis.flags.join(', '),
      faith_alignment_score: analysis.faithAlignmentScore,
      severity: analysis.severity,
      confidence: analysis.confidence,
      status: analysis.autoModerated ? 'auto_approved' : 'pending',
      recommended_action: analysis.recommendedAction,
      created_at: new Date()
    });
  }

  // ENHANCED: Get pending items with filtering and analytics
  async getPendingItems(limit = 50, offset = 0, filters = {}) {
    let query = db('moderation_escalations')
      .where('status', 'pending')
      .orderByRaw(`
        CASE priority 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          WHEN 'low' THEN 3 
          ELSE 4 
        END
      `)
      .orderBy('created_at', 'asc')
      .limit(limit)
      .offset(offset)
      .select('*');

    // Apply filters
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

    if (filters.severity) {
      query = query.where('severity', filters.severity);
    }

    const items = await query;

    // Add user information and analytics
    const enhancedItems = await Promise.all(
      items.map(async item => {
        const user = await db('users')
          .where('id', item.user_id)
          .select('username', 'email', 'role')
          .first();

        const userModerationHistory = await db('moderated_content')
          .where('user_id', item.user_id)
          .where('created_at', '>', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
          .select('status')
          .count('* as total')
          .groupBy('status');

        return {
          ...item,
          user: user || { username: 'Unknown', email: 'Unknown', role: 'Unknown' },
          moderation_history: userModerationHistory,
          flags: item.flags ? JSON.parse(item.flags) : []
        };
      })
    );

    return enhancedItems;
  }

  // ENHANCED: Resolve escalation with detailed tracking
  async resolveEscalation(escalationId, moderatorId, resolution, status = 'resolved') {
    const trx = await db.transaction();

    try {
      // Update escalation
      await trx('moderation_escalations')
        .where({ id: escalationId })
        .update({
          status: status,
          reviewed_by: moderatorId,
          resolution: resolution.resolutionNotes,
          resolution_action: resolution.action,
          resolution_category: resolution.category,
          updated_at: new Date()
        });

      // Update related moderated content
      const escalation = await trx('moderation_escalations')
        .where({ id: escalationId })
        .first();

      if (escalation) {
        await trx('moderated_content')
          .where({
            user_id: escalation.user_id,
            content: escalation.content
          })
          .update({
            status: resolution.action === 'approve' ? 'approved' : 'rejected',
            moderated_by: moderatorId,
            moderation_notes: resolution.resolutionNotes,
            updated_at: new Date()
          });
      }

      // Log resolution for analytics
      await trx('moderation_resolution_logs').insert({
        escalation_id: escalationId,
        moderator_id: moderatorId,
        resolution_action: resolution.action,
        resolution_category: resolution.category,
        resolution_notes: resolution.resolutionNotes,
        resolved_at: new Date()
      });

      await trx.commit();

      return { success: true, message: 'Escalation resolved successfully' };
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  // Get moderation statistics for dashboard
  async getModerationStats(timeframe = '7days') {
    let dateFilter = new Date();
    
    switch (timeframe) {
      case '24hours':
        dateFilter.setDate(dateFilter.getDate() - 1);
        break;
      case '7days':
        dateFilter.setDate(dateFilter.getDate() - 7);
        break;
      case '30days':
        dateFilter.setDate(dateFilter.getDate() - 30);
        break;
      default:
        dateFilter.setDate(dateFilter.getDate() - 7);
    }

    const stats = await db('moderation_escalations')
      .where('created_at', '>=', dateFilter)
      .select(
        db.raw('COUNT(*) as total_escalations'),
        db.raw('COUNT(CASE WHEN priority = \'high\' THEN 1 END) as high_priority'),
        db.raw('COUNT(CASE WHEN priority = \'medium\' THEN 1 END) as medium_priority'),
        db.raw('COUNT(CASE WHEN priority = \'low\' THEN 1 END) as low_priority'),
        db.raw('COUNT(CASE WHEN status = \'pending\' THEN 1 END) as pending'),
        db.raw('COUNT(CASE WHEN status = \'resolved\' THEN 1 END) as resolved'),
        db.raw('AVG(faith_alignment_score) as avg_faith_alignment')
      )
      .first();

    // Get resolution time statistics
    const resolutionStats = await db('moderation_resolution_logs')
      .join('moderation_escalations', 'moderation_resolution_logs.escalation_id', 'moderation_escalations.id')
      .where('moderation_escalations.created_at', '>=', dateFilter)
      .select(
        db.raw('AVG(EXTRACT(EPOCH FROM (moderation_resolution_logs.resolved_at - moderation_escalations.created_at))/3600) as avg_resolution_hours')
      )
      .first();

    // Get common flag statistics
    const flagStats = await db('moderation_escalations')
      .where('created_at', '>=', dateFilter)
      .select('flags')
      .then(rows => {
        const flagCounts = {};
        rows.forEach(row => {
          if (row.flags) {
            const flags = JSON.parse(row.flags);
            flags.forEach(flag => {
              flagCounts[flag] = (flagCounts[flag] || 0) + 1;
            });
          }
        });
        return flagCounts;
      });

    return {
      timeframe,
      totalEscalations: parseInt(stats.total_escalations) || 0,
      byPriority: {
        high: parseInt(stats.high_priority) || 0,
        medium: parseInt(stats.medium_priority) || 0,
        low: parseInt(stats.low_priority) || 0
      },
      byStatus: {
        pending: parseInt(stats.pending) || 0,
        resolved: parseInt(stats.resolved) || 0
      },
      averageFaithAlignment: parseFloat(stats.avg_faith_alignment) || 0,
      averageResolutionTime: parseFloat(resolutionStats.avg_resolution_hours) || 0,
      commonFlags: Object.entries(flagStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .reduce((obj, [key, val]) => ({ ...obj, [key]: val }), {})
    };
  }

  // Bulk resolve escalations
  async bulkResolveEscalations(escalationIds, moderatorId, resolution) {
    const trx = await db.transaction();

    try {
      for (const escalationId of escalationIds) {
        await this.resolveEscalation(escalationId, moderatorId, resolution, 'resolved');
      }

      await trx.commit();
      return { success: true, message: `Resolved ${escalationIds.length} escalations` };
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }
}

module.exports = new ModerationService();