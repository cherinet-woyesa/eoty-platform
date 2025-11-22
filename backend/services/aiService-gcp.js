// backend/services/aiService-gcp.js - GOOGLE CLOUD VERTEX AI VERSION
const { vertexAI, storage, aiConfig } = require('../config/aiConfig-gcp');
const languageService = require('./languageService');
const moderationService = require('./moderationService');
const contextService = require('./contextService');
const faithAlignmentService = require('./faithAlignmentService');
const multilingualService = require('./multilingualService');
const performanceService = require('./performanceService');
const analyticsService = require('./analyticsService');
const db = require('../config/database-gcp');

class AIService {
  constructor() {
    // Initialize Vertex AI model
    this.generativeModel = vertexAI ? vertexAI.preview.getGenerativeModel({
      model: aiConfig.chatModel,
      generationConfig: {
        maxOutputTokens: aiConfig.maxTokens,
        temperature: aiConfig.temperature,
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
      ],
    }) : null;

    // Simple in-memory cache for frequently asked questions
    this.responseCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes cache expiry

    // Performance optimization settings
    this.performanceSettings = {
      maxResponseTimeMs: 3000, // 3 seconds max response time (REQUIREMENT)
      useStreaming: process.env.USE_STREAMING === 'true',
      enableCaching: process.env.ENABLE_CACHING !== 'false',
      maxCacheSize: parseInt(process.env.MAX_CACHE_SIZE) || 100,
      maxRetries: parseInt(process.env.AI_MAX_RETRIES) || 2,
      timeoutMs: 3000, // Hard 3-second timeout (REQUIREMENT: < 3 seconds)
      concurrentRequests: parseInt(process.env.AI_CONCURRENT_REQUESTS) || 5,
      accuracyThreshold: 0.9 // 90% accuracy requirement
    };

    // Privacy settings
    this.privacySettings = {
      retainConversationData: process.env.RETAIN_CONVERSATION_DATA === 'true',
      retentionPeriodDays: parseInt(process.env.CONVERSATION_RETENTION_DAYS) || 30,
      anonymizeUserData: process.env.ANONYMIZE_USER_DATA === 'true'
    };

    // Rate limiting for concurrent requests
    this.requestQueue = [];
    this.activeRequests = 0;
  }

  // Rate limiting implementation to prevent overwhelming the AI service
  async executeWithRateLimit(fn) {
    return new Promise((resolve, reject) => {
      const request = { fn, resolve, reject };

      // Add to queue
      this.requestQueue.push(request);

      // Process queue
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.activeRequests >= this.performanceSettings.concurrentRequests || this.requestQueue.length === 0) {
      return;
    }

    this.activeRequests++;
    const request = this.requestQueue.shift();

    try {
      const result = await request.fn();
      request.resolve(result);
    } catch (error) {
      request.reject(error);
    } finally {
      this.activeRequests--;
      // Process next item in queue
      setTimeout(() => this.processQueue(), 100);
    }
  }

  // Check if AI service is enabled
  isAIEnabled() {
    return !!this.generativeModel;
  }

  // Get performance metrics
  getPerformanceMetrics() {
    return {
      cacheSize: this.responseCache.size,
      maxCacheSize: this.performanceSettings.maxCacheSize,
      activeRequests: this.activeRequests,
      queuedRequests: this.requestQueue.length,
      cacheHitRate: 'high' // Would be calculated in production
    };
  }

  // Enhanced response generation with Vertex AI
  async generateResponse(question, context = {}, conversationHistory = []) {
    const startTime = Date.now();

    try {
      // Check cache first
      if (this.performanceSettings.enableCaching) {
        const cacheKey = this.generateCacheKey(question, context);
        const cached = this.getCachedResponse(cacheKey);
        if (cached) {
          console.log('Cache hit for question');
          return {
            response: cached.response,
            relevantContent: cached.relevantContent,
            sources: cached.sources,
            relatedResources: cached.relatedResources,
            faithAlignment: cached.faithAlignment,
            cacheHit: true,
            processingTime: Date.now() - startTime
          };
        }
      }

      // Detect language
      const detectedLanguage = aiConfig.detectLanguage(question);

      // Enhance context with lesson/chapter awareness
      const enhancedContext = aiConfig.enhanceContext(question, context);

      // Get relevant content from vector search (if available)
      const relevantContent = await this.getRelevantContent(question, context);

      // Build conversation context
      const conversationContext = this.buildConversationContext(conversationHistory);

      // Construct prompt with faith alignment
      const prompt = this.buildPrompt(question, enhancedContext, conversationContext, relevantContent, detectedLanguage);

      // Execute with rate limiting and timeout
      const result = await this.executeWithRateLimit(async () => {
        return await Promise.race([
          this.callVertexAI(prompt),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Response timeout exceeded 3 seconds')), this.performanceSettings.timeoutMs)
          )
        ]);
      });

      // Parse and validate response
      const response = this.parseVertexResponse(result);
      const processingTime = Date.now() - startTime;

      // Validate faith alignment
      const faithAlignment = aiConfig.validateFaithAlignment(response, context);

      // Check accuracy threshold
      if (faithAlignment.score < this.performanceSettings.accuracyThreshold) {
        throw new Error(`Response does not meet ${this.performanceSettings.accuracyThreshold * 100}% accuracy requirement`);
      }

      // Prepare response object
      const responseData = {
        response,
        relevantContent,
        sources: this.extractSources(relevantContent),
        relatedResources: await this.getRelatedResources(question, context),
        faithAlignment,
        cacheHit: false,
        processingTime,
        detectedLanguage
      };

      // Cache successful responses
      if (this.performanceSettings.enableCaching && faithAlignment.score >= this.performanceSettings.accuracyThreshold) {
        this.cacheResponse(this.generateCacheKey(question, context), responseData);
      }

      return responseData;

    } catch (error) {
      console.error('AI Service Error:', error);

      if (error.message.includes('timeout')) {
        throw new Error('Response time exceeded 3-second requirement');
      }
      if (error.message.includes('accuracy requirement')) {
        throw new Error('Response does not meet 90% accuracy requirement');
      }

      throw error;
    }
  }

