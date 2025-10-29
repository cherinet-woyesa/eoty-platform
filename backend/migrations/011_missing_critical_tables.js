/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // 1. user_lesson_progress - THE TABLE CAUSING THE CURRENT ERROR
  await knex.schema.createTable('user_lesson_progress', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.integer('lesson_id').unsigned().references('id').inTable('lessons').onDelete('CASCADE');
    table.float('progress').defaultTo(0);
    table.float('last_watched_timestamp').defaultTo(0);
    table.boolean('is_completed').defaultTo(false);
    table.timestamp('completed_at');
    table.timestamp('last_accessed_at');
    table.timestamps(true, true);
    table.unique(['user_id', 'lesson_id']);
    table.index(['user_id', 'is_completed']);
  });

  // 2. video_annotations
  await knex.schema.createTable('video_annotations', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.integer('lesson_id').unsigned().references('id').inTable('lessons').onDelete('CASCADE');
    table.float('timestamp');
    table.text('content').notNullable();
    table.enu('type', ['highlight', 'comment', 'bookmark']).notNullable();
    table.jsonb('metadata');
    table.boolean('is_public').defaultTo(false);
    table.timestamps(true, true);
    table.index(['user_id', 'lesson_id']);
    table.index(['lesson_id', 'timestamp']);
  });

  // 3. forum_topics
  await knex.schema.createTable('forum_topics', (table) => {
    table.increments('id').primary();
    table.integer('forum_id').unsigned().references('id').inTable('forums').onDelete('CASCADE');
    table.string('title').notNullable();
    table.text('content').notNullable();
    table.integer('author_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.boolean('is_pinned').defaultTo(false);
    table.boolean('is_locked').defaultTo(false);
    table.integer('view_count').defaultTo(0);
    table.integer('post_count').defaultTo(0);
    table.integer('last_post_id').unsigned();
    table.timestamp('last_activity_at').defaultTo(knex.fn.now());
    table.timestamps(true, true);
    table.index(['forum_id', 'last_activity_at']);
  });

  // 4. video_subtitles
  await knex.schema.createTable('video_subtitles', (table) => {
    table.increments('id').primary();
    table.integer('lesson_id').unsigned().references('id').inTable('lessons').onDelete('CASCADE');
    table.string('language_code').notNullable();
    table.string('language_name').notNullable();
    table.string('subtitle_url').notNullable();
    table.integer('created_by').unsigned().references('id').inTable('users').onDelete('SET NULL');
    table.timestamps(true, true);
    table.unique(['lesson_id', 'language_code']);
    table.index(['lesson_id', 'language_code']);
  });

  // 5. system_monitoring
  await knex.schema.createTable('system_monitoring', (table) => {
    table.increments('id').primary();
    table.string('metric').notNullable();
    table.decimal('value', 10, 2).notNullable();
    table.text('details');
    table.text('error');
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    table.index(['metric']);
    table.index(['timestamp']);
  });

  // 6. video_availability_notifications
  await knex.schema.createTable('video_availability_notifications', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.integer('lesson_id').unsigned().references('id').inTable('lessons').onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('notified_at');
    table.boolean('is_notified').defaultTo(false);
    table.unique(['user_id', 'lesson_id']);
    table.index(['user_id']);
    table.index(['lesson_id']);
    table.index(['is_notified']);
  });

  // 7. Check if lesson_discussions exists before adding columns
  const hasLessonDiscussions = await knex.schema.hasTable('lesson_discussions');
  if (hasLessonDiscussions) {
    await knex.schema.table('lesson_discussions', (table) => {
      table.integer('report_count').defaultTo(0);
      table.boolean('is_auto_flagged').defaultTo(false);
      table.string('auto_flag_reason', 50);
    });
  }

  // 8. Create discussion_reports only if lesson_discussions exists
  if (hasLessonDiscussions) {
    await knex.schema.createTable('discussion_reports', (table) => {
      table.increments('id').primary();
      table.integer('post_id').unsigned().references('id').inTable('lesson_discussions').onDelete('CASCADE');
      table.integer('reporter_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
      table.enu('reason', ['inappropriate', 'spam', 'harassment', 'offensive', 'other']).notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.unique(['post_id', 'reporter_id']);
      table.index(['post_id']);
      table.index(['reporter_id']);
    });
  }
};

exports.down = async function(knex) {
  const hasLessonDiscussions = await knex.schema.hasTable('lesson_discussions');
  
  if (hasLessonDiscussions) {
    await knex.schema.table('lesson_discussions', (table) => {
      table.dropColumn('report_count');
      table.dropColumn('is_auto_flagged');
      table.dropColumn('auto_flag_reason');
    });
  }

  await knex.schema.dropTableIfExists('discussion_reports');
  await knex.schema.dropTableIfExists('system_monitoring');
  await knex.schema.dropTableIfExists('video_availability_notifications');
  await knex.schema.dropTableIfExists('video_subtitles');
  await knex.schema.dropTableIfExists('forum_topics');
  await knex.schema.dropTableIfExists('video_annotations');
  await knex.schema.dropTableIfExists('user_lesson_progress');
};