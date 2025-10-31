// backend/services/contextService.js - NEW FILE
const db = require('../config/database');

class ContextService {
  constructor() {
    this.maxContextLength = 4000; // Limit context to avoid token overflow
    this.contextCache = new Map();
    this.cacheExpiry = 10 * 60 * 1000; // 10 minutes cache
  }

  // ENHANCED: Get comprehensive context including user progress and recent activity
  async getEnhancedContext(userId, context = {}) {
    const contextKey = `${userId}_${JSON.stringify(context)}`;
    const cached = this.contextCache.get(contextKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    const enhancedContext = {
      basic: await this.getBasicContext(context),
      userProgress: await this.getUserProgress(userId, context),
      recentActivity: await this.getRecentActivity(userId),
      learningPreferences: await this.getLearningPreferences(userId),
      relatedContent: await this.getRelatedContent(context)
    };

    // Cache the result
    this.contextCache.set(contextKey, {
      data: enhancedContext,
      timestamp: Date.now()
    });

    return enhancedContext;
  }

  // Get basic context (lesson, course, chapter)
  async getBasicContext(context = {}) {
    const basicContext = {};

    // Get lesson information if available
    if (context.lessonId) {
      try {
        const lessonInfo = await db('lessons')
          .where({ id: context.lessonId })
          .select('id', 'title', 'description', 'content', 'objectives', 'duration', 'difficulty')
          .first();
          
        if (lessonInfo) {
          basicContext.lesson = {
            id: lessonInfo.id,
            title: lessonInfo.title,
            description: lessonInfo.description,
            contentPreview: lessonInfo.content ? this.truncateContent(lessonInfo.content, 300) : '',
            objectives: lessonInfo.objectives ? JSON.parse(lessonInfo.objectives) : [],
            duration: lessonInfo.duration,
            difficulty: lessonInfo.difficulty
          };

          // Get lesson resources
          const lessonResources = await db('lesson_resources')
            .where({ lesson_id: context.lessonId })
            .select('title', 'type', 'url', 'description');
          
          basicContext.lesson.resources = lessonResources;
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
          .select('id', 'title', 'description', 'category', 'level', 'total_lessons')
          .first();
          
        if (courseInfo) {
          basicContext.course = {
            id: courseInfo.id,
            title: courseInfo.title,
            description: courseInfo.description,
            category: courseInfo.category,
            level: courseInfo.level,
            totalLessons: courseInfo.total_lessons
          };

          // Get course curriculum
          const curriculum = await db('lessons')
            .where({ course_id: context.courseId })
            .select('id', 'title', 'order_index', 'duration')
            .orderBy('order_index', 'asc');
          
          basicContext.course.curriculum = curriculum;
        }
      } catch (error) {
        console.warn('Failed to fetch course context:', error);
      }
    }

    // Get chapter/organization information if available
    if (context.chapterId) {
      try {
        const chapterInfo = await db('chapters')
          .where({ id: context.chapterId })
          .select('id', 'name', 'region', 'description', 'contact_info')
          .first();
          
        if (chapterInfo) {
          basicContext.chapter = {
            id: chapterInfo.id,
            name: chapterInfo.name,
            region: chapterInfo.region,
            description: chapterInfo.description,
            contactInfo: chapterInfo.contact_info ? JSON.parse(chapterInfo.contact_info) : null
          };
        }
      } catch (error) {
        console.warn('Failed to fetch chapter context:', error);
      }
    }

    return basicContext;
  }

  // Get user progress and learning history
  async getUserProgress(userId, context = {}) {
    const progress = {};

    try {
      // Get overall completion stats
      const completionStats = await db('user_progress')
        .where({ user_id: userId })
        .select('course_id', 'lesson_id', 'completion_percentage', 'last_accessed', 'quiz_score')
        .orderBy('last_accessed', 'desc')
        .limit(10);

      progress.recentProgress = completionStats;

      // Get current course progress if available
      if (context.courseId) {
        const courseProgress = await db('user_progress')
          .where({ user_id: userId, course_id: context.courseId })
          .select('completion_percentage', 'total_time_spent', 'last_accessed')
          .first();
        
        progress.currentCourse = courseProgress || { completion_percentage: 0 };
      }

      // Get current lesson progress if available
      if (context.lessonId) {
        const lessonProgress = await db('user_progress')
          .where({ user_id: userId, lesson_id: context.lessonId })
          .select('completion_percentage', 'time_spent', 'last_accessed', 'notes')
          .first();
        
        progress.currentLesson = lessonProgress || { completion_percentage: 0 };
      }

      // Get learning streaks and patterns
      const learningPatterns = await db('user_learning_sessions')
        .where({ user_id: userId })
        .select('session_date', 'duration_minutes', 'topics_covered')
        .orderBy('session_date', 'desc')
        .limit(7);

      progress.learningPatterns = learningPatterns;

    } catch (error) {
      console.warn('Failed to fetch user progress:', error);
    }

    return progress;
  }

  // Get user's recent activity and questions
  async getRecentActivity(userId) {
    const activity = {};

    try {
      // Get recent AI conversations
      const recentConversations = await db('ai_conversations')
        .where({ user_id: userId })
        .join('ai_messages', 'ai_conversations.id', 'ai_messages.conversation_id')
        .select(
          'ai_messages.content',
          'ai_messages.role',
          'ai_messages.created_at',
          'ai_conversations.context_data'
        )
        .orderBy('ai_messages.created_at', 'desc')
        .limit(8);

      activity.recentConversations = recentConversations.map(msg => ({
        content: msg.content,
        role: msg.role,
        timestamp: msg.created_at,
        context: msg.context_data ? JSON.parse(msg.context_data) : null
      }));

      // Get recently accessed resources
      const recentResources = await db('user_resource_access')
        .where({ user_id: userId })
        .join('resources', 'user_resource_access.resource_id', 'resources.id')
        .select('resources.title', 'resources.category', 'user_resource_access.accessed_at')
        .orderBy('user_resource_access.accessed_at', 'desc')
        .limit(5);

      activity.recentResources = recentResources;

      // Get quiz/test results
      const recentQuizzes = await db('quiz_results')
        .where({ user_id: userId })
        .select('quiz_title', 'score', 'total_questions', 'completed_at')
        .orderBy('completed_at', 'desc')
        .limit(3);

      activity.recentQuizzes = recentQuizzes;

    } catch (error) {
      console.warn('Failed to fetch recent activity:', error);
    }

    return activity;
  }

  // Get user learning preferences
  async getLearningPreferences(userId) {
    const preferences = {};

    try {
      const userPrefs = await db('user_preferences')
        .where({ user_id: userId })
        .select('preferred_language', 'learning_pace', 'content_preferences', 'accessibility_settings')
        .first();

      if (userPrefs) {
        preferences.language = userPrefs.preferred_language || 'en-US';
        preferences.pace = userPrefs.learning_pace || 'moderate';
        preferences.content = userPrefs.content_preferences ? JSON.parse(userPrefs.content_preferences) : {};
        preferences.accessibility = userPrefs.accessibility_settings ? JSON.parse(userPrefs.accessibility_settings) : {};
      }

      // Get most successful content types
      const successRates = await db('user_content_success')
        .where({ user_id: userId })
        .select('content_type', 'success_rate', 'engagement_level')
        .orderBy('success_rate', 'desc');

      preferences.successfulContentTypes = successRates;

    } catch (error) {
      console.warn('Failed to fetch learning preferences:', error);
    }

    return preferences;
  }

  // Get content related to current context
  async getRelatedContent(context = {}) {
    const related = {};

    try {
      // Get related lessons based on current context
      if (context.lessonId || context.courseId) {
        const relatedLessons = await db('lessons')
          .where(builder => {
            if (context.courseId) {
              builder.where('course_id', context.courseId);
            }
            if (context.lessonId) {
              builder.whereNot('id', context.lessonId);
            }
          })
          .select('id', 'title', 'description', 'order_index')
          .orderBy('order_index', 'asc')
          .limit(3);

        related.lessons = relatedLessons;
      }

      // Get recommended resources based on context
      const recommendedResources = await db('resources')
        .where(builder => {
          if (context.courseId) {
            builder.where('course_id', context.courseId);
          }
          if (context.lessonId) {
            builder.where('lesson_id', context.lessonId);
          }
        })
        .select('id', 'title', 'type', 'description', 'category')
        .limit(5);

      related.resources = recommendedResources;

      // Get prerequisite knowledge if this is a complex topic
      if (context.lessonId) {
        const prerequisites = await db('lesson_prerequisites')
          .where({ lesson_id: context.lessonId })
          .join('lessons', 'lesson_prerequisites.prerequisite_lesson_id', 'lessons.id')
          .select('lessons.title', 'lessons.description', 'lesson_prerequisites.importance');

        related.prerequisites = prerequisites;
      }

    } catch (error) {
      console.warn('Failed to fetch related content:', error);
    }

    return related;
  }

  // Format context for AI consumption
  formatContextForAI(enhancedContext, currentQuestion = '') {
    let contextText = '';

    // Add basic context
    if (enhancedContext.basic.lesson) {
      contextText += `CURRENT LESSON CONTEXT:
Title: ${enhancedContext.basic.lesson.title}
Description: ${enhancedContext.basic.lesson.description}
Objectives: ${enhancedContext.basic.lesson.objectives?.join(', ') || 'Not specified'}
Difficulty: ${enhancedContext.basic.lesson.difficulty || 'Not specified'}
${enhancedContext.basic.lesson.contentPreview ? `Content Preview: ${enhancedContext.basic.lesson.contentPreview}\n` : ''}`;

      if (enhancedContext.basic.lesson.resources?.length > 0) {
        contextText += `Lesson Resources: ${enhancedContext.basic.lesson.resources.map(r => r.title).join(', ')}\n`;
      }
    }

    if (enhancedContext.basic.course) {
      contextText += `\nCURRENT COURSE CONTEXT:
Title: ${enhancedContext.basic.course.title}
Category: ${enhancedContext.basic.course.category}
Level: ${enhancedContext.basic.course.level}
Total Lessons: ${enhancedContext.basic.course.totalLessons}\n`;

      if (enhancedContext.basic.course.curriculum?.length > 0) {
        contextText += `Course Curriculum: ${enhancedContext.basic.course.curriculum.map(l => l.title).join(' → ')}\n`;
      }
    }

    if (enhancedContext.basic.chapter) {
      contextText += `\nCHAPTER CONTEXT:
Name: ${enhancedContext.basic.chapter.name}
Region: ${enhancedContext.basic.chapter.region}
Description: ${enhancedContext.basic.chapter.description}\n`;
    }

    // Add user progress context
    if (enhancedContext.userProgress.currentLesson) {
      const progress = enhancedContext.userProgress.currentLesson;
      contextText += `\nUSER PROGRESS:
Current Lesson Completion: ${progress.completion_percentage || 0}%
${progress.notes ? `User Notes: ${progress.notes}\n` : ''}`;
    }

    if (enhancedContext.userProgress.currentCourse) {
      const courseProgress = enhancedContext.userProgress.currentCourse;
      contextText += `Course Completion: ${courseProgress.completion_percentage || 0}%\n`;
    }

    // Add learning preferences
    if (enhancedContext.learningPreferences) {
      contextText += `\nLEARNING PREFERENCES:
Preferred Language: ${enhancedContext.learningPreferences.language}
Learning Pace: ${enhancedContext.learningPreferences.pace}\n`;
    }

    // Add recent activity context
    if (enhancedContext.recentActivity.recentConversations?.length > 0) {
      contextText += `\nRECENT CONVERSATION HISTORY:\n`;
      enhancedContext.recentActivity.recentConversations.slice(0, 3).forEach(conv => {
        if (conv.role === 'user') {
          contextText += `User previously asked: ${conv.content.substring(0, 100)}...\n`;
        }
      });
    }

    // Add related content suggestions
    if (enhancedContext.relatedContent.lessons?.length > 0) {
      contextText += `\nRELATED LESSONS: ${enhancedContext.relatedContent.lessons.map(l => l.title).join(', ')}\n`;
    }

    if (enhancedContext.relatedContent.prerequisites?.length > 0) {
      contextText += `PREREQUISITE KNOWLEDGE: ${enhancedContext.relatedContent.prerequisites.map(p => p.title).join(', ')}\n`;
    }

    // Truncate if too long
    if (contextText.length > this.maxContextLength) {
      contextText = contextText.substring(0, this.maxContextLength) + '... [context truncated]';
    }

    return contextText;
  }

  // Helper method to truncate content
  truncateContent(content, maxLength) {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  }

  // Clear cache for a specific user
  clearUserCache(userId) {
    const keysToDelete = [];
    for (const key of this.contextCache.keys()) {
      if (key.startsWith(`${userId}_`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.contextCache.delete(key));
  }

  // Update user activity (to be called when user interacts with content)
  async logUserActivity(userId, activityType, details = {}) {
    try {
      await db('user_learning_sessions').insert({
        user_id: userId,
        session_date: new Date(),
        activity_type: activityType,
        details: JSON.stringify(details),
        duration_minutes: details.duration || 0,
        topics_covered: details.topics ? JSON.stringify(details.topics) : null
      });

      // Clear cache to ensure fresh data next time
      this.clearUserCache(userId);
    } catch (error) {
      console.warn('Failed to log user activity:', error);
    }
  }
}

module.exports = new ContextService();