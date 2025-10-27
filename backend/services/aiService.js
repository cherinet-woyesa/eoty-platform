const { openai, pinecone, aiConfig } = require('../config/aiConfig');
const db = require('../config/database');

class AIService {
  constructor() {
    // Only initialize Pinecone if available
    this.index = pinecone ? pinecone.Index(aiConfig.pineconeIndex) : null;
  }

  // Check if AI services are available
  isAIEnabled() {
    return openai !== null && pinecone !== null;
  }

  // Generate embeddings for text
  async generateEmbedding(text) {
    if (!openai) {
      throw new Error('OpenAI service is not configured. Please set OPENAI_API_KEY in your environment variables.');
    }
    
    try {
      const response = await openai.embeddings.create({
        model: aiConfig.embeddingModel,
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('Embedding generation error:', error);
      throw new Error('Failed to generate embeddings');
    }
  }

  // Search for relevant faith content
  async searchRelevantContent(query, context = {}) {
    if (!this.index) {
      console.warn('Pinecone service is not configured. Returning empty results.');
      return [];
    }
    
    try {
      const queryEmbedding = await this.generateEmbedding(query);
      
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

      return searchResponse.matches.map(match => ({
        content: match.metadata.content,
        source: match.metadata.source,
        score: match.score
      }));
    } catch (error) {
      console.error('Content search error:', error);
      return [];
    }
  }

  // Moderate query for sensitive content
  async moderateQuery(query, userId) {
    const sensitiveTopics = [
      'controversy', 'heresy', 'schism', 'political', 'ecumenical',
      'protestant', 'catholic', 'islam', 'jewish', 'other faiths',
      'social issues', 'modern society', 'traditional vs modern'
    ];

    const queryLower = query.toLowerCase();
    const flags = [];

    // Check for sensitive topics
    sensitiveTopics.forEach(topic => {
      if (queryLower.includes(topic)) {
        flags.push(`contains_${topic}`);
      }
    });

    // Check for potentially problematic phrases
    const problematicPhrases = [
      'what about', 'why not', 'is it wrong', 'is it sin',
      'compare to', 'different from', 'orthodox view on'
    ];

    problematicPhrases.forEach(phrase => {
      if (queryLower.includes(phrase)) {
        flags.push(`questioning_${phrase.replace(/\s+/g, '_')}`);
      }
    });

    // If flags found, log for moderation
    if (flags.length > 0) {
      await db('moderated_queries').insert({
        user_id: userId,
        original_query: query,
        moderation_reason: flags.join(', '),
        status: 'pending'
      });
      return { needsModeration: true, flags };
    }

    return { needsModeration: false, flags: [] };
  }

  // Generate faith-aligned response
  async generateResponse(userQuery, context = {}, conversationHistory = []) {
    if (!openai) {
      return {
        response: "AI services are currently unavailable. Please contact the system administrator.",
        relevantContent: [],
        sources: []
      };
    }
    
    try {
      // Search for relevant content
      const relevantContent = await this.searchRelevantContent(userQuery, context);
      
      // Build context from relevant content
      const contextText = relevantContent
        .slice(0, 3) // Top 3 most relevant
        .map(item => `Source: ${item.source}\nContent: ${item.content}`)
        .join('\n\n');

      // Build conversation history context
      const historyContext = conversationHistory
        .slice(-6) // Last 6 messages for context
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      // Construct the faith-aligned system prompt
      const systemPrompt = `${aiConfig.faithContext}

RELEVANT CONTEXT:
${contextText}

${conversationHistory.length > 0 ? `CONVERSATION HISTORY:\n${historyContext}\n\n` : ''}
CURRENT CONTEXT: ${JSON.stringify(context)}

INSTRUCTIONS:
1. Provide accurate, faith-aligned answers based on Ethiopian Orthodox teachings
2. Reference relevant scriptures and traditions when appropriate
3. If the question touches on sensitive topics, acknowledge the complexity and suggest consulting local clergy
4. Be educational and encouraging in tone
5. If you don't know, admit it and suggest resources for learning more
6. Keep responses clear and accessible for youth understanding

Current user question: ${userQuery}`;

      // Generate response
      const completion = await openai.chat.completions.create({
        model: aiConfig.chatModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userQuery }
        ],
        max_tokens: aiConfig.maxTokens,
        temperature: aiConfig.temperature,
      });

      return {
        response: completion.choices[0].message.content,
        relevantContent: relevantContent.slice(0, 3),
        sources: relevantContent.map(item => item.source)
      };
    } catch (error) {
      console.error('AI response generation error:', error);
      return {
        response: "I'm sorry, but I encountered an error while processing your question. Please try again later.",
        relevantContent: [],
        sources: []
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

  // Store conversation in database
  async storeConversation(userId, sessionId, userMessage, aiResponse, context, needsModeration = false) {
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

      // Store messages
      await trx('ai_messages').insert([
        {
          conversation_id: conversation.id,
          role: 'user',
          content: userMessage,
          metadata: JSON.stringify({ needsModeration })
        },
        {
          conversation_id: conversation.id,
          role: 'assistant',
          content: aiResponse.response,
          metadata: JSON.stringify({ 
            relevantContent: aiResponse.relevantContent,
            sources: aiResponse.sources
          })
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
}

module.exports = new AIService();