  // Call Vertex AI with proper error handling
  async callVertexAI(prompt) {
    if (!this.generativeModel) {
      throw new Error('Vertex AI not initialized');
    }

    try {
      const result = await this.generativeModel.generateContent(prompt);
      const response = await result.response;
      return response;
    } catch (error) {
      console.error('Vertex AI call failed:', error);
      throw new Error(`AI service error: ${error.message}`);
    }
  }

  // Parse Vertex AI response
  parseVertexResponse(result) {
    try {
      const text = result.candidates[0].content.parts[0].text;
      return text.trim();
    } catch (error) {
      console.error('Failed to parse Vertex AI response:', error);
      throw new Error('Invalid response format from AI service');
    }
  }

  // Build comprehensive prompt for Vertex AI
  buildPrompt(question, faithContext, conversationContext, relevantContent, language) {
    return `You are an AI assistant for the Ethiopian Orthodox Tewahedo Church education platform.

${faithContext}

QUESTION: ${question}

${conversationContext ? `CONVERSATION CONTEXT:\n${conversationContext}\n\n` : ''}

${relevantContent ? `RELEVANT CONTENT:\n${relevantContent}\n\n` : ''}

LANGUAGE: ${language === 'am' ? 'Respond in Amharic' : 'Respond in English'}

INSTRUCTIONS:
- Provide doctrinally accurate responses aligned with Ethiopian Orthodox Tewahedo teachings
- Include specific scripture references when appropriate
- Use Ethiopian Orthodox terminology
- If uncertain, recommend consulting local clergy
- Keep responses under 1000 characters
- Be respectful and educationally rigorous

RESPONSE:`;
  }

  // Get relevant content from vector search (placeholder for future implementation)
  async getRelevantContent(question, context) {
    // TODO: Implement vector search with embeddings
    // For now, return lesson/chapter specific content if available
    const relevantContent = [];

    if (context.lessonId) {
      relevantContent.push(`Lesson: ${context.lessonTitle || 'Current Lesson'}`);
    }

    if (context.chapterId) {
      relevantContent.push(`Chapter: ${context.chapterTitle || 'Current Chapter'}`);
    }

    return relevantContent;
  }

  // Build conversation context from history
  buildConversationContext(history) {
    if (!history || history.length === 0) return '';

    const recentHistory = history.slice(-3); // Last 3 exchanges
    return recentHistory.map(item => `Q: ${item.question}\nA: ${item.response}`).join('\n\n');
  }

  // Extract sources from relevant content
  extractSources(relevantContent) {
    // TODO: Implement proper source extraction
    return relevantContent.map(content => ({
      title: content,
      type: 'context',
      url: null
    }));
  }

  // Get related resources (placeholder)
  async getRelatedResources(question, context) {
    // TODO: Implement resource recommendation logic
    return [];
  }

  // Generate cache key
  generateCacheKey(question, context) {
    const contextKey = JSON.stringify({
      lessonId: context.lessonId,
      chapterId: context.chapterId,
      language: aiConfig.detectLanguage(question)
    });
    return `${question.toLowerCase().trim()}-${contextKey}`;
  }

