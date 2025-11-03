// backend/migrations/20251103220213_add_s3_key_to_lessons.js

/**
 * Migration: Add s3_key column to lessons table
 * 
 * Purpose: Store S3 object keys instead of full URLs for better security
 * This allows generating fresh signed URLs on-demand
 */

exports.up = function(knex) {
  return knex.schema.table('lessons', function(table) {
    // Add s3_key column to store the S3 object key (e.g., "videos/video_123.webm")
    table.text('s3_key').nullable();
    
    console.log('Added s3_key column to lessons table');
  });
};

exports.down = function(knex) {
  return knex.schema.table('lessons', function(table) {
    table.dropColumn('s3_key');
    
    console.log('Removed s3_key column from lessons table');
  });
};
