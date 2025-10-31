// backend/services/aiService.js - COMPLETE UPDATED VERSION
const { openai, pinecone, aiConfig } = require('../config/aiConfig');
const languageService = require('./languageService');
const moderationService = require('./moderationService');
const contextService = require('./contextService');
const faithAlignmentService = require('./faithAlignmentService');
const multilingualService = require('./multilingualService');
const performanceService = require('./performanceService');
const analyticsService = require('./analyticsService');
const db = require('../config/database');

class AIService {
  constructor() {
    // Only initialize Pinecone if available
    this.index = pinecone ? pinecone.Index(aiConfig.pineconeIndex) : null;
    
    // Simple in-memory cache for frequently asked questions
    this.responseCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes cache expiry
    
    // Performance optimization settings
    this.performanceSettings = {
      maxResponseTimeMs: 3000, // 3 seconds max response time
      useStreaming: process.env.USE_STREAMING === 'true',
      enableCaching: process.env.ENABLE_CACHING !== 'false',
      maxCacheSize: parseInt(process.env.MAX_CACHE_SIZE) || 100,
      maxRetries: parseInt(process.env.AI_MAX_RETRIES) || 2,
      timeoutMs: parseInt(process.env.AI_TIMEOUT_MS) || 5000,
      concurrentRequests: parseInt(process.env.AI_CONCURRENT_REQUESTS) || 5
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
  
  processQueue() {
    // Process requests while under the concurrent limit
    while (this.requestQueue.length > 0 && this.activeRequests < this.performanceSettings.concurrentRequests) {
      const request = this.requestQueue.shift();
      this.activeRequests++;
      
      // Execute the function
      request.fn()
        .then(result => {
          this.activeRequests--;
          request.resolve(result);
          this.processQueue(); // Process next request
        })
        .catch(error => {
          this.activeRequests--;
          request.reject(error);
          this.processQueue(); // Process next request
        });
    }
  }
  
  // Timeout wrapper for AI requests
  async executeWithTimeout(fn, timeoutMs = this.performanceSettings.timeoutMs) {
    return Promise.race([
      fn(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI request timeout')), timeoutMs)
      )
    ]);
  }
  
  // Retry mechanism for failed requests
  async executeWithRetry(fn, maxRetries = this.performanceSettings.maxRetries) {
    let lastError;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await this.executeWithTimeout(fn);
      } catch (error) {
        lastError = error;
        if (i < maxRetries) {
          // Exponential backoff
          const delay = Math.pow(2, i) * 100;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  // Check if AI services are available
  isAIEnabled() {
    return openai !== null && pinecone !== null;
  }

  // Generate embeddings for text with performance optimizations
  async generateEmbedding(text) {
    if (!openai) {
      throw new Error('OpenAI service is not configured. Please set OPENAI_API_KEY in your environment variables.');
    }
    
    // Use rate limiting and retry mechanism
    return this.executeWithRetry(async () => {
      const response = await openai.embeddings.create({
        model: aiConfig.embeddingModel,
        input: text,
      });
      return response.data[0].embedding;
    });
  }

  // Search for relevant faith content with performance optimizations
  async searchRelevantContent(query, context = {}) {
    if (!this.index) {
      console.warn('Pinecone service is not configured. Returning empty results.');
      return [];
    }
    
    // Use rate limiting and retry mechanism
    return this.executeWithRetry(async () => {
      try {
        // Use cached embedding if available
        const embeddingCacheKey = `embedding_${query}`;
        let queryEmbedding = this.responseCache.get(embeddingCacheKey);
        
        if (!queryEmbedding || Date.now() - queryEmbedding.timestamp > this.cacheExpiry) {
          queryEmbedding = await this.generateEmbedding(query);
          // Cache the embedding for future use
          this.responseCache.set(embeddingCacheKey, {
            data: queryEmbedding,
            timestamp: Date.now()
          });
        } else {
          queryEmbedding = queryEmbedding.data;
        }
        
        // Search in Pinecone with filters based on context
        const searchFilters = {};
        if (context.chapterId) {
          searchFilters.chapter_id = { $eq: context.chapterId };
        }
        if (context.courseId) {
          searchFilters.course_id = { $eq: context.courseId };
        }

        const searchResponse = await this.index.query({
          vector: queryEmbedding,
          topK: 5,
          includeMetadata: true,
          filter: Object.keys(searchFilters).length > 0 ? searchFilters : undefined,
          namespace: aiConfig.namespace
        });

        return [];
      } catch (error) {
        console.error('Content search error:', error);
        return [];
      }
    });
  }

  // Search for related resources in the database
  async searchRelatedResources(query, limit = 3) {
    try {
      // Use cached results if available
      const cacheKey = `resources_${query}_${limit}`;
      const cached = this.responseCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.data;
      }
      
      // First, generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Search for resources with similar content
      const resources = await db('resources')
        .select('id', 'title', 'description', 'category', 'tags')
        .limit(limit);
        
      // In a real implementation, we would use vector similarity search
      // For now, we'll return a sample of resources
      const results = resources.map(resource => ({
        id: resource.id,
        title: resource.title,
        description: resource.description,
        category: resource.category,
        tags: resource.tags ? resource.tags.split(',') : [],
        relevanceScore: Math.random() // Placeholder relevance score
      }));
      
      // Cache the results
      this.responseCache.set(cacheKey, {
        data: results,
        timestamp: Date.now()
      });
      
      return [];
    } catch (error) {
      console.error('Resource search error:', error);
      return [];
    }
  }

  // Moderate query for sensitive content with enhanced moderation
  async moderateQuery(query, userId) {
    // First, check if it's a vague or off-topic question that needs guidance
    const guidanceResponse = moderationService.handleVagueQuestion(query);
    if (guidanceResponse) {
      return {
        needsModeration: false,
        flags: ['guidance_needed'],
        guidance: [guidanceResponse.response],
        faithAlignmentScore: 0
      };
    }

    // Use comprehensive moderation
    const moderationResult = await moderationService.moderateContent(query, userId, 'question');
    
    // If it needs escalation, log it with appropriate priority
    if (moderationResult.needsModeration && moderationResult.flags.some(flag => 
      flag.includes('sensitive_topic') || flag.includes('problematic_phrase'))) {
      
      // Determine priority based on flags
      let priority = 'medium';
      if (moderationResult.flags.some(flag => 
        flag.includes('heresy') || flag.includes('doctrinal') || 
        flag.includes('political') || flag.includes('social'))) {
        priority = 'high';
      }
      
      await moderationService.escalateForReview(
        query, 
        userId, 
        `Auto-flagged: ${moderationResult.flags.join(', ')}`, 
        'question',
        priority
      );
    }

    return moderationResult;
  }

  // Check cache for existing response
  checkCache(question, context) {
    if (!this.performanceSettings.enableCaching) {
      return null;
    }
    
    const cacheKey = this.generateCacheKey(question, context);
    const cached = this.responseCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.response;
    }
    
    // Remove expired cache entry
    if (cached) {
      this.responseCache.delete(cacheKey);
    }
    
    return null;
  }

  // Store response in cache
  storeCache(question, context, response) {
    if (!this.performanceSettings.enableCaching) {
      return;
    }
    
    // Limit cache size
    if (this.responseCache.size >= this.performanceSettings.maxCacheSize) {
      // Remove the oldest entry
      const firstKey = this.responseCache.keys().next().value;
      if (firstKey) {
        this.responseCache.delete(firstKey);
      }
    }
    
    const cacheKey = this.generateCacheKey(question, context);
    this.responseCache.set(cacheKey, {
      response,
      timestamp: Date.now()
    });
  }

  // Generate cache key
  generateCacheKey(question, context) {
    // Create a simple hash of question and context
    const contextStr = JSON.stringify({
      chapterId: context.chapterId,
      courseId: context.courseId,
      lessonId: context.lessonId
    });
    
    return `${question}_${contextStr}`;
  }

  // ENHANCED: Get comprehensive context including user progress and learning patterns
  async getEnhancedContext(userId, context = {}) {
    try {
      const enhancedContext = await contextService.getEnhancedContext(userId, context);
      
      // Log context usage for analytics
      await db('context_usage_logs').insert({
        user_id: userId,
        context_type: Object.keys(context).join(','),
        context_data: JSON.stringify(context),
        timestamp: new Date()
      });

      return enhancedContext;
    } catch (error) {
      console.warn('Failed to get enhanced context:', error);
      
      // Fallback to basic context
      return await this.getDetailedContext(context);
    }
  }

  // Basic context fallback method
  async getDetailedContext(context = {}) {
    let detailedContext = {};
    
    // Get lesson information if available
    if (context.lessonId) {
      try {
        const lessonInfo = await db('lessons')
          .where({ id: context.lessonId })
          .select('title', 'description', 'content')
          .first();
          
        if (lessonInfo) {
          detailedContext.lesson = {
            title: lessonInfo.title,
            description: lessonInfo.description,
            content: lessonInfo.content ? lessonInfo.content.substring(0, 500) : ''
          };
        }
      } catch (error) {
        console.warn('Failed to fetch lesson context:', error);
      }
    }
    
    // Get course information if available
    if (context.courseId) {
      try {
        const courseInfo = await db('courses')
          .where({ id: context.courseId })
          .select('title', 'description')
          .first();
          
        if (courseInfo) {
          detailedContext.course = {
            title: courseInfo.title,
            description: courseInfo.description
          };
        }
      } catch (error) {
        console.warn('Failed to fetch course context:', error);
      }
    }
    
    // Get chapter information if available
    if (context.chapterId) {
      try {
        const chapterInfo = await db('chapters')
          .where({ id: context.chapterId })
          .select('name', 'region', 'description')
          .first();
          
        if (chapterInfo) {
          detailedContext.chapter = {
            name: chapterInfo.name,
            region: chapterInfo.region,
            description: chapterInfo.description
          };
        }
      } catch (error) {
        console.warn('Failed to fetch chapter context:', error);
      }
    }
    
    return detailedContext;
  }

  // NEW: Faith alignment validation for responses
  async validateResponseFaithAlignment(response, context = {}) {
    const faithValidation = await faithAlignmentService.validateFaithAlignment(
      response, 
      context.userQuery, 
      context
    );
    
    // Log faith alignment for analytics
    await db('faith_alignment_logs').insert({
      response_preview: response.substring(0, 200),
      alignment_score: faithValidation.score,
      validation_issues: JSON.stringify(faithValidation.issues),
      context: JSON.stringify(context),
      created_at: new Date()
    });

    return faithValidation;
  }

  // NEW: Check if a question requires scripture references
  requiresScriptureReference(question) {
    const scriptureKeywords = [
      'bible', 'scripture', 'gospel', 'psalm', 'prophet',
      'apostle', 'old testament', 'new testament', 'word of god'
    ];
    
    const questionLower = question.toLowerCase();
    return scriptureKeywords.some(keyword => questionLower.includes(keyword));
  }

  // NEW: Generate safe response when faith alignment is low
  async generateSafeResponse(userQuery, alignmentIssues) {
    const safePrompt = `
The previous response to this question had faith alignment issues: ${alignmentIssues.join(', ')}

Please provide a safe, doctrinally sound response that:
1. Stays within established Ethiopian Orthodox Tewahedo teachings
2. References general Orthodox principles without speculation
3. Recommends consulting local clergy for detailed guidance
4. Maintains educational value while ensuring doctrinal safety

User question: ${userQuery}
    `;

    try {
      const completion = await openai.chat.completions.create({
        model: aiConfig.chatModel,
        messages: [
          { 
            role: 'system', 
            content: 'Provide safe, doctrinally sound responses that align with Ethiopian Orthodox Tewahedo teachings. When in doubt, recommend consulting clergy.' 
          },
          { role: 'user', content: safePrompt }
        ],
        max_tokens: 800,
        temperature: 0.3, // Very low temperature for maximum safety
      });

      return completion.choices[0].message.content;
    } catch (error) {
      return "I recommend consulting with your local priest or Abune for guidance on this question, as it requires careful consideration within our Orthodox tradition.";
    }
  }

  // ENHANCED: Generate faith-aligned response with multilingual support
  async generateResponse(userQuery, context = {}, conversationHistory = []) {
    if (!openai) {
      // When AI is disabled, provide a more informative response
      return {
        response: "AI services are currently unavailable. Please contact the system administrator to configure OpenAI API keys. In the meantime, please refer to your course materials or consult with your local clergy for questions about Orthodox teachings.",
        relevantContent: [],
        sources: [],
        relatedResources: [],
        detectedLanguage: 'en-US',
        isAIDisabled: true,
        faithAlignment: { score: 0, isAligned: false, issues: ['AI disabled'] }
      };
    }
    
    try {
      // Check cache first
      const cachedResponse = this.checkCache(userQuery, context);
      if (cachedResponse) {
        console.log('Returning cached response for:', userQuery);
        cachedResponse.cacheHit = true;
        return cachedResponse;
      }

      // ENHANCED: Get comprehensive context
      const enhancedContext = await this.getEnhancedContext(context.userId, context);

      // ENHANCED: Multilingual language detection
      const detectedLanguage = await multilingualService.detectLanguage(userQuery, context);
      
      // Search for relevant content with performance optimizations
      const relevantContent = await this.searchRelevantContent(userQuery, context);
      
      // Search for related resources with performance optimizations
      const relatedResources = await this.searchRelatedResources(userQuery, 3);
      
      // Build context from relevant content
      const contextText = relevantContent
        .slice(0, 3) // Top 3 most relevant
        .map(item => `Source: ${item.source}\nContent: ${item.content}`)
        .join('\n\n');

      // Build conversation history context
      const historyContext = conversationHistory
        .slice(-8) // Last 8 messages for better context
        .map(msg => {
          const role = msg.role === 'user' ? 'Student' : 'Assistant';
          const content = msg.content.length > 150 ? msg.content.substring(0, 150) + '...' : msg.content;
          return `${role}: ${content}`;
        })
        .join('\n');

      // Enhanced context building with detailed lesson, course, and chapter information
      let enhancedContextText = '';
      
      // Add detailed lesson context if available
      if (enhancedContext.basic?.lesson) {
        enhancedContextText += `\nCURRENT LESSON CONTEXT:
Title: ${enhancedContext.basic.lesson.title}
Description: ${enhancedContext.basic.lesson.description}
Objectives: ${enhancedContext.basic.lesson.objectives?.join(', ') || 'Not specified'}
Difficulty: ${enhancedContext.basic.lesson.difficulty || 'Not specified'}`;

        if (enhancedContext.basic.lesson.resources?.length > 0) {
          enhancedContextText += `\nLesson Resources: ${enhancedContext.basic.lesson.resources.map(r => r.title).join(', ')}`;
        }
      }
      
      // Add course context
      if (enhancedContext.basic?.course) {
        enhancedContextText += `\n\nCURRENT COURSE CONTEXT:
Title: ${enhancedContext.basic.course.title}
Category: ${enhancedContext.basic.course.category}
Level: ${enhancedContext.basic.course.level}
Total Lessons: ${enhancedContext.basic.course.totalLessons}`;

        if (enhancedContext.basic.course.curriculum?.length > 0) {
          enhancedContextText += `\nCourse Curriculum: ${enhancedContext.basic.course.curriculum.map(l => l.title).join(' → ')}`;
        }
      }
      
      // Add chapter context
      if (enhancedContext.basic?.chapter) {
        enhancedContextText += `\n\nCHAPTER CONTEXT:
Name: ${enhancedContext.basic.chapter.name}
Region: ${enhancedContext.basic.chapter.region}
Description: ${enhancedContext.basic.chapter.description}`;
      }

      // Add user progress context
      if (enhancedContext.userProgress?.currentLesson) {
        const progress = enhancedContext.userProgress.currentLesson;
        enhancedContextText += `\n\nUSER PROGRESS:
Current Lesson Completion: ${progress.completion_percentage || 0}%
${progress.notes ? `User Notes: ${progress.notes}\n` : ''}`;
      }

      // ENHANCED: Get faith-aligned prompt in the detected language
      const faithPrompt = await multilingualService.getFaithPrompt(detectedLanguage, {
        ...enhancedContext,
        userQuery
      });

      // ENHANCED: Build multilingual system prompt
      const systemPrompt = `${faithPrompt}

RELEVANT FAITH CONTENT:
${contextText}

${conversationHistory.length > 0 ? `RECENT DIALOGUE HISTORY:\n${historyContext}\n\n` : ''}
DETAILED CONTEXT:
${JSON.stringify(enhancedContext, null, 2)}
${enhancedContextText}

RESPONSE REQUIREMENTS:
- Respond in the same language as the user's question (${multilingualService.getLanguageName(detectedLanguage)})
- Use appropriate Ethiopian Orthodox terminology for the language
- Maintain doctrinal accuracy across all languages
- Reference Ethiopian sources and traditions
- Consider the student's progress and learning context
- Connect answers to previously discussed topics when appropriate

Current user question (${multilingualService.getLanguageName(detectedLanguage)}): ${userQuery}`;

      // ENHANCED: Use faith-aligned response generation
      const faithAlignedResult = await faithAlignmentService.generateFaithAlignedResponse(
        userQuery,
        { ...enhancedContext, userQuery },
        conversationHistory
      );

      const aiResponse = faithAlignedResult.response;
      const faithAlignment = faithAlignedResult.faithAlignment;

      // ENHANCED: If faith alignment is low, generate a safer response
      let finalResponse = aiResponse;
      if (!faithAlignment.isAligned && faithAlignment.score < 0.7) {
        console.warn(`Low faith alignment detected: ${faithAlignment.score}`);
        finalResponse = await this.generateSafeResponse(userQuery, faithAlignment.issues);
        
        // Re-validate the safe response
        const safeFaithAlignment = await this.validateResponseFaithAlignment(finalResponse, {
          userQuery,
          context: enhancedContext,
          isSafeResponse: true
        });
        
        faithAlignment.score = safeFaithAlignment.score;
        faithAlignment.isAligned = safeFaithAlignment.isAligned;
      }

      const response = {
        response: finalResponse,
        relevantContent: relevantContent.slice(0, 3),
        sources: relevantContent.map(item => item.source),
        relatedResources: relatedResources,
        detectedLanguage: detectedLanguage,
        faithAlignment: faithAlignment, // Enhanced faith alignment data
        cacheHit: false
      };

      // Store in cache for future use
      this.storeCache(userQuery, context, response);

      return response;
    } catch (error) {
      console.error('AI response generation error:', error);
      return {
        response: "I'm sorry, but I encountered an error while processing your question. Please try again later.",
        relevantContent: [],
        sources: [],
        relatedResources: [],
        detectedLanguage: 'en-US',
        faithAlignment: { score: 0, isAligned: false, issues: ['System error'] }
      };
    }
  }

  // NEW: Generate resource summary for FR3
  async generateResourceSummary(resource, type = 'brief') {
    if (!openai) {
      throw new Error('AI services are not configured. Please set OPENAI_API_KEY in your environment variables.');
    }
    
    try {
      const prompt = this.buildSummaryPrompt(resource, type);
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert in Ethiopian Orthodox Christianity and religious education. Provide accurate, faithful summaries that align with Orthodox doctrine."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: type === 'brief' ? 300 : 600,
        temperature: 0.3, // Lower temperature for more consistent outputs
      });

      const summaryText = completion.choices[0].message.content;
      
      return this.parseSummaryResponse(summaryText, type);
    } catch (error) {
      console.error('AI Resource Summary Error:', error);
      throw new Error('Failed to generate AI summary');
    }
  }

