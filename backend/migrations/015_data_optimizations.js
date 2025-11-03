/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Helper function to check if index exists
  const hasIndex = async (tableName, columns) => {
    try {
      const indexName = `${tableName}_${columns.join('_')}_index`;
      const result = await knex.raw(`
        SELECT 1 FROM pg_indexes 
        WHERE tablename = ? AND indexname = ?
      `, [tableName, indexName]);
      return result.rows.length > 0;
    } catch (error) {
      return false;
    }
  };

  // Helper function to check if constraint exists
  const constraintExists = async (tableName, constraintName) => {
    try {
      const result = await knex.raw(`
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = ? AND table_name = ?
      `, [constraintName, tableName]);
      return result.rows.length > 0;
    } catch (error) {
      return false;
    }
  };

  // Add indexes safely
  const indexesToAdd = [
    { table: 'users', columns: ['role', 'is_active'] },
    { table: 'users', columns: ['created_at'] },
    { table: 'courses', columns: ['is_published', 'created_at'] },
    { table: 'courses', columns: ['created_by', 'is_published'] },
    { table: 'lessons', columns: ['is_published', 'course_id'] },
    { table: 'lessons', columns: ['created_by', 'is_published'] },
    { table: 'user_lesson_progress', columns: ['last_accessed_at'] },
    { table: 'user_lesson_progress', columns: ['progress', 'is_completed'] },
    { table: 'quiz_sessions', columns: ['score_percentage', 'is_completed'] },
    { table: 'quiz_sessions', columns: ['started_at'] },
    { table: 'resources', columns: ['is_public', 'created_at'] },
    { table: 'forum_posts', columns: ['like_count', 'created_at'] },
    { table: 'user_engagement', columns: ['engagement_type', 'created_at'] },
    { table: 'user_engagement', columns: ['points_earned', 'created_at'] },
    { table: 'user_course_enrollments', columns: ['enrollment_status', 'last_accessed_at'] },
    { table: 'user_course_enrollments', columns: ['progress_percentage', 'enrolled_at'] },
    { table: 'ai_messages', columns: ['conversation_id', 'is_user_message', 'created_at'] },
    { table: 'video_processing_jobs', columns: ['status', 'task_type', 'created_at'] }
  ];

  for (const index of indexesToAdd) {
    const exists = await hasIndex(index.table, index.columns);
    
    if (!exists) {
      await knex.schema.alterTable(index.table, (table) => {
        table.index(index.columns);
      });
      console.log(`✅ Created index: ${index.table}_${index.columns.join('_')}`);
    } else {
      console.log(`ℹ️  Index already exists: ${index.table}_${index.columns.join('_')}`);
    }
  }

  // Add foreign key constraints safely
  const foreignKeysToAdd = [
    { table: 'forum_topics', column: 'last_post_id', refTable: 'forum_posts' },
    { table: 'content_uploads', column: 'parent_version_id', refTable: 'content_uploads' }
  ];

  for (const fk of foreignKeysToAdd) {
    const constraintName = `${fk.table}_${fk.column}_foreign`;
    const exists = await constraintExists(fk.table, constraintName);

    if (!exists) {
      await knex.schema.alterTable(fk.table, (table) => {
        table.foreign(fk.column).references('id').inTable(fk.refTable).onDelete('SET NULL');
      });
      console.log(`✅ Added foreign key: ${constraintName}`);
    } else {
      console.log(`ℹ️  Foreign key already exists: ${constraintName}`);
    }
  }

  // Safely create partial indexes
  const partialIndexes = [
    {
      name: 'idx_users_active_students',
      sql: `CREATE INDEX IF NOT EXISTS idx_users_active_students ON users (role, chapter_id) WHERE is_active = true AND role = 'student'`
    },
    {
      name: 'idx_lessons_published_courses', 
      sql: `CREATE INDEX IF NOT EXISTS idx_lessons_published_courses ON lessons (course_id, "order") WHERE is_published = true`
    },
    {
      name: 'idx_quiz_questions_active',
      sql: `CREATE INDEX IF NOT EXISTS idx_quiz_questions_active ON quiz_questions (quiz_id, order_number) WHERE is_active = true`
    },
    {
      name: 'idx_user_progress_recent',
      sql: `CREATE INDEX IF NOT EXISTS idx_user_progress_recent ON user_lesson_progress (user_id, last_accessed_at) WHERE is_completed = false`
    }
  ];

  for (const index of partialIndexes) {
    try {
      await knex.raw(index.sql);
      console.log(`✅ Created partial index: ${index.name}`);
    } catch (error) {
      console.log(`ℹ️  Partial index already exists or failed: ${index.name}`);
    }
  }

  // Safely add constraints
  const constraints = [
    {
      name: 'progress_range_check',
      table: 'user_lesson_progress',
      sql: `ALTER TABLE user_lesson_progress ADD CONSTRAINT progress_range_check CHECK (progress >= 0 AND progress <= 1)`
    },
    {
      name: 'score_percentage_check', 
      table: 'quiz_sessions',
      sql: `ALTER TABLE quiz_sessions ADD CONSTRAINT score_percentage_check CHECK (score_percentage >= 0 AND score_percentage <= 100)`
    },
    {
      name: 'progress_percentage_check',
      table: 'user_course_enrollments', 
      sql: `ALTER TABLE user_course_enrollments ADD CONSTRAINT progress_percentage_check CHECK (progress_percentage >= 0 AND progress_percentage <= 100)`
    },
    {
      name: 'rating_range_check',
      table: 'content_ratings',
      sql: `ALTER TABLE content_ratings ADD CONSTRAINT rating_range_check CHECK (rating >= 1 AND rating <= 5)`
    }
  ];

  for (const constraint of constraints) {
    try {
      const exists = await constraintExists(constraint.table, constraint.name);
      if (!exists) {
        await knex.raw(constraint.sql);
        console.log(`✅ Added constraint: ${constraint.name}`);
      } else {
        console.log(`ℹ️  Constraint already exists: ${constraint.name}`);
      }
    } catch (error) {
      console.log(`⚠️  Failed to add constraint ${constraint.name}:`, error.message);
    }
  }

  // Insert system default data safely
  const existingRoles = await knex('roles').select('name');
  const existingRoleNames = existingRoles.map(r => r.name);
  
  const rolesToInsert = [
    { name: 'student', description: 'Platform learner with access to courses and resources' },
    { name: 'teacher', description: 'Content creator who can create and manage courses' },
    { name: 'admin', description: 'System administrator with full access' },
    { name: 'moderator', description: 'Content moderator with review permissions' }
  ].filter(role => !existingRoleNames.includes(role.name));

  if (rolesToInsert.length > 0) {
    await knex('roles').insert(rolesToInsert);
    console.log(`✅ Inserted ${rolesToInsert.length} roles`);
  }

  // Insert default chapter if none exists
  const chapterCount = await knex('chapters').count('id as count').first();
  if (parseInt(chapterCount.count) === 0) {
    await knex('chapters').insert({
      name: 'Main Chapter',
      location: 'Headquarters',
      description: 'Primary chapter for platform administration',
      is_active: true
    });
    console.log('✅ Created default chapter');
  }

  console.log('🎉 Data optimizations completed successfully!');
};

