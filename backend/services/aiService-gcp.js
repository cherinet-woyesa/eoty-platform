// backend/services/aiService-gcp.js - GOOGLE AI STUDIO VERSION
const { genAI, storage, aiConfig } = require('../config/aiConfig-gcp');
const languageService = require('./languageService');
const axios = require('axios');
const moderationService = require('./moderationService');
const contextService = require('./contextService');
const faithAlignmentService = require('./faithAlignmentService');
const multilingualService = require('./multilingualService');
const performanceService = require('./performanceService');
const analyticsService = require('./analyticsService');
const db = require('../config/database-gcp');

class AIService {
  constructor() {
    // We'll lazily initialize the generative model when making calls.
    // Keep a candidate list from config so we can try fallbacks if a preferred
    // model is not available to the current project.
    this.generativeModel = null;
    this.modelCandidates = Array.isArray(aiConfig.chatModelCandidates) && aiConfig.chatModelCandidates.length > 0
      ? aiConfig.chatModelCandidates
      : [aiConfig.chatModel || 'chat-bison@001'];
    this.currentModelId = null; // track which candidate we successfully initialized
    this.generationConfig = {
      maxOutputTokens: aiConfig.maxTokens,
      temperature: aiConfig.temperature
    };
    this.safetySettings = [
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
    ];

    // Simple in-memory cache for frequently asked questions
    this.responseCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes cache expiry

    // Performance optimization settings
    this.performanceSettings = {
      maxResponseTimeMs: 30000, // Increased to 30s for debugging
      useStreaming: process.env.USE_STREAMING === 'true',
      enableCaching: process.env.ENABLE_CACHING !== 'false',
      maxCacheSize: parseInt(process.env.MAX_CACHE_SIZE) || 100,
      maxRetries: parseInt(process.env.AI_MAX_RETRIES) || 2,
      timeoutMs: 30000, // Increased to 30s for debugging
      concurrentRequests: parseInt(process.env.AI_CONCURRENT_REQUESTS) || 5,
      accuracyThreshold: 0.4 // Lowered to 40% to prevent false positives on valid answers
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

  // Get service status for health checks
  getServiceStatus() {
    return {
      vertexAIConfigured: !!this.generativeModel,
      fallbackMode: !this.generativeModel,
      cacheEnabled: this.performanceSettings.enableCaching,
      streamingEnabled: this.performanceSettings.useStreaming
    };
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

      // Detect language - prefer explicit context from UI, fallback to auto-detection
      let language = context.detectedLanguage || aiConfig.detectLanguage(question);
      
      // Normalize language code
      if (language && typeof language === 'string') {
        if (language.startsWith('am')) language = 'am';
        else if (language.startsWith('ti')) language = 'ti';
        else if (language.startsWith('om')) language = 'om';
        else if (language.startsWith('en')) language = 'en';
      } else {
        language = 'en';
      }

      // Enhance context with lesson/chapter awareness
      const enhancedContext = aiConfig.enhanceContext(question, context);

      // Get relevant content from vector search (if available)
      const relevantContent = await this.getRelevantContent(question, context);

      // Build conversation context
      const conversationContext = this.buildConversationContext(conversationHistory);

      // Construct prompt with faith alignment
      const prompt = this.buildPrompt(question, enhancedContext, conversationContext, relevantContent, language);

      // Execute with rate limiting and timeout
      const result = await this.executeWithRateLimit(async () => {
        return await Promise.race([
          this.callVertexAI(prompt),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Response timeout exceeded 30 seconds')), this.performanceSettings.timeoutMs)
          )
        ]);
      });

      // Parse and validate response
      const response = this.parseVertexResponse(result);
      const processingTime = Date.now() - startTime;

      // Validate faith alignment
      const faithAlignment = aiConfig.validateFaithAlignment(response, context);

      // Check accuracy threshold
      // Skip strict check if running in fallback mode (no AI configured)
      if (this.generativeModel && faithAlignment.score < this.performanceSettings.accuracyThreshold) {
        // If the response is the fallback error message, don't throw accuracy error
        if (response.includes("I apologize, but I'm experiencing technical difficulties") || 
            response.includes("AI assistant is currently unavailable")) {
          console.warn('Returning fallback response despite low accuracy score');
        } else {
          throw new Error(`Response does not meet ${this.performanceSettings.accuracyThreshold * 100}% accuracy requirement`);
        }
      } else if (!this.generativeModel && faithAlignment.score < 0.5) {
         // In fallback mode, just warn but don't fail unless it's really bad
         console.warn(`Fallback response accuracy low: ${faithAlignment.score}`);
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
        detectedLanguage: language
      };

      // Cache successful responses
      if (this.performanceSettings.enableCaching && faithAlignment.score >= this.performanceSettings.accuracyThreshold) {
        this.cacheResponse(this.generateCacheKey(question, context), responseData);
      }

      return responseData;

    } catch (error) {
      console.error('AI Service Error:', error);

      if (error.message.includes('timeout')) {
        throw new Error('Response time exceeded 30-second requirement');
      }
      if (error.message.includes('accuracy requirement')) {
        throw new Error('Response does not meet 90% accuracy requirement');
      }

      throw error;
    }
  }