  // Build prompt for resource summarization
  buildSummaryPrompt(resource, type) {
    const wordLimit = type === 'brief' ? '150-200' : '400-500';
    
    return `
Please analyze this religious resource and provide a ${type} summary:

RESOURCE INFORMATION:
Title: ${resource.title}
Author: ${resource.author || 'Unknown'}
Category: ${resource.category}
Description: ${resource.description || 'No description provided'}

REQUIREMENTS:
- Generate a ${wordLimit} word summary in ${resource.language || 'English'}
- Extract 3-5 key theological points
- Provide 2-3 spiritual insights relevant to Orthodox Christian practice
- Ensure alignment with Ethiopian Orthodox doctrine
- Focus on practical application for youth education

FORMAT YOUR RESPONSE AS JSON:
{
  "summary": "main summary text here",
  "keyPoints": ["point1", "point2", "point3"],
  "spiritualInsights": ["insight1", "insight2"],
  "wordCount": number,
  "relevanceScore": 0.95
}
    `;
  }

  // Parse AI summary response
  parseSummaryResponse(response, type) {
    try {
      // Try to parse as JSON first
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          summary: parsed.summary,
          keyPoints: parsed.keyPoints || [],
          spiritualInsights: parsed.spiritualInsights || [],
          wordCount: parsed.wordCount || this.countWords(parsed.summary),
          relevanceScore: Math.min(parsed.relevanceScore || 0.90, 1.0),
          modelUsed: 'gpt-4'
        };
      }