exports.down = async function(knex) {
  // Remove indexes
  const indexesToRemove = [
    { table: 'users', columns: ['role', 'is_active'] },
    { table: 'users', columns: ['created_at'] },
    { table: 'courses', columns: ['is_published', 'created_at'] },
    { table: 'courses', columns: ['created_by', 'is_published'] },
    { table: 'lessons', columns: ['is_published', 'course_id'] },
    { table: 'lessons', columns: ['created_by', 'is_published'] },
    { table: 'user_lesson_progress', columns: ['last_accessed_at'] },
    { table: 'user_lesson_progress', columns: ['progress', 'is_completed'] },
    { table: 'quiz_sessions', columns: ['score_percentage', 'is_completed'] },
    { table: 'quiz_sessions', columns: ['started_at'] },
    { table: 'resources', columns: ['is_public', 'created_at'] },
    { table: 'forum_posts', columns: ['like_count', 'created_at'] },
    { table: 'user_engagement', columns: ['engagement_type', 'created_at'] },
    { table: 'user_engagement', columns: ['points_earned', 'created_at'] },
    { table: 'user_course_enrollments', columns: ['enrollment_status', 'last_accessed_at'] },
    { table: 'user_course_enrollments', columns: ['progress_percentage', 'enrolled_at'] },
    { table: 'ai_messages', columns: ['conversation_id', 'is_user_message', 'created_at'] },
    { table: 'video_processing_jobs', columns: ['status', 'task_type', 'created_at'] }
  ];

  for (const index of indexesToRemove) {
    try {
      await knex.schema.alterTable(index.table, (table) => {
        table.dropIndex(index.columns);
      });
    } catch (error) {
      // Ignore errors if index doesn't exist
    }
  }

  // Remove partial indexes
  const partialIndexes = [
    'idx_users_active_students',
    'idx_lessons_published_courses',
    'idx_quiz_questions_active', 
    'idx_user_progress_recent'
  ];

  for (const indexName of partialIndexes) {
    try {
      await knex.raw(`DROP INDEX IF EXISTS ${indexName}`);
    } catch (error) {
      // Ignore errors
    }
  }

  // Remove constraints
  const constraints = [
    { table: 'user_lesson_progress', name: 'progress_range_check' },
    { table: 'quiz_sessions', name: 'score_percentage_check' },
    { table: 'user_course_enrollments', name: 'progress_percentage_check' },
    { table: 'content_ratings', name: 'rating_range_check' }
  ];

  for (const constraint of constraints) {
    try {
      await knex.raw(`ALTER TABLE ${constraint.table} DROP CONSTRAINT IF EXISTS ${constraint.name}`);
    } catch (error) {
      // Ignore errors
    }
  }
};