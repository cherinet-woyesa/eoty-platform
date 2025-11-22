const db = require('../config/database');

class ChapterArchivingService {
  // Archive inactive chapters
  async archiveInactiveChapters() {
    try {
      console.log('🔄 Starting chapter archiving process...');

      const inactiveThreshold = 90; // 90 days of inactivity
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - inactiveThreshold);

      // Find chapters that haven't had activity in 90 days
      const inactiveChapters = await db('chapters as c')
        .leftJoin('forum_topics as ft', 'c.id', 'ft.forum_id')
        .leftJoin('community_posts as cp', function() {
          this.on('c.id', '=', 'cp.author_id') // This might need adjustment based on actual schema
        })
        .select('c.id', 'c.name')
        .where(function() {
          this.whereNull('ft.created_at')
              .orWhere('ft.created_at', '<', cutoffDate);
        })
        .where(function() {
          this.whereNull('cp.created_at')
              .orWhere('cp.created_at', '<', cutoffDate);
        })
        .where('c.is_active', true) // Only archive active chapters
        .groupBy('c.id', 'c.name');

      console.log(`📊 Found ${inactiveChapters.length} potentially inactive chapters`);

      for (const chapter of inactiveChapters) {
        await this.archiveChapter(chapter.id, chapter.name, 'inactive');
      }

      console.log('✅ Chapter archiving process completed');
      return { archived: inactiveChapters.length };
    } catch (error) {
      console.error('❌ Chapter archiving error:', error);
      return { error: error.message };
    }
  }

  // Archive a specific chapter
  async archiveChapter(chapterId, chapterName, reason = 'manual') {
    try {
      console.log(`📦 Archiving chapter: ${chapterName} (${chapterId})`);

      // Get chapter statistics before archiving
      const [userCount, postCount, topicCount] = await Promise.all([
        db('users').where({ chapter_id: chapterId }).count('id as count').first(),
        db('community_posts').where({ author_id: chapterId }).count('id as count').first(), // This might need adjustment
        db('forum_topics').where({ forum_id: chapterId }).count('id as count').first()
      ]);

      // Create archive record
      await db('chapter_archives').insert({
        chapter_id: chapterId,
        chapter_name: chapterName,
        archive_reason: reason,
        total_users: parseInt(userCount.count),
        total_posts: parseInt(postCount.count),
        archive_metadata: {
          topics_count: parseInt(topicCount.count),
          archived_by: 'system',
          archive_date: new Date().toISOString()
        }
      });

      // Mark chapter as inactive (don't delete data for compliance)
      await db('chapters')
        .where({ id: chapterId })
        .update({
          is_active: false,
          updated_at: new Date()
        });

      // Optionally move users to a default "archived" chapter
      // This depends on your business logic
      const archivedChapterId = await this.getOrCreateArchivedChapter();
      if (archivedChapterId) {
        await db('users')
          .where({ chapter_id: chapterId })
          .update({ chapter_id: archivedChapterId });
      }

      console.log(`✅ Chapter ${chapterName} archived successfully`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Error archiving chapter ${chapterId}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Get or create an "Archived Chapters" chapter for users
  async getOrCreateArchivedChapter() {
    try {
      let archivedChapter = await db('chapters')
        .where({ name: 'Archived Chapters' })
        .first();

      if (!archivedChapter) {
        const [newChapter] = await db('chapters').insert({
          name: 'Archived Chapters',
          description: 'Users from archived chapters',
          is_active: true, // Keep this active for user access
          created_at: new Date(),
          updated_at: new Date()
        }).returning('*');

        archivedChapter = newChapter;
      }

      return archivedChapter.id;
    } catch (error) {
      console.error('Error creating archived chapter:', error);
      return null;
    }
  }

  // Check if chapter should be archived based on activity
  async shouldArchiveChapter(chapterId) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      // Check for recent activity
      const [recentTopics, recentPosts, activeUsers] = await Promise.all([
        db('forum_topics')
          .where({ forum_id: chapterId })
          .where('created_at', '>', thirtyDaysAgo)
          .count('id as count')
          .first(),

        db('community_posts')
          .where({ author_id: chapterId }) // This might need adjustment
          .where('created_at', '>', thirtyDaysAgo)
          .count('id as count')
          .first(),

        db('users')
          .where({ chapter_id: chapterId })
          .where('last_login_at', '>', ninetyDaysAgo)
          .count('id as count')
          .first()
      ]);

      const hasRecentActivity = parseInt(recentTopics.count) > 0 ||
                               parseInt(recentPosts.count) > 0 ||
                               parseInt(activeUsers.count) > 2; // At least 3 active users

      return !hasRecentActivity;
    } catch (error) {
      console.error('Chapter activity check error:', error);
      return false;
    }
  }

  // Get archiving statistics
  async getArchivingStats() {
    try {
      const [
        totalArchived,
        recentArchives,
        chaptersAtRisk
      ] = await Promise.all([
        db('chapter_archives').count('id as count').first(),

        db('chapter_archives')
          .where('archived_at', '>', db.raw("NOW() - INTERVAL '30 days'"))
          .count('id as count')
          .first(),

        // Chapters that haven't had activity in 60 days (at risk)
        db('chapters as c')
          .leftJoin('forum_topics as ft', 'c.id', 'ft.forum_id')
          .where('c.is_active', true)
          .where(function() {
            this.whereNull('ft.created_at')
                .orWhere('ft.created_at', '<', db.raw("NOW() - INTERVAL '60 days'"));
          })
          .countDistinct('c.id as count')
          .first()
      ]);

      return {
        total_archived: parseInt(totalArchived.count),
        recent_archives: parseInt(recentArchives.count),
        chapters_at_risk: parseInt(chaptersAtRisk.count)
      };
    } catch (error) {
      console.error('Archiving stats error:', error);
      return { error: error.message };
    }
  }

  // Restore an archived chapter (admin function)
  async restoreChapter(chapterId) {
    try {
      // Remove from archives
      await db('chapter_archives')
        .where({ chapter_id: chapterId })
        .del();

      // Reactivate chapter
      await db('chapters')
        .where({ id: chapterId })
        .update({
          is_active: true,
          updated_at: new Date()
        });

      console.log(`✅ Chapter ${chapterId} restored`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Error restoring chapter ${chapterId}:`, error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new ChapterArchivingService();
