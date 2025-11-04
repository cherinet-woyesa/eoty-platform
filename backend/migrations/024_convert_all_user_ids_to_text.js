/**
 * COMPREHENSIVE USER ID MIGRATION: Integer to Text
 * 
 * This migration converts all user IDs from integer to text (string) to support Better Auth.
 * It handles 58 foreign key constraints across the entire database.
 * 
 * WARNING: This is a DESTRUCTIVE migration. Back up your database before running!
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  console.log('🚀 Starting comprehensive user ID migration (integer → text)');
  console.log('⚠️  This will take several minutes. Please wait...\n');

  // List of all tables with user_id foreign keys
  const tables = [
    { table: 'account_table', column: 'user_id' },
    { table: 'admin_actions', column: 'admin_id' },
    { table: 'ai_conversations', column: 'user_id' },
    { table: 'analytics_events', column: 'user_id' },
    { table: 'auto_moderation_logs', column: 'user_id' },
    { table: 'content_favorites', column: 'user_id' },
    { table: 'content_ratings', column: 'user_id' },
    { table: 'content_review_queue', column: 'assigned_to' },
    { table: 'content_shares', column: 'shared_by' },
    { table: 'content_translations', columns: ['reviewed_by', 'translated_by'] },
    { table: 'content_uploads', columns: ['uploaded_by', 'approved_by'] },
    { table: 'courses', column: 'created_by' },
    { table: 'discussion_reports', columns: ['reporter_id', 'resolved_by'] },
    { table: 'doctrinal_review_queue', column: 'reviewed_by' },
    { table: 'forum_posts', column: 'user_id' },
    { table: 'forum_topics', column: 'author_id' },
    { table: 'forums', column: 'created_by' },
    { table: 'google_auth', column: 'user_id' },
    { table: 'language_preferences', column: 'user_id' },
    { table: 'language_usage_logs', column: 'user_id' },
    { table: 'leaderboard_entries', column: 'user_id' },
    { table: 'lesson_discussions', column: 'user_id' },
    { table: 'lessons', column: 'created_by' },
    { table: 'moderation_escalations', columns: ['reviewed_by', 'user_id'] },
    { table: 'moderation_resolution_logs', column: 'moderator_id' },
    { table: 'moderation_settings', column: 'updated_by' },
    { table: 'multilingual_resources', column: 'translated_by' },
    { table: 'onboarding_steps', column: 'user_id' },
    { table: 'performance_alerts', column: 'acknowledged_by' },
    { table: 'post_likes', column: 'user_id' },
    { table: 'push_subscriptions', column: 'user_id' },
    { table: 'quiz_sessions', column: 'user_id' },
    { table: 'reports', columns: ['assigned_to', 'reported_by'] },
    { table: 'resource_usage', column: 'user_id' },
    { table: 'resources', column: 'uploaded_by' },
    { table: 'session_table', column: 'user_id' },
    { table: 'translation_logs', column: 'user_id' },
    { table: 'translation_memory', column: 'added_by' },
    { table: 'unsupported_language_logs', column: 'user_id' },
    { table: 'user_achievements', column: 'user_id' },
    { table: 'user_badges', column: 'user_id' },
    { table: 'user_course_enrollments', column: 'user_id' },
    { table: 'user_engagement', column: 'user_id' },
    { table: 'user_learning_sessions', column: 'user_id' },
    { table: 'user_lesson_progress', column: 'user_id' },
    { table: 'user_notes', column: 'user_id' },
    { table: 'user_notifications', column: 'user_id' },
    { table: 'user_preferences', column: 'user_id' },
    { table: 'user_roles', column: 'user_id' },
    { table: 'video_annotations', column: 'user_id' },
    { table: 'video_availability_notifications', column: 'user_id' },
    { table: 'video_subtitles', column: 'created_by' },
    { table: 'videos', column: 'uploader_id' },
  ];

  // STEP 1: Add new text columns to users table
  console.log('📝 Step 1: Adding new text ID column to users table...');
  await knex.schema.table('users', function(table) {
    table.text('id_new');
  });
  
  // Copy existing IDs as strings
  await knex.raw(`UPDATE users SET id_new = id::text`);
  console.log('✅ Users ID column prepared\n');

  // STEP 2: Add new text columns to all related tables
  console.log('📝 Step 2: Adding new text columns to all related tables...');
  for (const item of tables) {
    const columns = item.columns || [item.column];
    for (const column of columns) {
      await knex.schema.table(item.table, function(table) {
        table.text(`${column}_new`);
      });
      // Copy data
      await knex.raw(`UPDATE ${item.table} SET ${column}_new = ${column}::text WHERE ${column} IS NOT NULL`);
    }
    console.log(`✅ ${item.table}`);
  }
  console.log('');

  // STEP 3: Drop all foreign key constraints
  console.log('📝 Step 3: Dropping all foreign key constraints...');
  await knex.raw(`ALTER TABLE account_table DROP CONSTRAINT IF EXISTS account_user_id_foreign CASCADE`);
  await knex.raw(`ALTER TABLE session_table DROP CONSTRAINT IF EXISTS session_user_id_foreign CASCADE`);
  
  // Drop all other foreign keys - map constraint to table explicitly
  const fkConstraints = [
    { table: 'admin_actions', constraint: 'admin_actions_admin_id_foreign' },
    { table: 'ai_conversations', constraint: 'ai_conversations_user_id_foreign' },
    { table: 'analytics_events', constraint: 'analytics_events_user_id_foreign' },
    { table: 'auto_moderation_logs', constraint: 'auto_moderation_logs_user_id_foreign' },
    { table: 'content_favorites', constraint: 'content_favorites_user_id_foreign' },
    { table: 'content_ratings', constraint: 'content_ratings_user_id_foreign' },
    { table: 'content_review_queue', constraint: 'content_review_queue_assigned_to_foreign' },
    { table: 'content_shares', constraint: 'content_shares_shared_by_foreign' },
    { table: 'content_translations', constraint: 'content_translations_reviewed_by_foreign' },
    { table: 'content_translations', constraint: 'content_translations_translated_by_foreign' },
    { table: 'content_uploads', constraint: 'content_uploads_uploaded_by_foreign' },
    { table: 'content_uploads', constraint: 'content_uploads_approved_by_foreign' },
    { table: 'courses', constraint: 'courses_created_by_foreign' },
    { table: 'discussion_reports', constraint: 'discussion_reports_reporter_id_foreign' },
    { table: 'discussion_reports', constraint: 'discussion_reports_resolved_by_foreign' },
    { table: 'doctrinal_review_queue', constraint: 'doctrinal_review_queue_reviewed_by_foreign' },
    { table: 'forum_posts', constraint: 'forum_posts_user_id_foreign' },
    { table: 'forum_topics', constraint: 'forum_topics_author_id_foreign' },
    { table: 'forums', constraint: 'forums_created_by_foreign' },
    { table: 'google_auth', constraint: 'google_auth_user_id_foreign' },
    { table: 'language_preferences', constraint: 'language_preferences_user_id_foreign' },
    { table: 'language_usage_logs', constraint: 'language_usage_logs_user_id_foreign' },
    { table: 'leaderboard_entries', constraint: 'leaderboard_entries_user_id_foreign' },
    { table: 'lesson_discussions', constraint: 'lesson_discussions_user_id_foreign' },
    { table: 'lessons', constraint: 'lessons_created_by_foreign' },
    { table: 'moderation_escalations', constraint: 'moderation_escalations_reviewed_by_foreign' },
    { table: 'moderation_escalations', constraint: 'moderation_escalations_user_id_foreign' },
    { table: 'moderation_resolution_logs', constraint: 'moderation_resolution_logs_moderator_id_foreign' },
    { table: 'moderation_settings', constraint: 'moderation_settings_updated_by_foreign' },
    { table: 'multilingual_resources', constraint: 'multilingual_resources_translated_by_foreign' },
    { table: 'onboarding_steps', constraint: 'onboarding_steps_user_id_foreign' },
    { table: 'performance_alerts', constraint: 'performance_alerts_acknowledged_by_foreign' },
    { table: 'post_likes', constraint: 'post_likes_user_id_foreign' },
    { table: 'push_subscriptions', constraint: 'push_subscriptions_user_id_foreign' },
    { table: 'quiz_sessions', constraint: 'quiz_sessions_user_id_foreign' },
    { table: 'reports', constraint: 'reports_assigned_to_foreign' },
    { table: 'reports', constraint: 'reports_reported_by_foreign' },
    { table: 'resource_usage', constraint: 'resource_usage_user_id_foreign' },
    { table: 'resources', constraint: 'resources_uploaded_by_foreign' },
    { table: 'translation_logs', constraint: 'translation_logs_user_id_foreign' },
    { table: 'translation_memory', constraint: 'translation_memory_added_by_foreign' },
    { table: 'unsupported_language_logs', constraint: 'unsupported_language_logs_user_id_foreign' },
    { table: 'user_achievements', constraint: 'user_achievements_user_id_foreign' },
    { table: 'user_badges', constraint: 'user_badges_user_id_foreign' },
    { table: 'user_course_enrollments', constraint: 'user_course_enrollments_user_id_foreign' },
    { table: 'user_engagement', constraint: 'user_engagement_user_id_foreign' },
    { table: 'user_learning_sessions', constraint: 'user_learning_sessions_user_id_foreign' },
    { table: 'user_lesson_progress', constraint: 'user_lesson_progress_user_id_foreign' },
    { table: 'user_notes', constraint: 'user_notes_user_id_foreign' },
    { table: 'user_notifications', constraint: 'user_notifications_user_id_foreign' },
    { table: 'user_preferences', constraint: 'user_preferences_user_id_foreign' },
    { table: 'user_roles', constraint: 'user_roles_user_id_foreign' },
    { table: 'video_annotations', constraint: 'video_annotations_user_id_foreign' },
    { table: 'video_availability_notifications', constraint: 'video_availability_notifications_user_id_foreign' },
    { table: 'video_subtitles', constraint: 'video_subtitles_created_by_foreign' },
    { table: 'videos', constraint: 'videos_uploader_id_foreign' },
  ];

  for (const item of fkConstraints) {
    await knex.raw(`ALTER TABLE ${item.table} DROP CONSTRAINT IF EXISTS ${item.constraint} CASCADE`);
  }
  console.log('✅ All foreign keys dropped\n');

  // STEP 4: Drop views that depend on users.id
  console.log('📝 Step 4: Dropping dependent views...');
  await knex.raw(`DROP VIEW IF EXISTS "user" CASCADE`);
  await knex.raw(`DROP VIEW IF EXISTS "session" CASCADE`);
  await knex.raw(`DROP VIEW IF EXISTS "account" CASCADE`);
  console.log('✅ Views dropped\n');

  // STEP 5: Drop old integer columns
  console.log('📝 Step 5: Dropping old integer columns...');
  await knex.schema.table('users', function(table) {
    table.dropColumn('id');
  });
  
  for (const item of tables) {
    const columns = item.columns || [item.column];
    for (const column of columns) {
      await knex.schema.table(item.table, function(table) {
        table.dropColumn(column);
      });
    }
  }
  console.log('✅ Old columns dropped\n');

  // STEP 6: Rename new columns to original names
  console.log('📝 Step 6: Renaming new columns...');
  await knex.schema.table('users', function(table) {
    table.renameColumn('id_new', 'id');
  });
  
  for (const item of tables) {
    const columns = item.columns || [item.column];
    for (const column of columns) {
      await knex.schema.table(item.table, function(table) {
        table.renameColumn(`${column}_new`, column);
      });
    }
  }
  console.log('✅ Columns renamed\n');

  // STEP 7: Add primary key to users
  console.log('📝 Step 7: Adding primary key...');
  await knex.raw(`ALTER TABLE users ADD PRIMARY KEY (id)`);
  console.log('✅ Primary key added\n');

  // STEP 8: Recreate all foreign key constraints
  console.log('📝 Step 8: Recreating foreign key constraints...');
  for (const item of tables) {
    const columns = item.columns || [item.column];
    for (const column of columns) {
      const constraintName = `${item.table}_${column}_foreign`;
      await knex.raw(`
        ALTER TABLE ${item.table} 
        ADD CONSTRAINT ${constraintName} 
        FOREIGN KEY (${column}) 
        REFERENCES users(id) 
        ON DELETE CASCADE
      `);
    }
  }
  console.log('✅ All foreign keys recreated\n');

  // STEP 9: Recreate views
  console.log('📝 Step 9: Recreating views...');
  await knex.raw(`
    CREATE OR REPLACE VIEW "user" AS 
    SELECT 
      id,
      email,
      password_hash AS password,
      name,
      email_verified AS "emailVerified",
      profile_picture AS image,
      created_at AS "createdAt",
      updated_at AS "updatedAt",
      first_name,
      last_name,
      role,
      chapter_id,
      profile_picture,
      is_active,
      two_factor_enabled,
      two_factor_secret,
      migrated_to_better_auth
    FROM users;
  `);

  await knex.raw(`
    CREATE OR REPLACE VIEW "account" AS 
    SELECT 
      id,
      user_id AS "userId",
      account_id AS "accountId",
      provider,
      access_token AS "accessToken",
      refresh_token AS "refreshToken",
      expires_at AS "expiresAt",
      scope,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM account_table;
  `);

  await knex.raw(`
    CREATE OR REPLACE VIEW "session" AS 
    SELECT 
      id,
      user_id AS "userId",
      expires_at AS "expiresAt",
      token,
      ip_address AS "ipAddress",
      user_agent AS "userAgent",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM session_table;
  `);
  console.log('✅ Views recreated\n');

  console.log('🎉 Migration complete! User IDs are now text (string) type.');
  console.log('✅ Better Auth is now fully compatible with your database.\n');
};

/**
 * Rollback migration
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  console.log('⚠️ WARNING: Rolling back user ID migration is complex and not recommended.');
  console.log('⚠️ This is a partial implementation - restore from backup for full rollback.');
  console.log('⚠️ Starting partial rollback...');

  // Since this is a destructive migration, we provide a basic down function
  // but warn that a full rollback requires database backup restoration
  
  // Drop the views first
  await knex.raw(`DROP VIEW IF EXISTS "user" CASCADE`);
  await knex.raw(`DROP VIEW IF EXISTS "session" CASCADE`);
  await knex.raw(`DROP VIEW IF EXISTS "account" CASCADE`);
  
  console.log('✅ Views dropped');
  console.log('❌ Full rollback not implemented. Restore from backup if needed.');
  
  throw new Error(
    'Full rollback not implemented for this complex migration. ' +
    'Please restore your database from the backup created before running this migration.'
  );
};