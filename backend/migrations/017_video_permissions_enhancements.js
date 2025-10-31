/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // 1. Add video permissions
  await knex('user_permissions').insert([
    { permission_key: 'video:upload', description: 'Upload video files for lessons' },
    { permission_key: 'video:stream', description: 'Stream video content' },
    { permission_key: 'video:manage', description: 'Manage video content and subtitles' }
  ]);

  // 2. Grant video permissions to roles
  const videoUploadId = await knex('user_permissions').where('permission_key', 'video:upload').first('id');
  const videoStreamId = await knex('user_permissions').where('permission_key', 'video:stream').first('id');
  const videoManageId = await knex('user_permissions').where('permission_key', 'video:manage').first('id');

  await knex('role_permissions').insert([
    { role: 'teacher', permission_id: videoUploadId.id },
    { role: 'teacher', permission_id: videoStreamId.id },
    { role: 'teacher', permission_id: videoManageId.id },
    { role: 'admin', permission_id: videoUploadId.id },
    { role: 'admin', permission_id: videoStreamId.id },
    { role: 'admin', permission_id: videoManageId.id }
  ]);

  // 3. Check if video_availability_notifications already exists (from migration 011)
  const hasVideoNotifications = await knex.schema.hasTable('video_availability_notifications');
  
  if (!hasVideoNotifications) {
    await knex.schema.createTable('video_availability_notifications', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.string('lesson_id', 100).notNullable();
      table.boolean('is_notified').defaultTo(false);
      table.timestamp('notified_at').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.foreign('lesson_id').references('id').inTable('lessons').onDelete('CASCADE');
      
      table.index(['user_id', 'lesson_id']);
      table.index(['is_notified']);
    });
  }

  // 4. Check if video_subtitles already exists (different from our video_transcripts)
  const hasVideoSubtitles = await knex.schema.hasTable('video_subtitles');
  
  if (!hasVideoSubtitles) {
    await knex.schema.createTable('video_subtitles', (table) => {
      table.increments('id').primary();
      table.string('lesson_id', 100).notNullable();
      table.string('language_code', 10).notNullable();
      table.string('language_name', 50).notNullable();
      table.string('subtitle_url').notNullable();
      table.integer('file_size').unsigned();
      table.integer('created_by').unsigned().notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      table.foreign('lesson_id').references('id').inTable('lessons').onDelete('CASCADE');
      table.foreign('created_by').references('id').inTable('users').onDelete('CASCADE');
      
      table.unique(['lesson_id', 'language_code']);
      table.index(['lesson_id']);
      table.index(['language_code']);
    });
  }

  // 5. Add video metadata columns to lessons table if they don't exist
  const hasVideoSize = await knex.schema.hasColumn('lessons', 'video_size');
  const hasVideoDuration = await knex.schema.hasColumn('lessons', 'video_duration');
  const hasVideoUploadedAt = await knex.schema.hasColumn('lessons', 'video_uploaded_at');

  if (!hasVideoSize) {
    await knex.schema.alterTable('lessons', (table) => {
      table.bigInteger('video_size').unsigned().nullable();
    });
  }

  if (!hasVideoDuration) {
    await knex.schema.alterTable('lessons', (table) => {
      table.integer('video_duration').unsigned().nullable();
    });
  }

  if (!hasVideoUploadedAt) {
    await knex.schema.alterTable('lessons', (table) => {
      table.timestamp('video_uploaded_at').nullable();
    });
  }
};

exports.down = async function(knex) {
  // Remove video metadata columns
  await knex.schema.alterTable('lessons', (table) => {
    table.dropColumn('video_size');
    table.dropColumn('video_duration');
    table.dropColumn('video_uploaded_at');
  });

  // Drop tables if they exist
  await knex.schema.dropTableIfExists('video_subtitles');
  await knex.schema.dropTableIfExists('video_availability_notifications');

  // Remove video permissions from role_permissions
  const videoPermissionIds = await knex('user_permissions')
    .whereIn('permission_key', ['video:upload', 'video:stream', 'video:manage'])
    .select('id');

  if (videoPermissionIds.length > 0) {
    await knex('role_permissions')
      .whereIn('permission_id', videoPermissionIds.map(p => p.id))
      .del();
  }

  // Remove video permissions
  await knex('user_permissions')
    .whereIn('permission_key', ['video:upload', 'video:stream', 'video:manage'])
    .del();
};