/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    // Create videos table
    await knex.schema.createTable('videos', (table) => {
      table.increments('id').primary();
      table.integer('lesson_id').unsigned().references('id').inTable('lessons').onDelete('CASCADE');
      table.integer('uploader_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
      table.text('storage_url').notNullable();
      table.text('thumbnail_url');
      table.enu('status', ['uploading', 'processing', 'ready', 'failed']).defaultTo('uploading');
      table.integer('duration_seconds');
      table.bigInteger('size_bytes');
      table.string('codec', 50);
      table.integer('width');
      table.integer('height');
      table.text('processing_error');
      table.timestamp('processing_started_at');
      table.timestamp('processing_completed_at');
      table.timestamps(true, true);
      
      table.index(['lesson_id']);
      table.index(['status']);
      table.index(['created_at']);
    });
  
    // Create video_transcripts table
    await knex.schema.createTable('video_transcripts', (table) => {
      table.increments('id').primary();
      table.integer('video_id').unsigned().references('id').inTable('videos').onDelete('CASCADE');
      table.string('language', 10).notNullable();
      table.text('transcript');
      table.decimal('confidence', 3, 2);
      table.string('provider', 50);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      table.index(['video_id']);
      table.index(['language']);
      table.unique(['video_id', 'language']); // One transcript per language per video
    });
  
    // Create video_processing_jobs table
    await knex.schema.createTable('video_processing_jobs', (table) => {
      table.increments('id').primary();
      table.integer('video_id').unsigned().references('id').inTable('videos').onDelete('CASCADE');
      table.enu('task_type', ['thumbnail', 'transcode', 'transcribe']).notNullable();
      table.enu('status', ['queued', 'running', 'succeeded', 'failed']).defaultTo('queued');
      table.jsonb('payload');
      table.jsonb('result');
      table.text('error');
      table.timestamp('started_at');
      table.timestamp('finished_at');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      table.index(['video_id']);
      table.index(['task_type', 'status']);
      table.index(['status', 'created_at']);
    });
  
    // Add video_id to lessons table for primary video reference
    await knex.schema.table('lessons', (table) => {
      table.integer('video_id').unsigned().references('id').inTable('videos').onDelete('SET NULL');
      table.index(['video_id']);
    });
  };
  
  exports.down = async function(knex) {
    // Remove video_id from lessons table
    await knex.schema.table('lessons', (table) => {
      table.dropColumn('video_id');
    });
  
    // Drop tables in reverse order
    await knex.schema.dropTableIfExists('video_processing_jobs');
    await knex.schema.dropTableIfExists('video_transcripts');
    await knex.schema.dropTableIfExists('videos');
  };