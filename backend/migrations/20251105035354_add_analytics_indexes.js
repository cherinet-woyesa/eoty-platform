/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Add indexes for analytics queries on user_lesson_progress
  await knex.schema.table('user_lesson_progress', (table) => {
    // Index for filtering by date range and course
    table.index(['last_accessed_at'], 'idx_ulp_last_accessed');
    
    // Index for completion tracking
    table.index(['is_completed', 'completed_at'], 'idx_ulp_completion');
    
    // Index for time spent aggregations
    table.index(['lesson_id', 'time_spent'], 'idx_ulp_time_spent');
  });

  // Add indexes for analytics queries on user_course_enrollments
  await knex.schema.table('user_course_enrollments', (table) => {
    // Index for enrollment trends
    table.index(['course_id', 'enrolled_at'], 'idx_uce_enrollment_trend');
    
    // Index for active students filtering
    table.index(['course_id', 'enrollment_status', 'last_accessed_at'], 'idx_uce_active_students');
    
    // Index for completion tracking
    table.index(['course_id', 'completed_at'], 'idx_uce_completion');
  });

  // Add indexes for quiz analytics
  await knex.schema.table('quiz_sessions', (table) => {
    // Index for quiz performance tracking
    table.index(['user_id', 'started_at'], 'idx_qs_user_timeline');
    
    // Index for quiz completion rates
    table.index(['quiz_id', 'is_completed', 'score_percentage'], 'idx_qs_completion_scores');
  });

  // Add indexes for engagement tracking
  await knex.schema.table('user_engagement', (table) => {
    // Index for engagement timeline
    table.index(['content_type', 'content_id', 'created_at'], 'idx_ue_content_timeline');
    
    // Index for user activity tracking
    table.index(['user_id', 'engagement_type', 'created_at'], 'idx_ue_user_activity');
  });

  console.log('Analytics indexes created successfully');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Drop indexes from user_lesson_progress
  await knex.schema.table('user_lesson_progress', (table) => {
    table.dropIndex(['last_accessed_at'], 'idx_ulp_last_accessed');
    table.dropIndex(['is_completed', 'completed_at'], 'idx_ulp_completion');
    table.dropIndex(['lesson_id', 'time_spent'], 'idx_ulp_time_spent');
  });

  // Drop indexes from user_course_enrollments
  await knex.schema.table('user_course_enrollments', (table) => {
    table.dropIndex(['course_id', 'enrolled_at'], 'idx_uce_enrollment_trend');
    table.dropIndex(['course_id', 'enrollment_status', 'last_accessed_at'], 'idx_uce_active_students');
    table.dropIndex(['course_id', 'completed_at'], 'idx_uce_completion');
  });

  // Drop indexes from quiz_sessions
  await knex.schema.table('quiz_sessions', (table) => {
    table.dropIndex(['user_id', 'started_at'], 'idx_qs_user_timeline');
    table.dropIndex(['quiz_id', 'is_completed', 'score_percentage'], 'idx_qs_completion_scores');
  });

  // Drop indexes from user_engagement
  await knex.schema.table('user_engagement', (table) => {
    table.dropIndex(['content_type', 'content_id', 'created_at'], 'idx_ue_content_timeline');
    table.dropIndex(['user_id', 'engagement_type', 'created_at'], 'idx_ue_user_activity');
  });

  console.log('Analytics indexes dropped successfully');
};
