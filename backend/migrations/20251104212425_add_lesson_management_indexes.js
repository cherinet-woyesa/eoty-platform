/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  console.log('Adding indexes for lesson management optimization...');

  // Add index for efficient lesson ordering queries
  // This helps with reorder operations and fetching lessons in order
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_lessons_course_order 
    ON lessons (course_id, "order" ASC)
  `);
  console.log('✓ Added index: idx_lessons_course_order');

  // Add index for lesson ownership checks
  // This helps with permission verification when updating/deleting lessons
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_lessons_created_by 
    ON lessons (created_by)
  `);
  console.log('✓ Added index: idx_lessons_created_by');

  // Add index for video status queries
  // This helps when fetching lesson with video information
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_lessons_video_id 
    ON lessons (video_id) 
    WHERE video_id IS NOT NULL
  `);
  console.log('✓ Added index: idx_lessons_video_id (partial)');

  console.log('✅ Lesson management indexes added successfully');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  console.log('Removing lesson management indexes...');

  await knex.raw('DROP INDEX IF EXISTS idx_lessons_video_id');
  console.log('✓ Removed index: idx_lessons_video_id');

  await knex.raw('DROP INDEX IF EXISTS idx_lessons_created_by');
  console.log('✓ Removed index: idx_lessons_created_by');

  await knex.raw('DROP INDEX IF EXISTS idx_lessons_course_order');
  console.log('✓ Removed index: idx_lessons_course_order');

  console.log('✅ Lesson management indexes removed successfully');
};