  // Get cached response
  getCachedResponse(key) {
    const cached = this.responseCache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
      return cached;
    }
    if (cached) {
      this.responseCache.delete(key); // Remove expired
    }
    return null;
  }

  // Cache response
  cacheResponse(key, data) {
    if (this.responseCache.size >= this.performanceSettings.maxCacheSize) {
      // Remove oldest entry (simple LRU)
      const firstKey = this.responseCache.keys().next().value;
      this.responseCache.delete(firstKey);
    }

    this.responseCache.set(key, {
      ...data,
      timestamp: Date.now()
    });
  }

  // Moderate query for sensitive content
  async moderateQuery(question, userId) {
    // Enhanced moderation with multiple checks
    const moderation = {
      needsModeration: false,
      flags: [],
      guidance: [],
      faithAlignmentScore: 0,
      confidence: 0.9
    };

    // Check for sensitive topics
    const sensitiveTopics = [
      'heresy', 'ecumenism', 'modern controversies', 'doctrinal disputes',
      'interfaith', 'theological debates', 'church politics'
    ];

    const questionLower = question.toLowerCase();
    sensitiveTopics.forEach(topic => {
      if (questionLower.includes(topic)) {
        moderation.flags.push('sensitive_topic');
        moderation.needsModeration = true;
        moderation.guidance.push('This question involves sensitive doctrinal matters that require review by church authorities.');
      }
    });

    // Faith alignment check
    const faithCheck = aiConfig.validateFaithAlignment(question, { isQuestion: true });
    moderation.faithAlignmentScore = faithCheck.score;

    if (!faithCheck.isAligned) {
      moderation.flags.push('faith_alignment_issue');
      moderation.needsModeration = true;
    }

    // Language check
    const languageCheck = aiConfig.detectLanguage(question);
    if (!aiConfig.supportedLanguages[languageCheck]) {
      moderation.flags.push('unsupported_language');
      moderation.needsModeration = true;
      moderation.guidance.push(`Language '${languageCheck}' is not currently supported. Please ask in Amharic or English.`);
    }

    return moderation;
  }

  // Store conversation for context
  async storeConversation(userId, sessionId, question, response, context, needsModeration = false) {
    try {
      // Store conversation metadata
      const conversationId = await this.ensureConversationExists(userId, sessionId);

      // Store individual messages
      await db('ai_messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: question,
        created_at: new Date()
      });

      await db('ai_messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: response,
        metadata: JSON.stringify({
          context,
          needsModeration,
          faithAlignment: aiConfig.validateFaithAlignment(response, context)
        }),
        created_at: new Date()
      });

      // Update conversation metadata
      await db('ai_conversations')
        .where({ id: conversationId })
        .update({
          last_activity: new Date(),
          message_count: db.raw('message_count + 2'),
          needs_moderation: needsModeration
        });

    } catch (error) {
      console.error('Failed to store conversation:', error);
      // Don't throw - conversation storage failure shouldn't break the response
    }
  }

  // Ensure conversation exists and return ID
  async ensureConversationExists(userId, sessionId) {
    let conversation = await db('ai_conversations')
      .where({ user_id: userId, session_id: sessionId })
      .first();

    if (!conversation) {
      const [newConversation] = await db('ai_conversations')
        .insert({
          user_id: userId,
          session_id: sessionId,
          created_at: new Date(),
          last_activity: new Date(),
          message_count: 0,
          needs_moderation: false
        })
        .returning('id');
      return newConversation.id;
    }

    return conversation.id;
  }

  // Get conversation history
  async getConversationHistory(userId, sessionId) {
    try {
      const conversation = await db('ai_conversations')
        .where({ user_id: userId, session_id: sessionId })
        .first();

      if (!conversation) return [];

      const messages = await db('ai_messages')
        .where({ conversation_id: conversation.id })
        .orderBy('created_at', 'asc')
        .select('role', 'content', 'created_at');

      // Convert to the expected format
      return messages.map(msg => ({
        question: msg.role === 'user' ? msg.content : null,
        response: msg.role === 'assistant' ? msg.content : null,
        timestamp: msg.created_at
      })).filter(item => item.question || item.response);

    } catch (error) {
      console.error('Failed to get conversation history:', error);
      return [];
    }
  }

  // Generate resource summary
  async generateResourceSummary(resource, type = 'brief') {
    // TODO: Implement resource summary generation with Vertex AI
    const summaryLength = type === 'detailed' ? 500 : 200;

    const prompt = `Summarize the following educational resource in ${summaryLength} characters or less:

Title: ${resource.title}
Description: ${resource.description}
Category: ${resource.category}

Summary type: ${type}

Focus on key learning objectives and Ethiopian Orthodox teachings covered.`;

    try {
      const result = await this.callVertexAI(prompt);
      const summary = this.parseVertexResponse(result);
      return summary.substring(0, summaryLength);
    } catch (error) {
      console.error('Resource summary generation failed:', error);
      return `Summary of ${resource.title}: ${resource.description?.substring(0, 100)}...`;
    }
  }

  // Validate summary quality
  async validateSummaryQuality(summary, resource) {
    // TODO: Implement summary validation
    return {
      isValid: true,
      score: 0.9,
      issues: [],
      suggestions: []
    };
  }
}

module.exports = new AIService();
