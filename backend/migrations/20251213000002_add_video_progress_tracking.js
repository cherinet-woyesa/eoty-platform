/**
 * Migration: Add video progress tracking and playback preferences
 */

exports.up = function(knex) {
  return knex.schema
    // Create video progress tracking table
    .createTable('video_progress', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable()
        .references('id').inTable('users').onDelete('CASCADE');
      table.integer('lesson_id').unsigned().notNullable()
        .references('id').inTable('lessons').onDelete('CASCADE');
      table.integer('current_time').defaultTo(0); // In seconds
      table.integer('duration').defaultTo(0); // Total duration in seconds
      table.decimal('completion_percentage', 5, 2).defaultTo(0);
      table.boolean('completed').defaultTo(false);
      table.integer('watch_count').defaultTo(0);
      table.timestamp('last_watched_at').defaultTo(knex.fn.now());
      table.timestamps(true, true);
      table.unique(['user_id', 'lesson_id']);
    })
    
    // Create user video preferences table
    .createTable('user_video_preferences', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable()
        .references('id').inTable('users').onDelete('CASCADE');
      table.decimal('playback_speed', 3, 2).defaultTo(1.0);
      table.string('preferred_quality').defaultTo('720p');
      table.boolean('auto_play_next').defaultTo(true);
      table.boolean('show_captions').defaultTo(false);
      table.string('caption_language').defaultTo('en');
      table.timestamps(true, true);
      table.unique(['user_id']);
    })
    
    // Create video chapters/timestamps table
    .createTable('video_chapters', function(table) {
      table.increments('id').primary();
      table.integer('lesson_id').unsigned().notNullable()
        .references('id').inTable('lessons').onDelete('CASCADE');
      table.string('title').notNullable();
      table.text('description').nullable();
      table.integer('start_time').notNullable(); // In seconds
      table.integer('end_time').nullable(); // In seconds
      table.integer('order_index').defaultTo(0);
      table.timestamps(true, true);
    })
    
    // Add video-specific fields to lessons table if not exists
    .raw(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='video_duration') THEN
          ALTER TABLE lessons ADD COLUMN video_duration INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='video_quality') THEN
          ALTER TABLE lessons ADD COLUMN video_quality VARCHAR(50) DEFAULT '720p';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='has_captions') THEN
          ALTER TABLE lessons ADD COLUMN has_captions BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='thumbnail_url') THEN
          ALTER TABLE lessons ADD COLUMN thumbnail_url VARCHAR(500);
        END IF;
      END $$;
    `);
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('video_chapters')
    .dropTableIfExists('user_video_preferences')
    .dropTableIfExists('video_progress')
    .raw(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='video_duration') THEN
          ALTER TABLE lessons DROP COLUMN video_duration;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='video_quality') THEN
          ALTER TABLE lessons DROP COLUMN video_quality;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='has_captions') THEN
          ALTER TABLE lessons DROP COLUMN has_captions;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='thumbnail_url') THEN
          ALTER TABLE lessons DROP COLUMN thumbnail_url;
        END IF;
      END $$;
    `);
};
