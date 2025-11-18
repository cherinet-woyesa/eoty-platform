/**
 * Migration: Create video_bookmarks table
 * 
 * This table stores user-created bookmarks at specific timestamps in video lessons.
 * Bookmarks allow quick navigation to important moments in videos.
 * Each user can have only one bookmark per timestamp per lesson.
 * 
 * Requirements: 5.1, 5.2
 */

exports.up = function(knex) {
  return knex.schema.createTable('video_bookmarks', function(table) {
    // Primary key
    table.increments('id').primary();
    
    // Foreign keys
    table.integer('lesson_id')
      .notNullable()
      .references('id')
      .inTable('lessons')
      .onDelete('CASCADE')
      .comment('Reference to the lesson this bookmark belongs to');
    
    table.integer('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .comment('Reference to the user who created this bookmark');
    
    // Bookmark data
    table.integer('timestamp_seconds')
      .notNullable()
      .comment('Video timestamp in seconds where bookmark is placed');
    
    table.string('label', 200)
      .nullable()
      .comment('Optional label for the bookmark');
    
    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Constraints
    table.check('timestamp_seconds >= 0', [], 'valid_timestamp');
    table.unique(['lesson_id', 'user_id', 'timestamp_seconds'], {
      indexName: 'unique_bookmark_per_timestamp'
    });
    
    // Indexes for performance
    table.index(['lesson_id', 'user_id'], 'idx_bookmarks_lesson_user');
    table.index(['lesson_id', 'timestamp_seconds'], 'idx_bookmarks_timestamp');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('video_bookmarks');
};
