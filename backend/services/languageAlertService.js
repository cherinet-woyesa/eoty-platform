// backend/services/languageAlertService.js - NEW FILE
const multilingualService = require('./multilingualService');
const db = require('../config/database');

class LanguageAlertService {
  constructor() {
    this.supportedLanguages = ['en-US', 'am-ET', 'ti-ET', 'om-ET'];
    this.unsupportedLanguageCache = new Map();
  }

  // Detect and handle unsupported languages
  async handleUnsupportedLanguage(text, userId, sessionId, context = {}) {
    const detectedLang = await multilingualService.detectLanguage(text, context);
    const isSupported = this.supportedLanguages.includes(detectedLang);

    if (!isSupported) {
      await this.logUnsupportedLanguageAttempt(text, detectedLang, userId, sessionId);
      
      return {
        isSupported: false,
        detectedLanguage: detectedLang,
        supportedLanguages: this.supportedLanguages,
        alertMessage: this.generateUnsupportedLanguageAlert(detectedLang)
      };
    }

    return {
      isSupported: true,
      detectedLanguage: detectedLang
    };
  }

  // Generate user-friendly unsupported language alert
  generateUnsupportedLanguageAlert(detectedLang) {
    const languageNames = {
      'en-US': 'English',
      'am-ET': 'Amharic', 
      'ti-ET': 'Tigrigna',
      'om-ET': 'Afan Oromo'
    };

    const detectedName = multilingualService.getLanguageName(detectedLang);
    const supportedNames = this.supportedLanguages.map(lang => languageNames[lang]).join(', ');

    return `We detected ${detectedName} which isn't fully supported yet. Please use one of our supported languages: ${supportedNames}. For the best experience, we recommend using ${supportedNames}.`;
  }

  // Log unsupported language attempts for analytics
  async logUnsupportedLanguageAttempt(text, detectedLang, userId, sessionId) {
    try {
      await db('unsupported_language_logs').insert({
        user_id: userId,
        session_id: sessionId,
        detected_language: detectedLang,
        input_text: text.substring(0, 500),
        timestamp: new Date()
      });

      // Update cache for rate limiting
      this.updateUnsupportedLanguageCache(userId, detectedLang);
    } catch (error) {
      console.error('Failed to log unsupported language attempt:', error);
    }
  }

  // Update cache for rate limiting and patterns
  updateUnsupportedLanguageCache(userId, detectedLang) {
    const cacheKey = `unsupported_${userId}`;
    
    if (!this.unsupportedLanguageCache.has(cacheKey)) {
      this.unsupportedLanguageCache.set(cacheKey, {
        userId,
        attempts: [],
        firstAttempt: new Date()
      });
    }

    const userData = this.unsupportedLanguageCache.get(cacheKey);
    userData.attempts.push({
      language: detectedLang,
      timestamp: new Date()
    });

    // Keep only last 10 attempts
    if (userData.attempts.length > 10) {
      userData.attempts.shift();
    }

    this.unsupportedLanguageCache.set(cacheKey, userData);
  }

  // Get unsupported language statistics
  async getUnsupportedLanguageStats(timeframe = '7days') {
    let startTime = new Date();
    
    switch (timeframe) {
      case '24hours':
        startTime.setHours(startTime.getHours() - 24);
        break;
      case '7days':
        startTime.setDate(startTime.getDate() - 7);
        break;
      case '30days':
        startTime.setDate(startTime.getDate() - 30);
        break;
      default:
        startTime.setDate(startTime.getDate() - 7);
    }

    const stats = await db('unsupported_language_logs')
      .where('timestamp', '>=', startTime)
      .select(
        'detected_language',
        db.raw('COUNT(*) as attempt_count'),
        db.raw('COUNT(DISTINCT user_id) as unique_users')
      )
      .groupBy('detected_language')
      .orderBy('attempt_count', 'desc');

    const totalAttempts = stats.reduce((sum, stat) => sum + parseInt(stat.attempt_count), 0);

    return {
      timeframe,
      totalAttempts,
      uniqueUsers: stats.reduce((sum, stat) => sum + parseInt(stat.unique_users), 0),
      byLanguage: stats.map(stat => ({
        language: stat.detected_language,
        attempts: parseInt(stat.attempt_count),
        uniqueUsers: parseInt(stat.unique_users),
        percentage: (parseInt(stat.attempt_count) / totalAttempts) * 100
      }))
    };
  }

  // Check if user has pattern of unsupported language usage
  hasUnsupportedLanguagePattern(userId) {
    const cacheKey = `unsupported_${userId}`;
    
    if (!this.unsupportedLanguageCache.has(cacheKey)) {
      return false;
    }

    const userData = this.unsupportedLanguageCache.get(cacheKey);
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Count attempts in last hour
    const recentAttempts = userData.attempts.filter(
      attempt => attempt.timestamp > oneHourAgo
    );

    return recentAttempts.length >= 5; // Pattern if 5+ attempts in last hour
  }

  // Get recommendation for user with unsupported language pattern
  getLanguageRecommendation(userId) {
    const cacheKey = `unsupported_${userId}`;
    
    if (!this.unsupportedLanguageCache.has(cacheKey)) {
      return null;
    }

    const userData = this.unsupportedLanguageCache.get(cacheKey);
    
    // Find most frequently attempted unsupported language
    const languageCounts = {};
    userData.attempts.forEach(attempt => {
      languageCounts[attempt.language] = (languageCounts[attempt.language] || 0) + 1;
    });

    const mostFrequent = Object.keys(languageCounts).reduce((a, b) => 
      languageCounts[a] > languageCounts[b] ? a : b
    );

    return {
      detectedPreference: mostFrequent,
      recommendation: `We see you frequently use ${multilingualService.getLanguageName(mostFrequent)}. While we work on adding full support, you might find our ${this.getClosestSupportedLanguage(mostFrequent)} support helpful for now.`,
      supportedAlternatives: this.getSupportedAlternatives(mostFrequent)
    };
  }

  // Find closest supported language
  getClosestSupportedLanguage(unsupportedLang) {
    // Simple mapping - in production, this would use linguistic analysis
    const mappings = {
      'fr': 'en-US', // French → English
      'ar': 'en-US', // Arabic → English
      'so': 'om-ET', // Somali → Oromo
      'sw': 'en-US'  // Swahili → English
    };

    const baseLang = unsupportedLang.split('-')[0];
    return mappings[baseLang] || 'en-US';
  }

  // Get supported alternatives for an unsupported language
  getSupportedAlternatives(unsupportedLang) {
    const baseLang = unsupportedLang.split('-')[0];
    
    const alternatives = {
      'fr': ['English'], // French
      'ar': ['English'], // Arabic  
      'so': ['Afan Oromo', 'English'], // Somali
      'sw': ['English'] // Swahili
    };

    return alternatives[baseLang] || ['English'];
  }
}

module.exports = new LanguageAlertService();