// backend/services/resourceLibraryService.js
// Resource Library Service - REQUIREMENT: FR3 - Enhanced search, notes, AI summaries, export/share

const db = require('../config/database');
const aiService = require('./aiService');
const { Resource, UserNote, AISummary } = require('../models/Resource');

class ResourceLibraryService {
  constructor() {
    // Supported file types for inline viewing (REQUIREMENT: Inline viewing)
    this.inlineViewableTypes = [
      'pdf', 'txt', 'doc', 'docx',
      'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp',
      'html', 'htm', 'md', 'markdown'
    ];

    // Unsupported file types (REQUIREMENT: Error notification)
    this.unsupportedTypes = [
      'exe', 'dll', 'bat', 'cmd', 'sh', 'bin',
      'zip', 'rar', '7z', 'tar', 'gz'
    ];
  }

  // Enhanced search with all filters (REQUIREMENT: Tag, type, topic, author, date)
  async searchResources(filters = {}) {
    try {
      console.log('🔍 Backend service search filters:', JSON.stringify(filters, null, 2));

      // Build query step by step to ensure proper filtering
      let query = db('resources');

      // Step 1: Published date filter (required for all resources)
      query = query.where(function() {
        this.where('published_at', '<=', new Date())
          .orWhereNull('published_at');
      });

      // Step 2: Search filter (if provided)
      if (filters.search && filters.search.trim()) {
        const searchTerm = filters.search.trim();
        console.log('🔍 Applying search filter:', searchTerm);

        query = query.where(function() {
          this.where('title', 'ilike', `%${searchTerm}%`)
            .orWhere('description', 'ilike', `%${searchTerm}%`)
            .orWhere('author', 'ilike', `%${searchTerm}%`);
        });

        console.log('🔍 Search query built with term:', searchTerm);
      } else {
        console.log('🔍 No search filter applied, returning all resources');
      }

      // Filter by tags (REQUIREMENT: Tag filter)
      if (filters.tags && filters.tags.length > 0) {
        const tagArray = Array.isArray(filters.tags) ? filters.tags : [filters.tags];
        query = query.whereRaw('tags @> ?', [JSON.stringify(tagArray)]);
      }

      // Filter by type (REQUIREMENT: Type filter)
      if (filters.type) {
        query = query.where('file_type', filters.type);
      }

      // Filter by topic (REQUIREMENT: Topic filter) - only if column exists
      if (filters.topic) {
        const hasTopic = await db.schema.hasColumn('resources', 'topic');
        if (hasTopic) {
          query = query.where('topic', filters.topic);
        }
      }

      // Filter by author (REQUIREMENT: Author filter)
      if (filters.author) {
        query = query.where('author', 'ilike', `%${filters.author}%`);
      }

      // Filter by date (REQUIREMENT: Date filter)
      if (filters.dateFrom) {
        query = query.where('published_date', '>=', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.where('published_date', '<=', filters.dateTo);
      }

      // Filter by category
      if (filters.category) {
        query = query.where('category', filters.category);
      }

      // Filter by language
      if (filters.language) {
        query = query.where('language', filters.language);
      }

      // Role-based access control (REQUIREMENT: Prevents unauthorized access)
      const userId = filters.userId;
      const userRole = filters.userRole;
      
      if (userRole !== 'admin') {
        query = query.where(function() {
          this.where('is_public', true)
            .orWhere('chapter_id', filters.chapterId);
        });
      }

      // TEMPORARY: Test with raw SQL to verify search works
      if (filters.search && filters.search.trim()) {
        const searchTerm = filters.search.trim();
        const rawQuery = `
          SELECT * FROM resources
          WHERE (published_at <= NOW() OR published_at IS NULL)
          AND (title ILIKE '%${searchTerm}%' OR description ILIKE '%${searchTerm}%' OR author ILIKE '%${searchTerm}%')
          AND (is_public = true OR chapter_id = ?)
          ORDER BY created_at DESC
          LIMIT ?
        `;

        console.log('🔍 Using raw SQL query for search:', searchTerm);
        console.log('🔍 Raw SQL:', rawQuery);

        const resources = await db.raw(rawQuery, [filters.chapterId, filters.limit || 50]);
        console.log('🔍 Raw query results:', resources.rows.length, 'resources');

        return resources.rows;
      }

      // Debug: Log the query before execution
      console.log('🔍 Final query SQL:', query.toString());

      const resources = await query
        .orderBy('created_at', 'desc')
        .limit(filters.limit || 50)
        .offset(filters.offset || 0);

      console.log('🔍 Query results:', resources.length, 'resources found');

      // Debug: Check each resource against search criteria
      if (filters.search && filters.search.trim()) {
        const searchTerm = filters.search.trim().toLowerCase();
        resources.forEach((resource, index) => {
          const titleMatch = resource.title?.toLowerCase().includes(searchTerm);
          const descMatch = resource.description?.toLowerCase().includes(searchTerm);
          const authorMatch = resource.author?.toLowerCase().includes(searchTerm);
          const matches = titleMatch || descMatch || authorMatch;

          console.log(`🔍 Resource ${index + 1} (${resource.title}): title=${titleMatch}, desc=${descMatch}, author=${authorMatch}, matches=${matches}`);
        });
      }

      if (resources.length > 0) {
        console.log('🔍 First result title:', resources[0].title);
        console.log('🔍 All result titles:', resources.map(r => r.title));
      }

      return resources;
    } catch (error) {
      console.error('Search resources error:', error);
      throw error;
    }
  }

  // Get enhanced filter options (REQUIREMENT: Tag, type, topic, author, date)
  async getFilterOptions() {
    try {
      // Check if topic column exists
      const hasTopic = await db.schema.hasColumn('resources', 'topic');
      
      const [tags, types, topics, authors, categories, languages] = await Promise.all([
        // Get all unique tags
        db('resources')
          .select('tags')
          .whereNotNull('tags'),
        
        // Get all unique file types
        db('resources')
          .distinct('file_type')
          .whereNotNull('file_type')
          .pluck('file_type'),
        
        // Get all unique topics (only if column exists)
        hasTopic 
          ? db('resources')
              .distinct('topic')
              .whereNotNull('topic')
              .pluck('topic')
          : Promise.resolve([]),
        
        // Get all unique authors
        db('resources')
          .distinct('author')
          .whereNotNull('author')
          .pluck('author'),
        
        // Get all unique categories
        db('resources')
          .distinct('category')
          .whereNotNull('category')
          .pluck('category'),
        
        // Get all unique languages
        db('resources')
          .distinct('language')
          .whereNotNull('language')
          .pluck('language')
      ]);

      // Process tags
      const allTags = new Set();
      tags.forEach(row => {
        if (row.tags && Array.isArray(row.tags)) {
          row.tags.forEach(tag => allTags.add(tag));
        }
      });

      return {
        tags: Array.from(allTags).sort(),
        types: types.sort(),
        topics: topics.sort(),
        authors: authors.sort(),
        categories: categories.sort(),
        languages: languages.sort()
      };
    } catch (error) {
      console.error('Get filter options error:', error);
      return {
        tags: [],
        types: [],
        topics: [],
        authors: [],
        categories: [],
        languages: []
      };
    }
  }

  // Check if resource can be viewed inline (REQUIREMENT: Inline viewing)
  canViewInline(fileType) {
    return this.inlineViewableTypes.includes(fileType?.toLowerCase());
  }

  // Check if file type is unsupported (REQUIREMENT: Error notification)
  isUnsupportedType(fileType) {
    return this.unsupportedTypes.includes(fileType?.toLowerCase());
  }

  // Log unsupported file attempt (REQUIREMENT: Error notification)
  async logUnsupportedFileAttempt(userId, fileName, fileType, mimeType, fileSize, errorMessage) {
    try {
      await db('unsupported_file_attempts').insert({
        user_id: userId,
        file_name: fileName,
        file_type: fileType,
        mime_type: mimeType,
        file_size: fileSize,
        error_message: errorMessage,
        created_at: new Date()
      });
    } catch (error) {
      console.error('Log unsupported file attempt error:', error);
      // Don't throw - logging is non-critical
    }
  }

  // Create note with section anchoring (REQUIREMENT: Anchor notes to sections)
  async createNote(userId, resourceId, content, isPublic = false, sectionAnchor = null, sectionText = null, sectionPosition = null) {
    try {
      const noteData = {
        user_id: userId,
        resource_id: resourceId,
        content,
        is_public: isPublic,
        anchor_point: sectionAnchor, // Legacy support
        section_anchor: sectionAnchor, // REQUIREMENT: Anchor notes to sections
        section_text: sectionText,
        section_position: sectionPosition,
        created_at: new Date(),
        updated_at: new Date()
      };

      const note = await UserNote.create(noteData);

      // Track usage
      await db('resource_usage').insert({
        user_id: userId,
        resource_id: resourceId,
        action: 'note_created',
        metadata: { note_id: note.id, is_public: isPublic },
        created_at: new Date()
      });

      return note;
    } catch (error) {
      console.error('Create note error:', error);
      throw error;
    }
  }

  // Share note with chapter members (REQUIREMENT: Share notes with chapter members)
  async shareNoteWithChapter(noteId, userId, chapterId, message = null) {
    try {
      // Verify note belongs to user
      const note = await db('user_notes')
        .where({ id: noteId, user_id: userId })
        .first();

      if (!note) {
        throw new Error('Note not found or access denied');
      }

      // Check if shared_resource_notes table exists
      const hasSharedNotesTable = await db.schema.hasTable('shared_resource_notes');

      if (!hasSharedNotesTable) {
        throw new Error('Note sharing feature is not available');
      }

      // Create share record
      const [shareId] = await db('shared_resource_notes').insert({
        note_id: noteId,
        shared_by: userId,
        chapter_id: chapterId,
        is_approved: false, // Require moderation for shared notes
        created_at: new Date()
      }).returning('id');

      return { shareId: shareId.id || shareId, message: 'Note shared with chapter members' };
    } catch (error) {
      console.error('Share note error:', error);
      throw error;
    }
  }

  // Generate AI summary with word limit and relevance (REQUIREMENT: < 250 words, 98% relevance)
  async generateAISummary(resourceId, type = 'brief') {
    try {
      const resource = await Resource.findById(resourceId);
      if (!resource) {
        throw new Error('Resource not found');
      }

      // Check if summary already exists
      const existingSummary = await AISummary.findByResource(resourceId, type);
      if (existingSummary && existingSummary.admin_validated) {
        const keyPoints = typeof existingSummary.key_points === 'string' ? JSON.parse(existingSummary.key_points) : existingSummary.key_points;
        const spiritualInsights = existingSummary.spiritual_insights ? existingSummary.spiritual_insights.split('\\n') : [];
        
        return {
          ...existingSummary,
          key_points: keyPoints,
          spiritual_insights: spiritualInsights,
          keyPoints: keyPoints,
          spiritualInsights: spiritualInsights,
          meetsWordLimit: existingSummary.meets_word_limit,
          meetsRelevanceRequirement: existingSummary.relevance_score >= 0.98
        };
      }

      // Generate summary using AI service
      const summaryData = await aiService.generateResourceSummary(resource, type);

      // Enforce word limit (REQUIREMENT: < 250 words)
      const wordCount = summaryData.wordCount || this.countWords(summaryData.summary);
      const meetsWordLimit = wordCount < 250;
      
      if (!meetsWordLimit) {
        // Truncate summary to meet requirement
        const words = summaryData.summary.split(' ');
        summaryData.summary = words.slice(0, 249).join(' ') + '...';
        summaryData.wordCount = 249;
      }

      // Calculate relevance score (REQUIREMENT: 98% relevance)
      const relevanceScore = await this.calculateRelevanceScore(resource, summaryData);

      // Store summary
      const summary = await AISummary.createOrUpdate({
        resource_id: resourceId,
        summary: summaryData.summary,
        key_points: JSON.stringify(summaryData.keyPoints || []),
        spiritual_insights: summaryData.spiritualInsights?.join('\\n') || null,
        summary_type: type,
        word_count: summaryData.wordCount || this.countWords(summaryData.summary),
        relevance_score: relevanceScore,
        model_used: summaryData.modelUsed || 'gpt-4',
        meets_word_limit: meetsWordLimit,
        admin_validated: false // REQUIREMENT: Admin validation for 98% relevance
      });

      return {
        ...summary,
        key_points: summaryData.keyPoints || [],
        spiritual_insights: summaryData.spiritualInsights || [],
        keyPoints: summaryData.keyPoints || [],
        spiritualInsights: summaryData.spiritualInsights || [],
        meetsWordLimit,
        relevanceScore,
        meetsRelevanceRequirement: relevanceScore >= 0.98
      };
    } catch (error) {
      console.error('Generate AI summary error:', error);
      // REQUIREMENT: Handles AI summarizer failures gracefully with fallback
      return await this.getFallbackSummary(resourceId, type);
    }
  }

  // Calculate relevance score for summary (REQUIREMENT: 98% relevance)
  async calculateRelevanceScore(resource, summaryData) {
    try {
      // Simple relevance calculation based on:
      // 1. Keyword overlap between resource and summary
      // 2. Presence of key resource elements (title, author, category)
      // 3. Spiritual insights alignment

      const resourceKeywords = this.extractKeywords(`${resource.title} ${resource.description || ''} ${resource.author || ''}`);
      const summaryKeywords = this.extractKeywords(summaryData.summary);

      // Calculate keyword overlap
      const commonKeywords = resourceKeywords.filter(kw => summaryKeywords.includes(kw));
      const keywordOverlap = commonKeywords.length / Math.max(resourceKeywords.length, 1);

      // Check for key elements
      const hasTitle = summaryData.summary.toLowerCase().includes(resource.title.toLowerCase());
      const hasAuthor = resource.author ? summaryData.summary.toLowerCase().includes(resource.author.toLowerCase()) : true;
      const hasCategory = resource.category ? summaryData.summary.toLowerCase().includes(resource.category.toLowerCase()) : true;

      // Calculate relevance score
      let relevanceScore = keywordOverlap * 0.6; // 60% weight on keyword overlap
      if (hasTitle) relevanceScore += 0.15;
      if (hasAuthor) relevanceScore += 0.10;
      if (hasCategory) relevanceScore += 0.10;
      if (summaryData.spiritualInsights && summaryData.spiritualInsights.length > 0) relevanceScore += 0.05;

      return Math.min(relevanceScore, 1.0);
    } catch (error) {
      console.error('Calculate relevance score error:', error);
      return 0.85; // Default relevance if calculation fails
    }
  }

  // Extract keywords from text
  extractKeywords(text) {
    if (!text) return [];
    
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'from', 'have', 'been', 'will', 'would', 'your', 'their'].includes(word))
      .slice(0, 20); // Top 20 keywords
  }

  // Count words in text
  countWords(text) {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  // Fallback summary if AI fails (REQUIREMENT: Handles failures gracefully)
  async getFallbackSummary(resourceId, type) {
    try {
      const resource = await Resource.findById(resourceId);
      if (!resource) {
        return {
          summary: 'Summary not available. Please try again later or contact support.',
          keyPoints: [],
          spiritualInsights: [],
          wordCount: 0,
          relevanceScore: 0,
          meetsWordLimit: true,
          meetsRelevanceRequirement: false,
          isFallback: true,
          modelUsed: 'fallback'
        };
      }

      const fallbackSummary = `${resource.title}${resource.description ? ': ' + resource.description.substring(0, 200) : ''}`;
      const wordCount = this.countWords(fallbackSummary);

      return {
        summary: fallbackSummary,
        keyPoints: [resource.category || 'Religious resource'],
        spiritualInsights: ['Please consult with your local clergy for detailed insights'],
        wordCount: wordCount,
        relevanceScore: 0.70,
        meetsWordLimit: wordCount < 250, // REQUIREMENT: < 250 words
        meetsRelevanceRequirement: false, // Fallback doesn't meet 98% requirement
        isFallback: true,
        modelUsed: 'fallback'
      };
    } catch (error) {
      console.error('Fallback summary error:', error);
      return {
        summary: 'Summary generation is temporarily unavailable. Please try again later.',
        keyPoints: [],
        spiritualInsights: [],
        wordCount: 0,
        relevanceScore: 0,
        meetsWordLimit: true,
        meetsRelevanceRequirement: false,
        isFallback: true,
        modelUsed: 'fallback'
      };
    }
  }

  // Export resource content (REQUIREMENT: Export notes/summaries)
  async exportResource(userId, resourceId, exportType = 'combined', format = 'pdf') {
    try {
      const resource = await Resource.findById(resourceId);
      if (!resource) {
        throw new Error('Resource not found');
      }

      // Get notes and summary if requested
      let notes = [];
      let summary = null;

      if (exportType === 'notes' || exportType === 'combined') {
        const userNotes = await UserNote.findByResourceAndUser(resourceId, userId);
        const publicNotes = await UserNote.findPublicByResource(resourceId);
        notes = [...userNotes, ...publicNotes.filter(n => !userNotes.find(un => un.id === n.id))];
      }

      if (exportType === 'summary' || exportType === 'combined') {
        summary = await AISummary.findByResource(resourceId, 'brief');
      }

      // Prepare export data
      const exportData = {
        resource: {
          title: resource.title,
          author: resource.author,
          category: resource.category,
          description: resource.description
        },
        notes: exportType === 'notes' || exportType === 'combined' ? notes : null,
        summary: exportType === 'summary' || exportType === 'combined' ? summary : null,
        exportedAt: new Date().toISOString(),
        exportedBy: userId
      };

      // Store export record
      const [exportId] = await db('resource_exports').insert({
        user_id: userId,
        resource_id: resourceId,
        export_type: exportType,
        format: format,
        export_data: JSON.stringify(exportData),
        created_at: new Date()
      }).returning('id');

      return {
        exportId: exportId.id || exportId,
        exportData,
        format,
        message: `Export prepared. Format: ${format}`
      };
    } catch (error) {
      console.error('Export resource error:', error);
      throw error;
    }
  }

  // Share resource with chapter members (REQUIREMENT: Share with chapter members)
  async shareResourceWithChapter(resourceId, userId, chapterId, shareType = 'view', message = null) {
    try {
      // Verify resource access
      const resource = await Resource.findById(resourceId);
      if (!resource) {
        throw new Error('Resource not found');
      }

      // Check user has permission to share
      const user = await db('users').where({ id: userId }).select('chapter_id', 'role').first();
      if (user.chapter_id !== chapterId && user.role !== 'admin') {
        throw new Error('Access denied: Can only share with your chapter');
      }

      // Create share record
      const [shareId] = await db('resource_shares').insert({
        resource_id: resourceId,
        shared_by: userId,
        chapter_id: chapterId,
        share_type: shareType,
        message: message,
        created_at: new Date()
      }).returning('id');

      return {
        shareId: shareId.id || shareId,
        message: 'Resource shared with chapter members'
      };
    } catch (error) {
      console.error('Share resource error:', error);
      throw error;
    }
  }

  // Track resource library coverage (REQUIREMENT: 80%+ coverage)
  async updateCoverageTracking(sourceType, sourceName, totalItems, indexedItems) {
    try {
      const coveragePercentage = (indexedItems / Math.max(totalItems, 1)) * 100;
      const meetsRequirement = coveragePercentage >= 80;

      const existing = await db('resource_library_coverage')
        .where({ source_type: sourceType, source_name: sourceName })
        .first();

      if (existing) {
        await db('resource_library_coverage')
          .where({ id: existing.id })
          .update({
            total_items: totalItems,
            indexed_items: indexedItems,
            coverage_percentage: coveragePercentage,
            meets_requirement: meetsRequirement,
            last_updated: new Date()
          });
      } else {
        await db('resource_library_coverage').insert({
          source_type: sourceType,
          source_name: sourceName,
          total_items: totalItems,
          indexed_items: indexedItems,
          coverage_percentage: coveragePercentage,
          meets_requirement: meetsRequirement,
          last_updated: new Date()
        });
      }

      return { coveragePercentage, meetsRequirement };
    } catch (error) {
      console.error('Update coverage tracking error:', error);
      throw error;
    }
  }

  // Get coverage statistics (REQUIREMENT: 80%+ coverage)
  async getCoverageStatistics() {
    try {
      const stats = await db('resource_library_coverage')
        .select('*')
        .orderBy('coverage_percentage', 'desc');

      const overallCoverage = stats.length > 0
        ? stats.reduce((sum, s) => sum + s.coverage_percentage, 0) / stats.length
        : 0;

      return {
        sources: stats,
        overallCoverage,
        meetsRequirement: overallCoverage >= 80,
        totalSources: stats.length,
        compliantSources: stats.filter(s => s.meets_requirement).length
      };
    } catch (error) {
      console.error('Get coverage statistics error:', error);
      return {
        sources: [],
        overallCoverage: 0,
        meetsRequirement: false,
        totalSources: 0,
        compliantSources: 0
      };
    }
  }

  // Admin validate AI summary relevance (REQUIREMENT: 98% relevance per admin validation)
  async validateSummaryRelevance(summaryId, adminId, relevanceScore, validationNotes = null) {
    try {
      if (relevanceScore < 0.98) {
        throw new Error('Relevance score must be at least 0.98 (98%)');
      }

      await db('ai_summaries')
        .where({ id: summaryId })
        .update({
          admin_validated: true,
          admin_relevance_score: relevanceScore,
          validated_by: adminId,
          validated_at: new Date(),
          validation_notes: validationNotes
        });

      return { success: true, message: 'Summary validated successfully' };
    } catch (error) {
      console.error('Validate summary relevance error:', error);
      throw error;
    }
  }

  // Upload resource to library (for teachers)
  async uploadResource(fileBuffer, originalFilename, userId, metadata = {}) {
    try {
      const cloudStorageService = require('./cloudStorageService');
      const { title, description, category, tags, language, topic, author_id } = metadata;

      if (!title) {
        throw new Error('Title is required');
      }

      // Generate safe filename
      const fileExtension = originalFilename.split('.').pop()?.toLowerCase();
      const safeFileName = `resource_${Date.now()}_${originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      // Upload to cloud storage
      const uploadResult = await cloudStorageService.uploadVideo(
        fileBuffer,
        safeFileName,
        this.getResourceContentType(originalFilename)
      );

      // Get author name
      let authorName = null;
      if (author_id) {
        const author = await db('users').where({ id: author_id }).select('first_name', 'last_name').first();
        if (author) {
          authorName = `${author.first_name || ''} ${author.last_name || ''}`.trim();
        }
      }
      if (!authorName) {
        const user = await db('users').where({ id: userId }).select('first_name', 'last_name').first();
        if (user) {
          authorName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
        }
      }

      // Prepare resource data
      const resourceData = {
        title,
        description: description || null,
        author: authorName,
        uploaded_by: author_id || userId,
        category: category || null,
        file_type: this.getResourceContentType(originalFilename),
        file_name: safeFileName,
        file_size: fileBuffer.length,
        file_url: uploadResult.url || uploadResult.storageUrl || uploadResult.cdnUrl || uploadResult.signedUrl || uploadResult,
        language: language || 'en',
        tags: tags ? (Array.isArray(tags) ? JSON.stringify(tags) : JSON.stringify(tags.split(',').map(t => t.trim()))) : null,
        is_public: true,
        chapter_id: null,
        published_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      // Insert into database
      const [resourceId] = await db('resources').insert(resourceData).returning('id');

      return {
        id: resourceId,
        ...resourceData
      };
    } catch (error) {
      console.error('Upload resource error:', error);
      throw error;
    }
  }

  getResourceContentType(filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'txt': 'text/plain',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp'
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }
}

// Create singleton instance
const resourceLibraryService = new ResourceLibraryService();

module.exports = resourceLibraryService;