      // Fallback: simple text parsing
      const lines = response.split('\n').filter(line => line.trim());
      const summary = lines[0] || 'Summary not available';
      
      return {
        summary,
        keyPoints: lines.slice(1, 4).filter(point => point.length > 10),
        spiritualInsights: lines.slice(4, 6).filter(insight => insight.length > 10),
        wordCount: this.countWords(summary),
        relevanceScore: 0.85,
        modelUsed: 'gpt-4'
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return this.getFallbackSummary(type);
    }
  }

  // Fallback summary if AI fails
  getFallbackSummary(type) {
    const briefSummary = "This resource discusses important aspects of Orthodox Christian faith and practice. Further study is recommended for deeper understanding.";
    const detailedSummary = "This religious text contains valuable insights into Orthodox Christian doctrine and spiritual practice. It covers fundamental teachings that are essential for faith development and religious education.";

    return {
      summary: type === 'brief' ? briefSummary : detailedSummary,
      keyPoints: [
        "Orthodox Christian teachings",
        "Spiritual development guidance", 
        "Religious practice instructions"
      ],
      spiritualInsights: [
        "Emphasizes the importance of prayer and worship",
        "Highlights the value of community in spiritual growth"
      ],
      wordCount: type === 'brief' ? 25 : 45,
      relevanceScore: 0.75,
      modelUsed: 'fallback'
    };
  }

  // Count words in text
  countWords(text) {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  // Validate summary quality
  async validateSummaryQuality(summary, resource) {
    // Basic quality checks
    const checks = {
      hasContent: summary.summary.length > 50,
      hasKeyPoints: summary.keyPoints.length >= 2,
      hasInsights: summary.spiritualInsights.length >= 1,
      wordCountAppropriate: summary.wordCount >= (summary.summaryType === 'brief' ? 100 : 300),
      relevanceScore: summary.relevanceScore >= 0.80
    };

    const passedChecks = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.values(checks).length;
    
    return {
      passed: passedChecks >= 3, // At least 3/5 checks must pass
      score: passedChecks / totalChecks,
      details: checks
    };
  }

  // Store conversation with enhanced metadata and privacy compliance
  async storeConversation(userId, sessionId, userMessage, aiResponse, context, needsModeration = false) {
    // If privacy settings disable conversation retention, don't store anything
    if (!this.privacySettings.retainConversationData) {
      console.log('Conversation data retention disabled by privacy settings');
      return null;
    }
    
    const trx = await db.transaction();
    
    try {
      // Find or create conversation
      let conversation = await trx('ai_conversations')
        .where({ user_id: userId, session_id: sessionId })
        .first();

      if (!conversation) {
        [conversation] = await trx('ai_conversations')
          .insert({
            user_id: userId,
            session_id: sessionId,
            context_data: JSON.stringify(context)
          })
          .returning('*');
      }

      // Store messages with enhanced metadata including faith alignment
      const userMetadata = {
        needsModeration,
        timestamp: new Date().toISOString(),
        context: context
      };

      const aiMetadata = { 
        relevantContent: aiResponse.relevantContent,
        sources: aiResponse.sources,
        relatedResources: aiResponse.relatedResources,
        timestamp: new Date().toISOString(),
        context: context,
        faithAlignment: aiResponse.faithAlignment, // ENHANCED: Store faith alignment data
        detectedLanguage: aiResponse.detectedLanguage,
        cacheHit: aiResponse.cacheHit || false
      };

      await trx('ai_messages').insert([
        {
          conversation_id: conversation.id,
          role: 'user',
          content: userMessage,
          metadata: JSON.stringify(userMetadata)
        },
        {
          conversation_id: conversation.id,
          role: 'assistant',
          content: aiResponse.response,
          metadata: JSON.stringify(aiMetadata)
        }
      ]);

      await trx.commit();
      return conversation;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  // Get conversation history
  async getConversationHistory(userId, sessionId, limit = 10) {
    // If privacy settings disable conversation retention, return empty history
    if (!this.privacySettings.retainConversationData) {
      return [];
    }
    
    const conversation = await db('ai_conversations')
      .where({ user_id: userId, session_id: sessionId })
      .first();

    if (!conversation) return [];

    const messages = await db('ai_messages')
      .where({ conversation_id: conversation.id })
      .orderBy('created_at', 'asc')
      .limit(limit)
      .select('role', 'content', 'created_at', 'metadata');

    return messages;
  }
  
  // Delete old conversations based on retention policy
  async cleanupOldConversations() {
    if (!this.privacySettings.retainConversationData) {
      return;
    }
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.privacySettings.retentionPeriodDays);
    
    try {
      // Delete old conversations and their messages
      const oldConversations = await db('ai_conversations')
        .where('created_at', '<', cutoffDate)
        .select('id');
        
      if (oldConversations.length > 0) {
        const conversationIds = oldConversations.map(conv => conv.id);
        
        // Delete messages first
        await db('ai_messages')
          .whereIn('conversation_id', conversationIds)
          .delete();
          
        // Delete conversations
        await db('ai_conversations')
          .whereIn('id', conversationIds)
          .delete();
          
        console.log(`Cleaned up ${oldConversations.length} old conversations`);
      }
    } catch (error) {
      console.error('Error cleaning up old conversations:', error);
    }
  }
  
  // Get performance metrics
  getPerformanceMetrics() {
    return {
      cacheSize: this.responseCache.size,
      cacheEnabled: this.performanceSettings.enableCaching,
      maxCacheSize: this.performanceSettings.maxCacheSize,
      maxResponseTimeMs: this.performanceSettings.maxResponseTimeMs,
      activeRequests: this.activeRequests,
      queuedRequests: this.requestQueue.length
    };
  }
}

module.exports = new AIService();