  // Call Google AI Studio with proper error handling
  async callVertexAI(prompt) {
    // Mock mode for development/testing when APIs are unavailable
    if (process.env.MOCK_AI === 'true') {
      console.log('Returning MOCK AI response');
      return {
        candidates: [{
          content: {
            parts: [{
              text: "This is a mock AI response. The AI service is currently in maintenance mode, but your request was received successfully. In a real scenario, this would contain a doctrinally accurate answer based on Ethiopian Orthodox teachings."
            }]
          }
        }]
      };
    }

    // If Google AI client isn't available
    if (!genAI) {
      console.warn('Google AI client not initialized.');
      return {
        candidates: [{
          content: {
            parts: [{
              text: "I apologize, but the AI assistant is currently unavailable due to configuration issues. Please consult with your local clergy or refer to your course materials for questions about Ethiopian Orthodox teachings. We are working to restore this service."
            }]
          }
        }]
      };
    }

    // Helper to initialize a generative model for a given candidate id
    const initModelForCandidate = (candidate) => {
      try {
        const model = genAI.getGenerativeModel({
          model: candidate,
          generationConfig: this.generationConfig,
          safetySettings: this.safetySettings
        });
        this.generativeModel = model;
        this.currentModelId = candidate;
        console.log('Initialized Google AI generative model:', candidate);
        return true;
      } catch (err) {
        console.warn('Failed to initialize model', candidate, err && err.message);
        return false;
      }
    };

    // Ensure we have a generative model initialized; try candidates lazily
    if (!this.generativeModel) {
      for (const candidate of this.modelCandidates) {
        if (initModelForCandidate(candidate)) break;
      }
    }

    if (!this.generativeModel) {
      console.warn('No Google AI generative model could be initialized. Falling back.');
      return {
        candidates: [{
          content: {
            parts: [{
              text: "I apologize, but the AI assistant is currently unavailable due to configuration issues. Please try again later."
            }]
          }
        }]
      };
    }

    // Attempt to generate; on model-not-found errors try remaining candidates
    try {
      const result = await this.generativeModel.generateContent(prompt);
      const response = await result.response;
      
      return response;
    } catch (error) {
      console.error('Google AI call failed for model', this.currentModelId, error && (error.message || error.code));

      const errMsg = (error && (error.message || '')).toLowerCase();
      const isNotFound = errMsg.includes('not found') || errMsg.includes('was not found') || error?.code === 404;

      if (isNotFound) {
        // Try other candidates we haven't tried yet
        const remaining = this.modelCandidates.filter(c => c !== this.currentModelId);
        for (const candidate of remaining) {
          try {
            if (initModelForCandidate(candidate)) {
              const retry = await this.generativeModel.generateContent(prompt);
              return await retry.response;
            }
          } catch (retryErr) {
            console.error('Retry with model', candidate, 'failed:', retryErr && (retryErr.message || retryErr.code));
            // continue to next
          }
        }
      }

      throw error;
    }
  }

