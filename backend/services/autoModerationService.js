const db = require('../config/database');

// Spam detection patterns
const SPAM_PATTERNS = [
  /\b(?:viagra|casino|lottery|winner|prize|jackpot)\b/i,
  /\b(?:http|https|www\.|\.com|\.net|\.org)\b.*\b(?:http|https|www\.|\.com|\.net|\.org)\b/i, // Multiple URLs
  /\b(?:free|cheap|discount|buy now|click here|limited time)\b.*\b(?:free|cheap|discount|buy now|click here|limited time)\b/i,
  /[A-Z]{10,}/, // Excessive caps
  /(\w)\1{4,}/, // Character repetition
  /^\s*(?:hi|hello|hey)\s+(?:all|everyone|guys|folks)\s*$/i, // Generic greetings
];

// Profanity filter (basic implementation - should be expanded)
const PROFANITY_WORDS = [
  'damn', 'hell', 'crap', 'stupid', 'idiot', 'moron', 'jerk', 'asshole',
  'shit', 'fuck', 'bitch', 'bastard', 'cunt', 'dick', 'pussy', 'cock'
];

class AutoModerationService {
  // Calculate spam score for content (0-100)
  calculateSpamScore(content, userId) {
    let score = 0;

    // Check for spam patterns
    for (const pattern of SPAM_PATTERNS) {
      if (pattern.test(content)) {
        score += 15;
      }
    }

    // Check for profanity
    const lowerContent = content.toLowerCase();
    for (const word of PROFANITY_WORDS) {
      if (lowerContent.includes(word)) {
        score += 10;
      }
    }

    // Length checks
    if (content.length < 10) {
      score += 5; // Very short content might be spam
    } else if (content.length > 2000) {
      score += 10; // Very long content might be spam
    }

    // Check for excessive punctuation
    const punctuationCount = (content.match(/[!?]{2,}/g) || []).length;
    score += punctuationCount * 5;

    // Check for user behavior (if they have history of spam)
    // This would be implemented based on user's past moderation history

    return Math.min(100, Math.max(0, score));
  }

  // Check if content should be auto-flagged
  shouldAutoFlag(spamScore, content, userId) {
    // Auto-flag if spam score is high
    if (spamScore >= 70) {
      return {
        shouldFlag: true,
        reason: 'High spam score',
        severity: 'high'
      };
    }

    // Auto-flag for certain patterns
    for (const pattern of SPAM_PATTERNS) {
      if (pattern.test(content)) {
        return {
          shouldFlag: true,
          reason: 'Spam pattern detected',
          severity: 'medium'
        };
      }
    }

    // Check for repeated content (would need user history)
    // Check for excessive caps
    const capsRatio = content.replace(/[^A-Z]/g, '').length / content.replace(/[^a-zA-Z]/g, '').length;
    if (capsRatio > 0.8 && content.length > 20) {
      return {
        shouldFlag: true,
        reason: 'Excessive capitalization',
        severity: 'low'
      };
    }

    return { shouldFlag: false };
  }

  // Submit content for moderation
  async submitForModeration(contentType, contentId, content, userId) {
    try {
      const spamScore = this.calculateSpamScore(content, userId);
      const autoFlagResult = this.shouldAutoFlag(spamScore, content, userId);

      const moderationStatus = autoFlagResult.shouldFlag ? 'auto_flagged' : 'approved';

      await db('content_moderation').insert({
        content_type: contentType,
        content_id: contentId,
        content_text: content,
        moderation_status: moderationStatus,
        moderation_reason: autoFlagResult.reason || null,
        spam_score: spamScore,
        moderation_metadata: {
          auto_flag_severity: autoFlagResult.severity,
          patterns_matched: SPAM_PATTERNS.filter(p => p.test(content)).length,
          profanity_detected: PROFANITY_WORDS.some(w => content.toLowerCase().includes(w)),
          caps_ratio: content.replace(/[^A-Z]/g, '').length / content.replace(/[^a-zA-Z]/g, '').length
        }
      });

      return {
        spamScore,
        autoFlagged: autoFlagResult.shouldFlag,
        moderationStatus,
        reason: autoFlagResult.reason
      };
    } catch (error) {
      console.error('Auto-moderation submission error:', error);
      // Don't fail the main operation if moderation fails
      return { spamScore: 0, autoFlagged: false, moderationStatus: 'approved' };
    }
  }

  // Check if user is allowed to post (not banned, not rate limited, etc.)
  async validateUserAction(userId, actionType) {
    try {
      // Check if user is banned
      const user = await db('users').where({ id: userId }).select('is_banned', 'ban_reason').first();
      if (user?.is_banned) {
        return {
          allowed: false,
          reason: 'Account is banned',
          details: user.ban_reason
        };
      }

      // Check recent moderation history (too many flagged posts)
      const recentFlags = await db('content_moderation')
        .where('content_text', 'ilike', `%${userId}%`) // This is a simple check - should be improved
        .where('moderation_status', 'auto_flagged')
        .where('created_at', '>', db.raw("NOW() - INTERVAL '24 hours'"))
        .count('id as count')
        .first();

      if (recentFlags.count > 5) {
        return {
          allowed: false,
          reason: 'Too many recent content violations',
          details: 'Multiple posts have been flagged for review. Please wait before posting again.'
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('User validation error:', error);
      // Allow action if validation fails (fail-open approach)
      return { allowed: true };
    }
  }

  // Clean inappropriate content (basic implementation)
  sanitizeContent(content) {
    let sanitized = content;

    // Remove excessive whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    // Basic URL filtering (could be enhanced)
    sanitized = sanitized.replace(/(https?:\/\/[^\s]+)/g, '[LINK REMOVED]');

    // Basic email filtering
    sanitized = sanitized.replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '[EMAIL REMOVED]');

    return sanitized;
  }
}

module.exports = new AutoModerationService();
