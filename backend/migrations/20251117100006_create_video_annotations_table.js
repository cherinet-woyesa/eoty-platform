/**
 * Migration: Create video_annotations table
 * 
 * This table stores user-created annotations at specific timestamps in video lessons.
 * Annotations can be private (visible only to creator) or shared (visible to all enrolled students).
 * 
 * Requirements: 4.1, 4.2, 4.7
 */

exports.up = function(knex) {
  return knex.schema.createTable('video_annotations', function(table) {
    // Primary key
    table.increments('id').primary();
    
    // Foreign keys
    table.integer('lesson_id')
      .notNullable()
      .references('id')
      .inTable('lessons')
      .onDelete('CASCADE')
      .comment('Reference to the lesson this annotation belongs to');
    
    table.integer('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .comment('Reference to the user who created this annotation');
    
    // Annotation data
    table.integer('timestamp_seconds')
      .notNullable()
      .comment('Video timestamp in seconds where annotation is placed');
    
    table.text('content')
      .notNullable()
      .comment('Annotation text content (1-1000 characters)');
    
    table.boolean('is_shared')
      .defaultTo(false)
      .comment('Whether annotation is shared with other students (teachers can share)');
    
    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Constraints
    table.check('timestamp_seconds >= 0', [], 'valid_timestamp');
    table.check('LENGTH(content) > 0 AND LENGTH(content) <= 1000', [], 'valid_content');
    
    // Indexes for performance
    table.index(['lesson_id', 'user_id'], 'idx_annotations_lesson_user');
    table.index(['lesson_id', 'timestamp_seconds'], 'idx_annotations_timestamp');
    table.index(['lesson_id', 'is_shared'], 'idx_annotations_shared');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('video_annotations');
};