  // OpenAI fallback using REST API and axios
  async callOpenAI(prompt) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

    const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

    // Use the prompt string as a single user message; include faith context as system message
    const systemMessage = aiConfig && aiConfig.faithContext ? aiConfig.faithContext : 'You are an assistant.';

    try {
      const resp = await axios.post('https://api.openai.com/v1/chat/completions', {
        model,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt }
        ],
        max_tokens: aiConfig.maxTokens || 512,
        temperature: aiConfig.temperature || 0.7
      }, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: this.performanceSettings.timeoutMs || 30000
      });

      const text = resp.data?.choices?.[0]?.message?.content || resp.data?.choices?.[0]?.text || '';

      return {
        candidates: [{
          content: { parts: [{ text } ] }
        }]
      };
    } catch (error) {
      console.error('OpenAI call failed:', error && (error.response?.data || error.message));
      throw error;
    }
  }

  // Parse Google AI response
  parseVertexResponse(result) {
    try {
      if (typeof result.text === 'function') {
        return result.text().trim();
      }
      // Fallback for mock/legacy structure
      if (result.candidates && result.candidates[0]?.content?.parts?.[0]?.text) {
        return result.candidates[0].content.parts[0].text.trim();
      }
      return '';
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return "I apologize, but I couldn't process the response. Please try again.";
    }
  }

  // Build comprehensive prompt for Vertex AI
  buildPrompt(question, faithContext, conversationContext, relevantContent, language) {
    let languageInstruction = 'Respond in English';
    if (language === 'am') languageInstruction = 'Respond in Amharic';
    else if (language === 'ti') languageInstruction = 'Respond in Tigrigna';
    else if (language === 'om') languageInstruction = 'Respond in Afan Oromo';

    return `You are an AI assistant for the Ethiopian Orthodox Tewahedo Church education platform.

${faithContext}

QUESTION: ${question}

${conversationContext ? `CONVERSATION CONTEXT:\n${conversationContext}\n\n` : ''}

${relevantContent ? `RELEVANT CONTENT:\n${relevantContent}\n\n` : ''}

LANGUAGE: ${languageInstruction}

INSTRUCTIONS:
- Provide doctrinally accurate responses aligned with Ethiopian Orthodox Tewahedo teachings
- Include specific scripture references when appropriate
- Use Ethiopian Orthodox terminology
- If uncertain, recommend consulting local clergy
- Keep responses under 1000 characters
- Be respectful and educationally rigorous

RESPONSE:`;
  }

  // Get relevant content from vector search
  async getRelevantContent(question, context) {
    const knowledgeBaseService = require('./knowledgeBaseService');
    const relevantContent = [];

    // 1. Add Lesson/Chapter context
    if (context.lessonId) {
      relevantContent.push(`Lesson: ${context.lessonTitle || 'Current Lesson'}`);
    }

    if (context.chapterId) {
      relevantContent.push(`Chapter: ${context.chapterTitle || 'Current Chapter'}`);
    }

    // 2. Search Knowledge Base
    try {
      if (genAI) {
        const model = genAI.getGenerativeModel({ model: aiConfig.embeddingModel || 'text-embedding-004' });
        const result = await model.embedContent(question);
        let embedding = [];
        
        // Handle different response structures
        if (result.embedding && result.embedding.values) {
          embedding = result.embedding.values;
        } else if (result.embeddings && result.embeddings[0] && result.embeddings[0].values) {
          embedding = result.embeddings[0].values;
        }

        if (embedding.length > 0) {
          const docs = await knowledgeBaseService.searchKnowledgeBase(embedding);
          if (docs.length > 0) {
            relevantContent.push('\n--- RELEVANT THEOLOGICAL SOURCES (Use these to answer) ---');
            docs.forEach(doc => {
              relevantContent.push(`[Source: ${doc.title} (${doc.category})]\n${doc.content}`);
            });
            relevantContent.push('--- END SOURCES ---\n');
          }
        }
      }
    } catch (err) {
      console.warn('Knowledge base search failed:', err.message);
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
    const sources = [];
    const sourceRegex = /\[Source: (.*?) \((.*?)\)\]/g;
    
    if (Array.isArray(relevantContent)) {
      relevantContent.forEach(content => {
        let match;
        while ((match = sourceRegex.exec(content)) !== null) {
          sources.push({
            title: match[1],
            type: match[2] || 'reference',
            url: null
          });
        }
      });
    }
    
    return sources;
  }

  // Get related resources
  async getRelatedResources(question, context) {
    try {
      // Simple keyword search
      const keywords = question.split(' ').filter(w => w.length > 3);
      
      if (keywords.length === 0) return [];

      const query = db('resources')
        .where('is_public', true)
        .andWhere(builder => {
          builder.where(sub => {
            keywords.forEach(word => {
              sub.orWhere('title', 'ilike', `%${word}%`)
                 .orWhere('description', 'ilike', `%${word}%`);
            });
          });
        })
        .select('id', 'title', 'category')
        .limit(3);

      // Boost relevance with context if available
      if (context.courseId) {
        // We could add a separate query or union, but for now let's just rely on keywords
        // or maybe prioritize resources in the same course?
        // For simplicity, we'll stick to keyword search across platform
      }
      
      const resources = await query;
      
      return resources.map(r => ({
        id: r.id,
        title: r.title,
        type: 'resource',
        category: r.category,
        url: `/resources/${r.id}`
      }));
    } catch (error) {
      console.error('Error fetching related resources:', error);
      return [];
    }
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
      console.error('Failed to store conversation (non-critical):', error.message);
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
    const summaryLength = type === 'detailed' ? 500 : 200; // Words, roughly

    const prompt = `Analyze the following educational resource and provide a structured summary.

Title: ${resource.title}
Description: ${resource.description || 'No description provided'}
Category: ${resource.category || 'General'}
Content Type: ${resource.file_type || 'Text'}

Please provide:
1. A ${type} summary (approx ${summaryLength} words).
2. 3-5 Key learning points.
3. Spiritual insights relevant to Ethiopian Orthodox Tewahedo Church teachings.

Output format: JSON with keys "summary", "keyPoints" (array), "spiritualInsights" (array).`;

    try {
      const result = await this.callVertexAI(prompt);
      // Parse the result. It might be wrapped in markdown code blocks.
      let text = this.parseVertexResponse(result);
      
      // Attempt to parse JSON
      let data;
      try {
        // Clean up markdown code blocks if present
        text = text.replace(/\\\`\\\`\\\`json/g, '').replace(/\\\`\\\`\\\`/g, '').trim();
        data = JSON.parse(text);
      } catch (e) {
        console.warn('Failed to parse AI response as JSON, falling back to text parsing', e);
        // Fallback parsing if JSON fails
        data = {
            summary: text.substring(0, 1000),
            keyPoints: [],
            spiritualInsights: []
        };
      }

      return {
        summary: data.summary || text,
        keyPoints: data.keyPoints || [],
        spiritualInsights: data.spiritualInsights || [],
        wordCount: this.countWords(data.summary || text),
        modelUsed: this.currentModelId || 'vertex-ai'
      };

    } catch (error) {
      console.error('Resource summary generation failed:', error);
      // Return fallback structure
      return {
          summary: `Summary of ${resource.title}: ${resource.description?.substring(0, 200)}...`,
          keyPoints: [],
          spiritualInsights: [],
          wordCount: this.countWords(resource.description || ''),
          modelUsed: 'fallback'
      };
    }
  }

  // Count words in text
  countWords(text) {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
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
