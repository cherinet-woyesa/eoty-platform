/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Videos table
  await knex.schema.createTable('videos', (table) => {
    table.increments('id').primary();
    table.integer('lesson_id').unsigned().references('id').inTable('lessons').onDelete('CASCADE');
    table.string('uploader_id', 255).references('id').inTable('users').onDelete('SET NULL');
    table.text('storage_url').notNullable();
    table.string('s3_key');
    table.string('content_hash'); // For file integrity
    table.text('thumbnail_url');
    table.enu('status', ['uploading', 'processing', 'ready', 'failed', 'retrying']).defaultTo('uploading');
    table.integer('duration_seconds');
    table.bigInteger('size_bytes');
    table.string('codec', 50);
    table.integer('width');
    table.integer('height');
    table.integer('processing_attempts').defaultTo(0);
    table.text('processing_error');
    table.jsonb('processing_metadata');
    table.timestamp('processing_started_at');
    table.timestamp('processing_completed_at');
    table.timestamp('last_processed_at');
    table.jsonb('video_metadata'); // Bitrate, format, etc.
    table.timestamps(true, true);
    
    table.index(['lesson_id']);
    table.index(['status']);
    table.index(['uploader_id']);
    table.index(['created_at']);
  });

  // Video transcripts
  await knex.schema.createTable('video_transcripts', (table) => {
    table.increments('id').primary();
    table.integer('video_id').unsigned().references('id').inTable('videos').onDelete('CASCADE');
    table.string('language', 10).notNullable();
    table.text('transcript');
    table.decimal('confidence', 3, 2);
    table.string('provider', 50);
    table.jsonb('segments'); // Timestamped transcript segments
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index(['video_id']);
    table.index(['language']);
    table.unique(['video_id', 'language']);
  });

  // Video subtitles (external subtitle files)
  await knex.schema.createTable('video_subtitles', (table) => {
    table.increments('id').primary();
    table.integer('lesson_id').unsigned().references('id').inTable('lessons').onDelete('CASCADE');
    table.string('language_code', 10).notNullable();
    table.string('language_name', 50).notNullable();
    table.string('subtitle_url').notNullable();
    table.integer('file_size').unsigned();
    table.string('created_by', 255).references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.unique(['lesson_id', 'language_code']);
    table.index(['lesson_id']);
    table.index(['language_code']);
  });

  // Video processing jobs
  await knex.schema.createTable('video_processing_jobs', (table) => {
    table.increments('id').primary();
    table.integer('video_id').unsigned().references('id').inTable('videos').onDelete('CASCADE');
    table.enu('task_type', ['thumbnail', 'transcode', 'transcribe', 'analyze']).notNullable();
    table.enu('status', ['queued', 'running', 'succeeded', 'failed']).defaultTo('queued');
    table.jsonb('payload');
    table.jsonb('result');
    table.text('error');
    table.integer('attempts').defaultTo(0);
    table.timestamp('started_at');
    table.timestamp('finished_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index(['video_id']);
    table.index(['task_type', 'status']);
    table.index(['status', 'created_at']);
  });

  // Video annotations
  await knex.schema.createTable('video_annotations', (table) => {
    table.increments('id').primary();
    table.string('user_id', 255).references('id').inTable('users').onDelete('CASCADE');
    table.integer('lesson_id').unsigned().references('id').inTable('lessons').onDelete('CASCADE');
    table.float('timestamp');
    table.text('content').notNullable();
    table.enu('type', ['highlight', 'comment', 'bookmark', 'question']).notNullable();
    table.jsonb('metadata');
    table.boolean('is_public').defaultTo(false);
    table.timestamps(true, true);
    
    table.index(['user_id', 'lesson_id']);
    table.index(['lesson_id', 'timestamp']);
    table.index(['type', 'created_at']);
  });

  // Video availability notifications
  await knex.schema.createTable('video_availability_notifications', (table) => {
    table.increments('id').primary();
    table.string('user_id', 255).references('id').inTable('users').onDelete('CASCADE');
    table.integer('lesson_id').unsigned().references('id').inTable('lessons').onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('notified_at');
    table.boolean('is_notified').defaultTo(false);
    table.string('notification_type').defaultTo('availability');
    
    table.unique(['user_id', 'lesson_id']);
    table.index(['user_id']);
    table.index(['lesson_id']);
    table.index(['is_notified']);
  });

  // Add video reference to lessons table
  await knex.schema.table('lessons', (table) => {
    table.integer('video_id').unsigned().references('id').inTable('videos').onDelete('SET NULL');
    table.bigInteger('video_size').unsigned().nullable();
    table.integer('video_duration').unsigned().nullable();
    table.timestamp('video_uploaded_at').nullable();
    
    table.index(['video_id']);
  });
};

exports.down = async function(knex) {
  // Remove video columns from lessons
  await knex.schema.table('lessons', (table) => {
    table.dropColumn('video_id');
    table.dropColumn('video_size');
    table.dropColumn('video_duration');
    table.dropColumn('video_uploaded_at');
  });

  // Drop tables in reverse order
  await knex.schema.dropTableIfExists('video_availability_notifications');
  await knex.schema.dropTableIfExists('video_annotations');
  await knex.schema.dropTableIfExists('video_processing_jobs');
  await knex.schema.dropTableIfExists('video_subtitles');
  await knex.schema.dropTableIfExists('video_transcripts');
  await knex.schema.dropTableIfExists('videos');
};